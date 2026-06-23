import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import { formatDateOnly, toDateOnly } from '../services/attendanceRules.js';
import { getDistributorBalance } from '../services/payCycle.js';
import { organizationFilter } from '../services/tenant.js';
import { getDistributorForUser } from '../services/access.js';

const router = Router();

router.use(authenticate);

router.get(
  '/payment-transactions',
  requireRole('ADMIN', 'SUPERVISOR', 'DISTRIBUTOR'),
  requireTenantUser,
  async (req, res) => {
    try {
      const { distributorId, workerId } = req.query;
      let where = {
        distributor: { organizationId: req.user.organizationId },
      };

      if (req.user.role === 'DISTRIBUTOR') {
        const distributor = await getDistributorForUser(req.user);
        if (!distributor) return success(res, { transactions: [] });
        where.distributorId = distributor.id;
      }

      if (req.user.role === 'SUPERVISOR') {
        const assignments = await prisma.supervisorAssignment.findMany({
          where: { supervisorId: req.user.id },
          select: { workerId: true },
        });
        const assignedWorkerIds = assignments.map((a) => a.workerId);
        where.OR = [
          { workerId: { in: assignedWorkerIds } },
          { createdById: req.user.id },
        ];
      }

      if (distributorId) {
        where.distributorId = Number(distributorId);
      }
      if (workerId) {
        where.workerId = Number(workerId);
      }

      const transactions = await prisma.distributorTransaction.findMany({
        where,
        include: {
          worker: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          distributor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      return success(
        res,
        transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          paymentMethod: t.paymentMethod,
          notes: t.notes,
          createdAt: t.createdAt,
          worker: t.worker,
          createdBy: t.createdBy,
          distributor: t.distributor,
        }))
      );
    } catch (err) {
      return error(res, 'SERVER_ERROR', err.message, 500);
    }
  }
);

