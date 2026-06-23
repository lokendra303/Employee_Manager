import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { getDistributorBalance } from '../services/payCycle.js';
import { assertSupervisorAssigned, getDistributorForUser, assertDistributorAccess } from '../services/access.js';
import { debitWallet, debitWalletPersonalAdvance, ensureWalletForUser } from '../services/wallet.js';

import { organizationFilter } from '../services/tenant.js';

const router = Router();

const distributorSchema = z.object({
  name: z.string().min(1),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  openingBalance: z.number().optional(),
  userId: z.number().int().nullable().optional(),
});

async function getDistributorPaymentStats(distributorId) {
  const [paid, pending, disbursed] = await Promise.all([
    prisma.payAccrual.aggregate({
      where: { worker: { distributorId }, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.payAccrual.aggregate({
      where: { worker: { distributorId }, status: 'ACCRUED' },
      _sum: { amount: true },
    }),
    prisma.distributorTransaction.aggregate({
      where: { distributorId, type: 'DISBURSEMENT' },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalPaid: Number(paid._sum.amount || 0),
    totalPending: Number(pending._sum.amount || 0),
    totalDisbursed: Number(disbursed._sum.amount || 0),
  };
}

async function enrichDistributor(d) {
  const stats = await getDistributorPaymentStats(d.id);
  return {
    ...d,
    openingBalance: Number(d.openingBalance),
    balance: await getDistributorBalance(d.id),
    workerCount: d._count?.workers ?? d.workerCount ?? 0,
    ...stats,
    linkedUser: d.user
      ? {
          id: d.user.id,
          name: d.user.name,
          email: d.user.email,
          role: d.user.role,
          isSupervisorDistributor: d.user.role === 'SUPERVISOR',
        }
      : null,
  };
}

async function validateAndLinkUser(userId, organizationId, distributorId = null) {
  if (userId == null) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId, isActive: true },
  });
  if (!user) {
    throw Object.assign(new Error('User not found in your organization'), { code: 'NOT_FOUND' });
  }
  if (!['SUPERVISOR', 'DISTRIBUTOR'].includes(user.role)) {
    throw Object.assign(
      new Error('Only supervisor or distributor accounts can be linked to a distributor profile'),
      { code: 'VALIDATION' }
    );
  }

  const existingLink = await prisma.distributor.findFirst({
    where: {
      userId,
      organizationId,
      ...(distributorId ? { id: { not: distributorId } } : {}),
    },
  });
  if (existingLink) {
    throw Object.assign(
      new Error(`${user.name} is already linked to distributor "${existingLink.name}"`),
      { code: 'DUPLICATE' }
    );
  }

  return user;
}

router.use(authenticate);
router.use(requireTenantUser);

router.get('/', requireRole('ADMIN', 'DISTRIBUTOR'), async (req, res) => {
  try {
    let where = organizationFilter(req.user);
    if (req.user.role !== 'ADMIN') {
      where.userId = req.user.id;
    }

    const distributors = await prisma.distributor.findMany({
      where,
      include: {
        _count: { select: { workers: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { name: 'asc' },
    });

    const withBalances = await Promise.all(distributors.map((d) => enrichDistributor(d)));

    return success(res, withBalances);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const data = distributorSchema.parse(req.body);

    let linkedUser = null;
    if (data.userId != null) {
      linkedUser = await validateAndLinkUser(data.userId, req.user.organizationId);
    }

    const distributor = await prisma.distributor.create({
      data: {
        organizationId: req.user.organizationId,
        name: data.name,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail || null,
        openingBalance: data.openingBalance ?? 0,
        userId: linkedUser?.id ?? null,
      },
      include: {
        _count: { select: { workers: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (linkedUser) {
      await ensureWalletForUser(linkedUser, distributor.id);
    }

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Distributor',
      entityId: distributor.id,
      action: 'CREATE',
      newValue: data,
    });

    return success(res, await enrichDistributor(distributor), 201);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    if (err.code === 'NOT_FOUND') return error(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'VALIDATION') return error(res, 'VALIDATION_ERROR', err.message);
    if (err.code === 'DUPLICATE') return error(res, 'DUPLICATE', err.message, 409);
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/:id', requireRole('ADMIN', 'DISTRIBUTOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const distributor = await prisma.distributor.findFirst({
      where: { id, organizationId: req.user.organizationId },
      include: {
        _count: { select: { workers: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
        workers: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, dailyRate: true, status: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!distributor) return error(res, 'NOT_FOUND', 'Distributor not found', 404);

    if (req.user.role !== 'ADMIN' && !(await assertDistributorAccess(req.user, id))) {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const transactions = await prisma.distributorTransaction.findMany({
      where: { distributorId: id },
      include: {
        worker: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const enriched = await enrichDistributor(distributor);
    return success(res, {
      ...enriched,
      workers: distributor.workers.map((w) => ({
        ...w,
        dailyRate: Number(w.dailyRate),
      })),
      transactions: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = distributorSchema.partial().parse(req.body);
    const existing = await prisma.distributor.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!existing) return error(res, 'NOT_FOUND', 'Distributor not found', 404);

    let linkedUser = undefined;
    if (data.userId !== undefined) {
      if (data.userId === null) {
        linkedUser = null;
      } else {
        linkedUser = await validateAndLinkUser(data.userId, req.user.organizationId, id);
      }
    }

    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.contactPhone !== undefined) updateFields.contactPhone = data.contactPhone || null;
    if (data.contactEmail !== undefined) updateFields.contactEmail = data.contactEmail || null;
    if (data.openingBalance !== undefined) updateFields.openingBalance = data.openingBalance;
    if (data.userId !== undefined) updateFields.userId = linkedUser?.id ?? null;

    const distributor = await prisma.distributor.update({
      where: { id },
      data: updateFields,
      include: {
        _count: { select: { workers: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (linkedUser) {
      await ensureWalletForUser(linkedUser, distributor.id);
    }

    await createAuditLog({
      userId: req.user.id,
      entityType: 'Distributor',
      entityId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updateFields,
    });

    return success(res, await enrichDistributor(distributor));
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    if (err.code === 'NOT_FOUND') return error(res, 'NOT_FOUND', err.message, 404);
    if (err.code === 'VALIDATION') return error(res, 'VALIDATION_ERROR', err.message);
    if (err.code === 'DUPLICATE') return error(res, 'DUPLICATE', err.message, 409);
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/:id/transactions', requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const distributor = await prisma.distributor.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!distributor) return error(res, 'NOT_FOUND', 'Distributor not found', 404);

    const isOwner = distributor.userId === req.user.id;

    if (req.user.role === 'SUPERVISOR' && !isOwner) {
      const assignments = await prisma.supervisorAssignment.findMany({
        where: { supervisorId: req.user.id },
        select: { workerId: true },
      });
      const assignedWorkerIds = assignments.map((a) => a.workerId);
      const transactions = await prisma.distributorTransaction.findMany({
        where: {
          distributorId: id,
          OR: [
            { workerId: { in: assignedWorkerIds } },
            { createdById: req.user.id },
          ],
        },
        include: {
          worker: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return success(res, {
        balance: null,
        transactions: transactions.map((t) => ({
          ...t,
          amount: Number(t.amount),
        })),
      });
    }

    if (!isOwner && req.user.role === 'DISTRIBUTOR') {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    if (!isOwner && req.user.role !== 'ADMIN') {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const transactions = await prisma.distributorTransaction.findMany({
      where: { distributorId: id },
      include: {
        worker: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const balance = await getDistributorBalance(id);

    return success(res, {
      balance,
      transactions: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const disbursementSchema = z
  .object({
    workerId: z.number().int(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['CASH', 'UPI', 'BANK', 'OTHER']),
    paymentReference: z.string().optional(),
    notes: z.string().optional(),
    payoutRunId: z.number().int().optional(),
    paidFromPersonal: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === 'CASH') return true;
      return !!(data.paymentReference?.trim() || data.notes?.trim());
    },
    { message: 'Online/bank payments require a transaction reference or note' }
  );

function buildPaymentNotes(data) {
  const parts = [];
  if (data.paymentReference?.trim()) {
    parts.push(`Ref: ${data.paymentReference.trim()}`);
  }
  if (data.notes?.trim()) {
    parts.push(data.notes.trim());
  }
  return parts.length > 0 ? parts.join(' | ') : null;
}

async function applyPaymentToAccruals(tx, workerId, payAmount) {
  let remaining = payAmount;
  const applied = [];

  const accruals = await tx.payAccrual.findMany({
    where: { workerId, status: 'ACCRUED' },
    orderBy: { workDate: 'asc' },
  });

  const totalAccrued = accruals.reduce((sum, a) => sum + Number(a.amount), 0);

  for (const accrual of accruals) {
    if (remaining <= 0) break;
    const accrualAmount = Number(accrual.amount);
    const workDate = accrual.workDate.toISOString().slice(0, 10);

    if (remaining >= accrualAmount) {
      await tx.payAccrual.update({
        where: { id: accrual.id },
        data: { status: 'PAID' },
      });
      applied.push({ workDate, amount: accrualAmount, status: 'PAID' });
      remaining -= accrualAmount;
    } else {
      const paidPortion = remaining;
      const unpaidPortion = accrualAmount - paidPortion;
      await tx.payAccrual.update({
        where: { id: accrual.id },
        data: { amount: unpaidPortion },
      });
      applied.push({
        workDate,
        amount: paidPortion,
        status: 'PARTIAL',
        remainingOnDay: unpaidPortion,
      });
      remaining = 0;
    }
  }

  return {
    applied,
    isPartial: payAmount < totalAccrued,
    remainingBalance: totalAccrued - payAmount,
  };
}

router.post('/:id/transactions', requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const distributorId = Number(req.params.id);
    const data = disbursementSchema.parse(req.body);

    const worker = await prisma.worker.findFirst({
      where: {
        id: data.workerId,
        distributorId,
        organizationId: req.user.organizationId,
      },
    });
    if (!worker) {
      return error(res, 'NOT_FOUND', 'Worker not assigned to this distributor', 404);
    }

    const accruedTotal = await prisma.payAccrual.aggregate({
      where: { workerId: data.workerId, status: 'ACCRUED' },
      _sum: { amount: true },
    });
    const maxPayable = Number(accruedTotal._sum.amount || 0);
    if (maxPayable === 0) {
      return error(res, 'NO_BALANCE', 'No unpaid salary for this worker', 400);
    }
    if (data.amount > maxPayable) {
      return error(
        res,
        'AMOUNT_TOO_HIGH',
        `Amount cannot exceed unpaid balance of ₹${maxPayable}`,
        400
      );
    }

    if (req.user.role !== 'ADMIN') {
      const distributor = await getDistributorForUser(req.user);
      if (!distributor || distributor.id !== distributorId) {
        return error(res, 'FORBIDDEN', 'Access denied', 403);
      }
    } else {
      const distributor = await prisma.distributor.findFirst({
        where: { id: distributorId, organizationId: req.user.organizationId },
      });
      if (!distributor) return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    if (req.user.role === 'SUPERVISOR') {
      const assigned = await assertSupervisorAssigned(req.user.id, data.workerId);
      if (!assigned) {
        return error(res, 'FORBIDDEN', 'You can only pay workers assigned to you', 403);
      }
    }

    const paymentNotes = buildPaymentNotes(data);
    const paidFromPersonal = !!data.paidFromPersonal;

    if (paidFromPersonal && req.user.role === 'ADMIN') {
      return error(res, 'FORBIDDEN', 'Personal advance payments are only for supervisors and distributors', 403);
    }

    let payerWallet = null;
    if (req.user.role !== 'ADMIN') {
      const distributor = await getDistributorForUser(req.user);
      payerWallet = await ensureWalletForUser(req.user, distributor?.id);
    }

    if (payerWallet && !paidFromPersonal) {
      const { getWalletBalance } = await import('../services/wallet.js');
      const walletBalance = await getWalletBalance(payerWallet.id);
      if (data.amount > walletBalance) {
        return error(
          res,
          'INSUFFICIENT_WALLET',
          `Insufficient wallet balance. Available: ₹${walletBalance}. Enable "Paid from personal" if you paid from your own money.`,
          400
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const disbursementNotes = paidFromPersonal
        ? [paymentNotes, 'Paid from personal funds'].filter(Boolean).join(' | ')
        : paymentNotes;

      const record = await tx.distributorTransaction.create({
        data: {
          distributorId,
          type: 'DISBURSEMENT',
          amount: data.amount,
          workerId: data.workerId,
          payoutRunId: data.payoutRunId,
          paymentMethod: data.paymentMethod,
          notes: disbursementNotes,
          createdById: req.user.id,
        },
      });

      if (payerWallet) {
        const walletDebit = {
          walletId: payerWallet.id,
          amount: data.amount,
          workerId: data.workerId,
          paymentMethod: data.paymentMethod,
          reference: data.paymentReference?.trim(),
          notes: paymentNotes,
          createdById: req.user.id,
        };

        if (paidFromPersonal) {
          await debitWalletPersonalAdvance(tx, walletDebit);
        } else {
          await debitWallet(tx, walletDebit);
        }
      }

      const paymentResult = await applyPaymentToAccruals(tx, data.workerId, data.amount);

      if (data.payoutRunId && !paymentResult.isPartial) {
        await tx.payoutRun.update({
          where: { id: data.payoutRunId },
          data: { status: 'PAID' },
        });
      }

      return { record, paymentResult };
    });

    const { record: transaction, paymentResult } = result;

    await createAuditLog({
      userId: req.user.id,
      entityType: 'DistributorTransaction',
      entityId: transaction.id,
      action: 'DISBURSEMENT',
      newValue: {
        ...data,
        paidFromPersonal,
        isPartial: paymentResult.isPartial,
        applied: paymentResult.applied,
      },
    });

    const newBalance = await prisma.payAccrual.aggregate({
      where: { workerId: data.workerId, status: 'ACCRUED' },
      _sum: { amount: true },
    });

    return success(
      res,
      {
        ...transaction,
        amount: Number(transaction.amount),
        isPartial: paymentResult.isPartial,
        paidFromPersonal,
        appliedToAccruals: paymentResult.applied,
        remainingBalance: Number(newBalance._sum.amount || 0),
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
