import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';

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

router.get('/stats', async (_req, res) => {
  try {
    const [pending, approved, rejected, totalOrgs, totalUsers] = await Promise.all([
      prisma.organization.count({ where: { status: 'PENDING' } }),
      prisma.organization.count({ where: { status: 'APPROVED' } }),
      prisma.organization.count({ where: { status: 'REJECTED' } }),
      prisma.organization.count(),
      prisma.user.count({ where: { role: { not: 'SYSTEM_ADMIN' } } }),
    ]);

    return success(res, { pending, approved, rejected, totalOrgs, totalUsers });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