router.get('/summary', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const today = toDateOnly(new Date());

    const [workerCount, distributorCount, todayAttendance, pendingAccruals] =
      await Promise.all([
        prisma.worker.count({ where: { status: 'ACTIVE', organizationId: orgId } }),
        prisma.distributor.count({ where: { isActive: true, organizationId: orgId } }),
        prisma.attendanceRecord.count({
          where: {
            workDate: today,
            worker: { organizationId: orgId },
          },
        }),
        prisma.payAccrual.aggregate({
          where: { status: 'ACCRUED', worker: { organizationId: orgId } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    const unmarkedToday = workerCount - todayAttendance;

    const recentEdits = await prisma.auditLog.findMany({
      where: {
        entityType: 'AttendanceRecord',
        action: 'UPDATE',
        user: { organizationId: orgId },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    });

    return success(res, {
      workerCount,
      distributorCount,
      todayAttendance,
      unmarkedToday: Math.max(0, unmarkedToday),
      pendingAccrualTotal: Number(pendingAccruals._sum.amount || 0),
      pendingAccrualCount: pendingAccruals._count,
      recentEdits,
      organizationName: req.user.organizationName,
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/days-worked', requireRole('ADMIN', 'DISTRIBUTOR'), requireTenantUser, async (req, res) => {
  try {
    const { from, to, workerId } = req.query;
    const fromDate = from ? toDateOnly(from) : toDateOnly(new Date(new Date().setDate(1)));
    const toDate = to ? toDateOnly(to) : toDateOnly(new Date());

    let workerFilter = organizationFilter(req.user);
    if (workerId) workerFilter.id = Number(workerId);

    if (req.user.role === 'DISTRIBUTOR') {
      const distributor = await prisma.distributor.findFirst({
        where: { userId: req.user.id, organizationId: req.user.organizationId },
      });
      workerFilter.distributorId = distributor?.id;
    }

    const workers = await prisma.worker.findMany({
      where: workerFilter,
      include: {
        attendance: {
          where: {
            workDate: { gte: fromDate, lte: toDate },
            status: { in: ['PRESENT', 'HALF_DAY'] },
          },
        },
        accruals: {
          where: {
            workDate: { gte: fromDate, lte: toDate },
            status: { in: ['ACCRUED', 'PAID'] },
          },
        },
      },
    });

    const report = workers.map((w) => {
      const presentDays = w.attendance.filter((a) => a.status === 'PRESENT').length;
      const halfDays = w.attendance.filter((a) => a.status === 'HALF_DAY').length;
      const totalPaid = w.accruals
        .filter((a) => a.status === 'PAID')
        .reduce((s, a) => s + Number(a.amount), 0);
      const totalPending = w.accruals
        .filter((a) => a.status === 'ACCRUED')
        .reduce((s, a) => s + Number(a.amount), 0);

      return {
        workerId: w.id,
        workerName: w.name,
        presentDays,
        halfDays,
        effectiveDays: presentDays + halfDays * 0.5,
        totalPaid,
        totalPending,
      };
    });

    return success(res, {
      from: formatDateOnly(fromDate),
      to: formatDateOnly(toDate),
      report,
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const assignmentSchema = z.object({
  supervisorId: z.number().int(),
  workerIds: z.array(z.number().int()),
});

router.get('/supervisors', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const supervisors = await prisma.user.findMany({
      where: {
        role: 'SUPERVISOR',
        organizationId: req.user.organizationId,
      },
      include: {
        supervisorAssignments: {
          include: { worker: { select: { id: true, name: true } } },
        },
        distributorProfile: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return success(res, supervisors);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const updateSupervisorSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

router.put('/supervisors/:id', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = updateSupervisorSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id, role: 'SUPERVISOR', organizationId: req.user.organizationId },
    });
    if (!existing) {
      return error(res, 'NOT_FOUND', 'Supervisor not found in your organization', 404);
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    await createAuditLog({
      userId: req.user.id,
      entityType: 'User',
      entityId: id,
      action: 'UPDATE',
      oldValue: { name: existing.name, email: existing.email, isActive: existing.isActive },
      newValue: updateData,
    });

    const supervisor = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        supervisorAssignments: {
          include: { worker: { select: { id: true, name: true } } },
        },
        distributorProfile: { select: { id: true, name: true } },
      },
    });

    return success(res, supervisor);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    if (err.code === 'P2002') {
      return error(res, 'DUPLICATE', 'Email already exists');
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/supervisors/assign', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const { supervisorId, workerIds } = assignmentSchema.parse(req.body);

    const supervisor = await prisma.user.findFirst({
      where: {
        id: supervisorId,
        role: 'SUPERVISOR',
        organizationId: req.user.organizationId,
      },
    });
    if (!supervisor) {
      return error(res, 'NOT_FOUND', 'Supervisor not found in your organization', 404);
    }

    if (workerIds.length > 0) {
      const workers = await prisma.worker.findMany({
        where: { id: { in: workerIds }, organizationId: req.user.organizationId },
      });
      if (workers.length !== workerIds.length) {
        return error(res, 'VALIDATION_ERROR', 'Some workers are not in your organization', 400);
      }
    }

    await prisma.supervisorAssignment.deleteMany({
      where: { supervisorId },
    });

    if (workerIds.length > 0) {
      await prisma.supervisorAssignment.createMany({
        data: workerIds.map((workerId) => ({ supervisorId, workerId })),
      });
    }

    const assignments = await prisma.supervisorAssignment.findMany({
      where: { supervisorId },
      include: { worker: true },
    });

    return success(res, assignments);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/users', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return success(res, users);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['SUPERVISOR', 'DISTRIBUTOR', 'WORKER']),
});

router.post('/users', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const data = userSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
        organizationId: req.user.organizationId,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return success(res, user, 201);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    if (err.code === 'P2002') {
      return error(res, 'DUPLICATE', 'Email already exists');
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/distributor-reconciliation', requireRole('ADMIN'), requireTenantUser, async (req, res) => {
  try {
    const distributors = await prisma.distributor.findMany({
      where: { isActive: true, organizationId: req.user.organizationId },
      include: { workers: { select: { id: true, name: true } } },
    });

    const report = await Promise.all(
      distributors.map(async (d) => {
        const balance = await getDistributorBalance(d.id);
        const credits = await prisma.distributorTransaction.aggregate({
          where: { distributorId: d.id, type: 'ACCRUAL_CREDIT' },
          _sum: { amount: true },
        });
        const disbursements = await prisma.distributorTransaction.aggregate({
          where: { distributorId: d.id, type: 'DISBURSEMENT' },
          _sum: { amount: true },
        });

        return {
          id: d.id,
          name: d.name,
          workerCount: d.workers.length,
          totalCredits: Number(credits._sum.amount || 0),
          totalDisbursements: Number(disbursements._sum.amount || 0),
          balance,
        };
      })
    );

    return success(res, report);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
