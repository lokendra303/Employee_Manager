import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import {
  closePayPeriodForWorker,
  getWorkerAccruedBalance,
  getCurrentPayPeriod,
  isPeriodEnded,
} from '../services/payCycle.js';
import { getDistributorForUser, getWorkerForUser } from '../services/access.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantUser);

router.get('/accruals/:workerId', requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const workerId = Number(req.params.workerId);

    if (req.user.role !== 'ADMIN') {
      const allowed = await getWorkerForUser(req.user, workerId);
      if (!allowed) return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const accruals = await prisma.payAccrual.findMany({
      where: { workerId, status: 'ACCRUED' },
      orderBy: { workDate: 'asc' },
    });

    const balance = await getWorkerAccruedBalance(workerId);
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || worker.organizationId !== req.user.organizationId) {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }
    const period = getCurrentPayPeriod(worker);

    return success(res, {
      balance,
      periodEnded: isPeriodEnded(worker),
      currentPeriod: {
        start: period.periodStart.toISOString().slice(0, 10),
        end: period.periodEnd.toISOString().slice(0, 10),
      },
      accruals: accruals.map((a) => ({
        ...a,
        amount: Number(a.amount),
        workDate: a.workDate.toISOString().slice(0, 10),
      })),
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/close-period/:workerId', requireRole('ADMIN'), async (req, res) => {
  try {
    const workerId = Number(req.params.workerId);
    const worker = await prisma.worker.findFirst({
      where: { id: workerId, organizationId: req.user.organizationId },
    });
    if (!worker) return error(res, 'NOT_FOUND', 'Worker not found', 404);

    const payoutRun = await closePayPeriodForWorker(workerId, req.user.id);
    return success(res, {
      ...payoutRun,
      totalAmount: Number(payoutRun.totalAmount),
    });
  } catch (err) {
    return error(res, 'PAY_ERROR', err.message, 400);
  }
});

router.get('/payout-runs', requireRole('ADMIN', 'DISTRIBUTOR'), async (req, res) => {
  try {
    let where = {};
    const orgWorkers = await prisma.worker.findMany({
      where: { organizationId: req.user.organizationId },
      select: { id: true },
    });
    const orgWorkerIds = orgWorkers.map((w) => w.id);
    where.workerId = { in: orgWorkerIds };

    if (req.user.role === 'DISTRIBUTOR') {
      const distributor = await prisma.distributor.findFirst({
        where: { userId: req.user.id, organizationId: req.user.organizationId },
      });
      if (!distributor) return success(res, []);
      const workers = await prisma.worker.findMany({
        where: { distributorId: distributor.id, organizationId: req.user.organizationId },
        select: { id: true },
      });
      where.workerId = { in: workers.map((w) => w.id) };
    }

    const runs = await prisma.payoutRun.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(
      res,
      runs.map((r) => ({
        ...r,
        totalAmount: Number(r.totalAmount),
        periodStart: r.periodStart.toISOString().slice(0, 10),
        periodEnd: r.periodEnd.toISOString().slice(0, 10),
      }))
    );
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
