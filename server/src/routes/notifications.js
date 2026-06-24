import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireTenantUser } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantUser);

router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, readAt: null },
    });
    return success(res, { count });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/', async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return success(
      res,
      notifications.map((n) => ({
        ...n,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
      }))
    );
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return success(res, { ok: true });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!notification) return error(res, 'NOT_FOUND', 'Notification not found', 404);

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return success(res, {
      ...updated,
      metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
