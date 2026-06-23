import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { getLinkedDistributorSummary } from '../services/access.js';
import { createAuditLog } from '../services/audit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerOrgSchema = z.object({
  organizationName: z.string().min(2),
  contactPhone: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

const profileUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    currentPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password && !data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current password is required to set a new password',
      });
    }
  });

async function buildUserPayload(user) {
  const linkedDistributor = await getLinkedDistributorSummary(user.id, user.organizationId);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization?.name ?? null,
    organizationStatus: user.organization?.status ?? null,
    linkedDistributorId: linkedDistributor?.id ?? null,
    linkedDistributorName: linkedDistributor?.name ?? null,
    actsAsDistributor: user.role === 'DISTRIBUTOR' || !!linkedDistributor,
  };
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (user.role !== 'SYSTEM_ADMIN') {
      if (!user.organization) {
        return error(res, 'NO_ORGANIZATION', 'Account is not linked to an organization', 403);
      }
      if (user.organization.status === 'PENDING') {
        return error(
          res,
          'ORG_PENDING',
          'Your organization is pending approval by the system administrator',
          403
        );
      }
      if (user.organization.status === 'REJECTED') {
        return error(
          res,
          'ORG_REJECTED',
          user.organization.rejectedReason || 'Your organization registration was rejected',
          403
        );
      }
      if (user.organization.status === 'SUSPENDED') {
        return error(res, 'ORG_SUSPENDED', 'Your organization has been suspended', 403);
      }
    }

    const linkedDistributor = await getLinkedDistributorSummary(
      user.id,
      user.organizationId
    );

    const token = signToken(user, user.organization, {
      linkedDistributorId: linkedDistributor?.id ?? null,
      linkedDistributorName: linkedDistributor?.name ?? null,
    });
    return success(res, {
      token,
      user: await buildUserPayload(user),
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });
    if (!user || !user.isActive) {
      return error(res, 'NOT_FOUND', 'User not found', 404);
    }
    return success(res, await buildUserPayload(user));
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });
    if (!existing || !existing.isActive) {
      return error(res, 'NOT_FOUND', 'User not found', 404);
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();

    if (data.password) {
      const valid = await bcrypt.compare(data.currentPassword, existing.passwordHash);
      if (!valid) {
        return error(res, 'INVALID_PASSWORD', 'Current password is incorrect', 400);
      }
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return error(res, 'VALIDATION_ERROR', 'No changes to save');
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: updateData,
      include: { organization: true },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'User',
      entityId: existing.id,
      action: 'UPDATE_PROFILE',
      oldValue: { name: existing.name, email: existing.email },
      newValue: {
        name: updated.name,
        email: updated.email,
        passwordChanged: !!data.password,
      },
    });

    const userPayload = await buildUserPayload(updated);
    const token = signToken(updated, updated.organization, {
      linkedDistributorId: userPayload.linkedDistributorId,
      linkedDistributorName: userPayload.linkedDistributorName,
    });

    return success(res, { user: userPayload, token });
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    if (err.code === 'P2002') {
      return error(res, 'DUPLICATE', 'Email is already in use');
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/register-organization', async (req, res) => {
  try {
    const data = registerOrgSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existing) {
      return error(res, 'DUPLICATE', 'Email is already registered', 409);
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          contactEmail: data.adminEmail,
          contactPhone: data.contactPhone,
          status: 'PENDING',
        },
      });

      const admin = await tx.user.create({
        data: {
          email: data.adminEmail,
          passwordHash,
          name: data.adminName,
          role: 'ADMIN',
          organizationId: organization.id,
          isActive: true,
        },
      });

      return { organization, admin };
    });

    return success(
      res,
      {
        message:
          'Organization registered successfully. A system administrator will review and approve your account.',
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          status: result.organization.status,
        },
      },
      201
    );
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
