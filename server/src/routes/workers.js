import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { getCurrentPayPeriod } from '../services/payCycle.js';
import { organizationFilter } from '../services/tenant.js';
import { getWorkerForUser, getDistributorForUser } from '../services/access.js';
import { toDateOnly, getAttendanceEditState } from '../services/attendanceRules.js';
import { addDays } from '../lib/dates.js';

async function enrichWorkersWithStats(workers) {
  if (!workers.length) return workers;

  const ids = workers.map((w) => w.id);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [unpaidRows, paidRows, attendanceRows] = await Promise.all([
    prisma.payAccrual.groupBy({
      by: ['workerId'],
      where: { workerId: { in: ids }, status: 'ACCRUED' },
      _sum: { amount: true },
    }),
    prisma.payAccrual.groupBy({
      by: ['workerId'],
      where: { workerId: { in: ids }, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        workerId: { in: ids },
        workDate: { gte: monthStart, lte: monthEnd },
      },
      select: { workerId: true, status: true },
    }),
  ]);

  const unpaidMap = Object.fromEntries(
    unpaidRows.map((row) => [row.workerId, Number(row._sum.amount || 0)])
  );
  const paidMap = Object.fromEntries(
    paidRows.map((row) => [row.workerId, Number(row._sum.amount || 0)])
  );

  const attendanceMap = {};
  for (const row of attendanceRows) {
    if (!attendanceMap[row.workerId]) {
      attendanceMap[row.workerId] = { present: 0, halfDay: 0, absent: 0 };
    }
    if (row.status === 'PRESENT') attendanceMap[row.workerId].present += 1;
    else if (row.status === 'HALF_DAY') attendanceMap[row.workerId].halfDay += 1;
    else if (row.status === 'ABSENT') attendanceMap[row.workerId].absent += 1;
  }

  return workers.map((w) => ({
    ...w,
    unpaidBalance: unpaidMap[w.id] || 0,
    totalPaid: paidMap[w.id] || 0,
    monthAttendance: attendanceMap[w.id] || { present: 0, halfDay: 0, absent: 0 },
  }));
}

const router = Router();

const workerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  dailyRate: z.number().positive(),
  payoutIntervalDays: z.number().int().min(1).max(31),
  payCycleAnchor: z.string(),
  distributorId: z.number().int(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

router.use(authenticate);
router.use(requireTenantUser);

router.get('/', requireRole('ADMIN', 'SUPERVISOR', 'DISTRIBUTOR'), async (req, res) => {
  try {
    let where = organizationFilter(req.user);

    if (req.user.role === 'ADMIN' && req.query.status) {
      where.status = req.query.status;
    } else if (req.user.role !== 'ADMIN') {
      where.status = 'ACTIVE';
    }

    if (req.user.role === 'DISTRIBUTOR') {
      const distributor = await getDistributorForUser(req.user);
      if (!distributor) return success(res, []);
      where.distributorId = distributor.id;
    } else if (req.user.role === 'SUPERVISOR') {
      const linkedDistributor = await getDistributorForUser(req.user);
      const assignments = await prisma.supervisorAssignment.findMany({
        where: { supervisorId: req.user.id },
        select: { workerId: true },
      });
      const assignedIds = assignments.map((a) => a.workerId);

      if (req.query.scope === 'distributor' && linkedDistributor) {
        where.distributorId = linkedDistributor.id;
      } else if (linkedDistributor) {
        where.OR = [
          { id: { in: assignedIds } },
          { distributorId: linkedDistributor.id },
        ];
      } else {
        where.id = { in: assignedIds };
      }
    }

    const workers = await prisma.worker.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const enriched = workers.map((w) => {
      const period = getCurrentPayPeriod(w);
      return {
        ...w,
        dailyRate: Number(w.dailyRate),
        payCycleAnchor: w.payCycleAnchor.toISOString().slice(0, 10),
        currentPeriod: {
          start: period.periodStart.toISOString().slice(0, 10),
          end: period.periodEnd.toISOString().slice(0, 10),
        },
      };
    });

    const withStats = await enrichWorkersWithStats(enriched);
    return success(res, withStats);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const data = workerSchema.parse(req.body);

    const distributor = await prisma.distributor.findFirst({
      where: { id: data.distributorId, organizationId: req.user.organizationId },
    });
    if (!distributor) {
      return error(res, 'NOT_FOUND', 'Distributor not found in your organization', 404);
    }

    const worker = await prisma.worker.create({
      data: {
        ...data,
        organizationId: req.user.organizationId,
        payCycleAnchor: new Date(data.payCycleAnchor),
        dailyRate: data.dailyRate,
      },
      include: { distributor: true },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Worker',
      entityId: worker.id,
      action: 'CREATE',
      newValue: data,
    });

    return success(res, worker, 201);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = workerSchema.partial().parse(req.body);

    const existing = await prisma.worker.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!existing) return error(res, 'NOT_FOUND', 'Worker not found', 404);

    if (data.distributorId) {
      const distributor = await prisma.distributor.findFirst({
        where: { id: data.distributorId, organizationId: req.user.organizationId },
      });
      if (!distributor) {
        return error(res, 'NOT_FOUND', 'Distributor not found in your organization', 404);
      }
    }

    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...data,
        ...(data.payCycleAnchor && { payCycleAnchor: new Date(data.payCycleAnchor) }),
      },
      include: { distributor: true },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Worker',
      entityId: worker.id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: data,
    });

    return success(res, worker);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.worker.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!existing) return error(res, 'NOT_FOUND', 'Worker not found', 404);

    await prisma.worker.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Worker',
      entityId: id,
      action: 'DEACTIVATE',
      oldValue: { status: existing.status },
      newValue: { status: 'INACTIVE' },
    });

    return success(res, { id, status: 'INACTIVE' });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/:id/profile', requireRole('ADMIN', 'SUPERVISOR', 'DISTRIBUTOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const worker = await getWorkerForUser(req.user, id);
    if (!worker) return error(res, 'NOT_FOUND', 'Worker not found', 404);

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = req.query.from ? toDateOnly(req.query.from) : toDateOnly(defaultFrom);
    const toDate = req.query.to ? toDateOnly(req.query.to) : toDateOnly(now);

    const [attendance, accruals, transactions] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { workerId: id, workDate: { gte: fromDate, lte: toDate } },
        orderBy: { workDate: 'asc' },
      }),
      prisma.payAccrual.findMany({
        where: { workerId: id, workDate: { gte: fromDate, lte: toDate } },
        orderBy: { workDate: 'asc' },
      }),
      prisma.distributorTransaction.findMany({
        where: {
          workerId: id,
          type: 'DISBURSEMENT',
          distributor: { organizationId: req.user.organizationId },
        },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          distributor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const attendanceMap = Object.fromEntries(
      attendance.map((a) => [a.workDate.toISOString().slice(0, 10), a])
    );
    const accrualMap = Object.fromEntries(
      accruals.map((a) => [a.workDate.toISOString().slice(0, 10), a])
    );

    const calendar = [];
    let cursor = fromDate;
    while (cursor <= toDate) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const att = attendanceMap[dateStr];
      const acc = accrualMap[dateStr];
      const editState = getAttendanceEditState(worker, att, acc);

      calendar.push({
        date: dateStr,
        status: att?.status || null,
        accrualAmount: acc ? Number(acc.amount) : null,
        accrualStatus: acc?.status || null,
        isLocked: att?.isLocked || false,
        ...editState,
      });

      cursor = addDays(cursor, 1);
    }

    const period = getCurrentPayPeriod(worker);
    const [unpaidBalance, totalPaidAgg, monthEarnedAgg, monthDisbursedAgg] = await Promise.all([
      prisma.payAccrual.aggregate({
        where: { workerId: id, status: 'ACCRUED' },
        _sum: { amount: true },
      }),
      prisma.payAccrual.aggregate({
        where: { workerId: id, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.payAccrual.aggregate({
        where: { workerId: id, workDate: { gte: fromDate, lte: toDate } },
        _sum: { amount: true },
      }),
      prisma.distributorTransaction.aggregate({
        where: {
          workerId: id,
          type: 'DISBURSEMENT',
          createdAt: {
            gte: fromDate,
            lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const attendanceSummary = calendar.reduce(
      (acc, day) => {
        if (day.status === 'PRESENT') acc.present += 1;
        else if (day.status === 'HALF_DAY') acc.halfDay += 1;
        else if (day.status === 'ABSENT') acc.absent += 1;
        else acc.unmarked += 1;
        return acc;
      },
      { present: 0, halfDay: 0, absent: 0, unmarked: 0 }
    );

    const totalDisbursed = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return success(res, {
      worker: {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        dailyRate: Number(worker.dailyRate),
        status: worker.status,
        payoutIntervalDays: worker.payoutIntervalDays,
        distributor: worker.distributor,
        currentPeriod: {
          start: period.periodStart.toISOString().slice(0, 10),
          end: period.periodEnd.toISOString().slice(0, 10),
        },
        unpaidBalance: Number(unpaidBalance._sum.amount || 0),
        totalPaid: Number(totalPaidAgg._sum.amount || 0),
        totalDisbursed,
      },
      summary: {
        monthEarned: Number(monthEarnedAgg._sum.amount || 0),
        monthPaid: Number(monthDisbursedAgg._sum.amount || 0),
        monthRemaining: Math.max(
          0,
          Number(monthEarnedAgg._sum.amount || 0) - Number(monthDisbursedAgg._sum.amount || 0)
        ),
        attendance: attendanceSummary,
      },
      range: {
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
      },
      calendar,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        paymentMethod: t.paymentMethod,
        notes: t.notes,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
        distributor: t.distributor,
      })),
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/:id/reactivate', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.worker.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!existing) return error(res, 'NOT_FOUND', 'Worker not found', 404);
    if (existing.status === 'ACTIVE') {
      return error(res, 'ALREADY_ACTIVE', 'Worker is already active', 400);
    }

    const worker = await prisma.worker.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { distributor: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Worker',
      entityId: id,
      action: 'REACTIVATE',
      oldValue: { status: 'INACTIVE' },
      newValue: { status: 'ACTIVE' },
    });

    return success(res, worker);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
