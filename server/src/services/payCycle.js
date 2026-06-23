import prisma from '../lib/prisma.js';
import { addDays, toDateOnly } from '../lib/dates.js';
import {
  calculateAccrualAmount,
  getCurrentPayPeriod,
  isPeriodEnded,
} from './attendanceRules.js';
import { createAuditLog } from './audit.js';

export async function syncAccrualForAttendance(attendance, worker) {
  const amount = calculateAccrualAmount(worker.dailyRate, attendance.status);
  const workDate = toDateOnly(attendance.workDate);

  if (amount === 0) {
    const existing = await prisma.payAccrual.findUnique({
      where: {
        workerId_workDate: { workerId: worker.id, workDate },
      },
    });

    if (existing && existing.status === 'PAID') {
      throw new Error('Cannot change attendance after payment is recorded');
    }

    if (existing) {
      await prisma.payAccrual.update({
        where: { id: existing.id },
        data: { status: 'VOIDED', amount: 0 },
      });
    }
    return null;
  }

  const existing = await prisma.payAccrual.findUnique({
    where: {
      workerId_workDate: { workerId: worker.id, workDate },
    },
  });

  if (existing?.status === 'PAID') {
    throw new Error('Cannot change attendance after payment is recorded');
  }

  return prisma.payAccrual.upsert({
    where: {
      workerId_workDate: { workerId: worker.id, workDate },
    },
    create: {
      workerId: worker.id,
      workDate,
      amount,
      status: 'ACCRUED',
    },
    update: {
      amount,
      status: 'ACCRUED',
    },
  });
}

export async function closePayPeriodForWorker(workerId, userId) {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) throw new Error('Worker not found');

  const { periodStart, periodEnd } = getCurrentPayPeriod(worker);

  const accruals = await prisma.payAccrual.findMany({
    where: {
      workerId,
      status: 'ACCRUED',
      workDate: { gte: periodStart, lte: periodEnd },
    },
  });

  if (accruals.length === 0) {
    throw new Error('No accrued pay in the current period');
  }

  const totalAmount = accruals.reduce((sum, a) => sum + Number(a.amount), 0);

  const payoutRun = await prisma.$transaction(async (tx) => {
    const run = await tx.payoutRun.create({
      data: {
        workerId,
        periodStart,
        periodEnd,
        totalAmount,
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    await tx.payAccrual.updateMany({
      where: { id: { in: accruals.map((a) => a.id) } },
      data: { payoutRunId: run.id },
    });

    await tx.distributorTransaction.create({
      data: {
        distributorId: worker.distributorId,
        type: 'ACCRUAL_CREDIT',
        amount: totalAmount,
        workerId,
        payoutRunId: run.id,
        createdById: userId,
        notes: `Pay period ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
      },
    });

    await tx.attendanceRecord.updateMany({
      where: {
        workerId,
        workDate: { gte: periodStart, lte: periodEnd },
      },
      data: { isLocked: true },
    });

    return run;
  });

  await createAuditLog({
    userId,
    entityType: 'PayoutRun',
    entityId: payoutRun.id,
    action: 'CLOSE_PERIOD',
    newValue: { workerId, totalAmount: Number(totalAmount) },
  });

  const nextAnchor = addDays(periodEnd, 1);
  await prisma.worker.update({
    where: { id: workerId },
    data: { payCycleAnchor: nextAnchor },
  });

  return payoutRun;
}

export async function getWorkerAccruedBalance(workerId) {
  const result = await prisma.payAccrual.aggregate({
    where: { workerId, status: 'ACCRUED' },
    _sum: { amount: true },
  });
  return Number(result._sum.amount || 0);
}

export async function getDistributorBalance(distributorId) {
  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    include: { wallet: true },
  });
  if (!distributor) throw new Error('Distributor not found');

  if (distributor.wallet) {
    const { getWalletBalance } = await import('./wallet.js');
    return getWalletBalance(distributor.wallet.id);
  }

  const credits = await prisma.distributorTransaction.aggregate({
    where: {
      distributorId,
      type: { in: ['ACCRUAL_CREDIT', 'ADJUSTMENT'] },
    },
    _sum: { amount: true },
  });

  const debits = await prisma.distributorTransaction.aggregate({
    where: {
      distributorId,
      type: { in: ['DISBURSEMENT', 'REVERSAL'] },
    },
    _sum: { amount: true },
  });

  return (
    Number(distributor.openingBalance) +
    Number(credits._sum.amount || 0) -
    Number(debits._sum.amount || 0)
  );
}

export { isPeriodEnded, getCurrentPayPeriod };
