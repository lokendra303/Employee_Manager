import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import {
  getPublicApiBaseUrl,
  normalizeApiUrl,
  setPublicApiBaseUrl,
} from '../services/systemSettings.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN'));

router.get('/organizations', async (req, res) => {
  try {
    const status = req.query.status;
    const where = status ? { status } : {};

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, name: true, email: true, createdAt: true },
        },
        _count: { select: { users: true, workers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(res, organizations);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const rejectSchema = z.object({
  reason: z.string().min(3),
});

const suspendSchema = z.object({
  reason: z.string().min(3).optional(),
});

router.post('/organizations/:id/approve', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const org = await prisma.organization.findUnique({ where: { id } });

    if (!org) return error(res, 'NOT_FOUND', 'Organization not found', 404);
    if (org.status !== 'PENDING') {
      return error(res, 'INVALID_STATUS', 'Only pending organizations can be approved', 400);
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user.id,
        rejectedReason: null,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Organization',
      entityId: id,
      action: 'APPROVE',
      newValue: { status: 'APPROVED' },
    });

    return success(res, updated);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/organizations/:id/reject', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reason } = rejectSchema.parse(req.body);

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return error(res, 'NOT_FOUND', 'Organization not found', 404);
    if (org.status !== 'PENDING') {
      return error(res, 'INVALID_STATUS', 'Only pending organizations can be rejected', 400);
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Organization',
      entityId: id,
      action: 'REJECT',
      newValue: { status: 'REJECTED', reason },
    });

    return success(res, updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/organizations/:id/suspend', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reason } = suspendSchema.parse(req.body ?? {});

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return error(res, 'NOT_FOUND', 'Organization not found', 404);
    if (org.status !== 'APPROVED') {
      return error(res, 'INVALID_STATUS', 'Only approved organizations can be suspended', 400);
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        rejectedReason: reason?.trim() || 'Suspended by system administrator',
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Organization',
      entityId: id,
      action: 'SUSPEND',
      newValue: { status: 'SUSPENDED', reason: updated.rejectedReason },
    });

    return success(res, updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/organizations/:id/reactivate', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return error(res, 'NOT_FOUND', 'Organization not found', 404);
    if (org.status !== 'SUSPENDED') {
      return error(res, 'INVALID_STATUS', 'Only suspended organizations can be reactivated', 400);
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: 'APPROVED',
        rejectedReason: null,
        approvedAt: org.approvedAt ?? new Date(),
        approvedById: org.approvedById ?? req.user.id,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Organization',
      entityId: id,
      action: 'REACTIVATE',
      newValue: { status: 'APPROVED' },
    });

    return success(res, updated);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const apiUrlSchema = z.object({
  apiBaseUrl: z.string().min(1),
});

router.get('/settings', async (_req, res) => {
  try {
    const apiBaseUrl = await getPublicApiBaseUrl();
    return success(res, { apiBaseUrl });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.put('/settings/api-url', async (req, res) => {
  try {
    const { apiBaseUrl } = apiUrlSchema.parse(req.body);
    const normalized = normalizeApiUrl(apiBaseUrl);
    const updated = await setPublicApiBaseUrl(normalized, req.user.id);

    await createAuditLog({
      userId: req.user.id,
      entityType: 'SystemSetting',
      entityId: 0,
      action: 'UPDATE_API_URL',
      newValue: { apiBaseUrl: normalized },
    });

    return success(res, { apiBaseUrl: updated.value });
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'VALIDATION_ERROR', err.message, 400);
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const [pending, approved, rejected, suspended, totalOrgs, totalUsers] = await Promise.all([
      prisma.organization.count({ where: { status: 'PENDING' } }),
      prisma.organization.count({ where: { status: 'APPROVED' } }),
      prisma.organization.count({ where: { status: 'REJECTED' } }),
      prisma.organization.count({ where: { status: 'SUSPENDED' } }),
      prisma.organization.count(),
      prisma.user.count({ where: { role: { not: 'SYSTEM_ADMIN' } } }),
    ]);

    return success(res, { pending, approved, rejected, suspended, totalOrgs, totalUsers });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
