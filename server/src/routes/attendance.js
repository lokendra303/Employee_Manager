import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import {
  validateAttendanceDate,
  validateSupervisorAssignment,
  formatDateOnly,
  toDateOnly,
  getAttendanceEditState,
} from '../services/attendanceRules.js';
import { syncAccrualForAttendance } from '../services/payCycle.js';

import { organizationFilter } from '../services/tenant.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantUser);

router.get('/', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const dateStr = req.query.date || formatDateOnly(new Date());
    const workDate = toDateOnly(dateStr);

    let workers = [];
    if (req.user.role === 'ADMIN') {
      workers = await prisma.worker.findMany({
        where: { status: 'ACTIVE', organizationId: req.user.organizationId },
        include: { distributor: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
    } else {
      const assignments = await prisma.supervisorAssignment.findMany({
        where: { supervisorId: req.user.id },
        include: {
          worker: {
            include: { distributor: { select: { name: true } } },
          },
        },
      });
      workers = assignments.map((a) => a.worker).filter((w) => w.status === 'ACTIVE');
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        workDate,
        workerId: { in: workers.map((w) => w.id) },
      },
    });

    const accruals = await prisma.payAccrual.findMany({
      where: {
        workDate,
        workerId: { in: workers.map((w) => w.id) },
      },
    });

    const recordMap = Object.fromEntries(records.map((r) => [r.workerId, r]));
    const accrualMap = Object.fromEntries(accruals.map((a) => [a.workerId, a]));

    const grid = workers.map((w) => {
      const attendance = recordMap[w.id];
      const accrual = accrualMap[w.id];
      const editState = getAttendanceEditState(w, attendance, accrual);

      return {
        worker: {
          id: w.id,
          name: w.name,
          dailyRate: Number(w.dailyRate),
          distributor: w.distributor?.name,
        },
        attendance: attendance
          ? {
              id: attendance.id,
              status: attendance.status,
              isLocked: attendance.isLocked,
              note: attendance.note,
            }
          : null,
        accrual: accrual
          ? {
              amount: Number(accrual.amount),
              status: accrual.status,
            }
          : null,
        ...editState,
      };
    });

    return success(res, { date: dateStr, grid });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const bulkSchema = z.object({
  date: z.string(),
  records: z.array(
    z.object({
      workerId: z.number().int(),
      status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY']),
      note: z.string().optional(),
      reason: z.string().optional(),
    })
  ),
});

router.post('/bulk', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const { date, records } = bulkSchema.parse(req.body);
    const workDate = toDateOnly(date);

    let assignments = [];
    if (req.user.role === 'SUPERVISOR') {
      assignments = await prisma.supervisorAssignment.findMany({
        where: { supervisorId: req.user.id },
      });
    }

    const results = [];

    for (const record of records) {
      const dateCheck = validateAttendanceDate(workDate, req.user.role);
      if (!dateCheck.valid && req.user.role === 'SUPERVISOR') {
        return error(res, 'INVALID_DATE', dateCheck.message);
      }

      if (
        req.user.role === 'SUPERVISOR' &&
        !validateSupervisorAssignment(assignments, record.workerId)
      ) {
        return error(res, 'FORBIDDEN', `Not assigned to worker ${record.workerId}`, 403);
      }

      const worker = await prisma.worker.findUnique({
        where: { id: record.workerId },
      });
      if (!worker || worker.status !== 'ACTIVE' || worker.organizationId !== req.user.organizationId) {
        return error(res, 'NOT_FOUND', `Worker ${record.workerId} not found`, 404);
      }

      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          workerId_workDate: { workerId: record.workerId, workDate },
        },
      });

      if (existing?.isLocked) {
        return error(
          res,
          'LOCKED',
          `Attendance locked for ${worker.name} on ${date}`,
          409
        );
      }

      const accrual = await prisma.payAccrual.findUnique({
        where: {
          workerId_workDate: { workerId: record.workerId, workDate },
        },
      });
      const editState = getAttendanceEditState(worker, existing, accrual);
      if (existing && !editState.isEditable) {
        return error(
          res,
          'PAYMENT_LOCKED',
          `Cannot change attendance for ${worker.name} on ${date} — payment already recorded`,
          409
        );
      }

      if (
        dateCheck.valid === false &&
        req.user.role === 'ADMIN' &&
        !record.reason
      ) {
        return error(res, 'REASON_REQUIRED', 'Admin backdate requires a reason');
      }

      let attendance;
      if (existing) {
        attendance = await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: record.status,
            note: record.note,
            markedByUserId: req.user.id,
            markedAt: new Date(),
          },
        });

        await createAuditLog({
          userId: req.user.id,
          entityType: 'AttendanceRecord',
          entityId: attendance.id,
          action: 'UPDATE',
          oldValue: { status: existing.status },
          newValue: { status: record.status },
          reason: record.reason,
        });
      } else {
        attendance = await prisma.attendanceRecord.create({
          data: {
            workerId: record.workerId,
            workDate,
            status: record.status,
            note: record.note,
            markedByUserId: req.user.id,
          },
        });

        await createAuditLog({
          userId: req.user.id,
          entityType: 'AttendanceRecord',
          entityId: attendance.id,
          action: 'CREATE',
          newValue: { status: record.status },
          reason: record.reason,
        });
      }

      await syncAccrualForAttendance(attendance, worker);
      results.push(attendance);
    }

    return success(res, results);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
