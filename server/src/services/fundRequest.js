import prisma from '../lib/prisma.js';
import { getWalletBalance, getPersonalAdvanceDue } from './wallet.js';

async function buildWorkerBreakdown(workers) {
  const workerBreakdown = workers
    .map((w) => {
      const amount = w.accruals.reduce((sum, a) => sum + Number(a.amount), 0);
      return {
        workerId: w.id,
        workerName: w.name,
        daysCount: w.accruals.length,
        amount,
        accruals: w.accruals.map((a) => ({
          workDate: a.workDate.toISOString().slice(0, 10),
          amount: Number(a.amount),
        })),
      };
    })
    .filter((w) => w.amount > 0);

  return workerBreakdown;
}

export async function calculateDistributorPaymentDue(distributorId) {
  const workers = await prisma.worker.findMany({
    where: { distributorId, status: 'ACTIVE' },
    include: {
      accruals: {
        where: { status: 'ACCRUED' },
        orderBy: { workDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const workerBreakdown = await buildWorkerBreakdown(workers);
  const totalPaymentDue = workerBreakdown.reduce((sum, w) => sum + w.amount, 0);

  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    include: { wallet: true },
  });

  let availableBalance = 0;
  let personalAdvanceDue = 0;
  let walletId = distributor?.wallet?.id ?? null;

  if (walletId) {
    availableBalance = await getWalletBalance(walletId);
    personalAdvanceDue = await getPersonalAdvanceDue(walletId);
  } else if (distributor?.userId) {
    const wallet = await prisma.wallet.findFirst({ where: { userId: distributor.userId } });
    if (wallet) {
      walletId = wallet.id;
      availableBalance = await getWalletBalance(wallet.id);
      personalAdvanceDue = await getPersonalAdvanceDue(wallet.id);
    }
  }

  const fundNeeded = Math.max(0, totalPaymentDue - availableBalance);

  return {
    totalPaymentDue,
    availableBalance,
    personalAdvanceDue,
    fundNeeded,
    workerCount: workerBreakdown.length,
    workers: workerBreakdown,
  };
}

export async function calculateSupervisorPaymentDue(supervisorId, organizationId) {
  const assignments = await prisma.supervisorAssignment.findMany({
    where: { supervisorId },
    include: {
      worker: {
        include: {
          accruals: {
            where: { status: 'ACCRUED' },
            orderBy: { workDate: 'asc' },
          },
        },
      },
    },
  });

  const workers = assignments
    .map((a) => a.worker)
    .filter((w) => w && w.organizationId === organizationId && w.status === 'ACTIVE');

  const workerBreakdown = await buildWorkerBreakdown(workers);
  const totalPaymentDue = workerBreakdown.reduce((sum, w) => sum + w.amount, 0);

  const wallet = await prisma.wallet.findFirst({ where: { userId: supervisorId } });
  const availableBalance = wallet ? await getWalletBalance(wallet.id) : 0;
  const personalAdvanceDue = wallet ? await getPersonalAdvanceDue(wallet.id) : 0;
  const fundNeeded = Math.max(0, totalPaymentDue - availableBalance);

  return {
    totalPaymentDue,
    availableBalance,
    personalAdvanceDue,
    fundNeeded,
    workerCount: workerBreakdown.length,
    workers: workerBreakdown,
  };
}

export async function verifyFundRequest(fundRequest) {
  const submitted =
    typeof fundRequest.breakdown === 'string'
      ? JSON.parse(fundRequest.breakdown)
      : fundRequest.breakdown;

  const current =
    fundRequest.requesterType === 'SUPERVISOR'
      ? await calculateSupervisorPaymentDue(
          fundRequest.requestedById,
          fundRequest.organizationId
        )
      : await calculateDistributorPaymentDue(fundRequest.distributorId);

  const submittedTotal = Number(fundRequest.calculatedAmount);
  const requestedAmount = Number(fundRequest.requestedAmount);
  const currentTotal = current.totalPaymentDue;

  const submittedMap = new Map((submitted.workers || []).map((w) => [w.workerId, w]));
  const currentMap = new Map(current.workers.map((w) => [w.workerId, w]));
  const allWorkerIds = new Set([...submittedMap.keys(), ...currentMap.keys()]);

  const workerComparison = [...allWorkerIds].map((workerId) => {
    const sub = submittedMap.get(workerId);
    const cur = currentMap.get(workerId);
    const submittedAmount = sub?.amount ?? 0;
    const currentAmount = cur?.amount ?? 0;
    return {
      workerId,
      workerName: cur?.workerName || sub?.workerName || 'Unknown',
      submittedAmount,
      currentAmount,
      submittedDays: sub?.daysCount ?? 0,
      currentDays: cur?.daysCount ?? 0,
      delta: currentAmount - submittedAmount,
      match: submittedAmount === currentAmount,
      currentAccruals: cur?.accruals || [],
    };
  });

  const allWorkersMatch = workerComparison.every((w) => w.match);
  const paymentDueMatch = submittedTotal === currentTotal;
  const requestedWithinDue = requestedAmount <= currentTotal;
  const requestedWithinFundNeeded = requestedAmount <= current.fundNeeded + 0.01;

  let verificationStatus = 'CORRECT';
  let message = 'Fund request matches current payment records.';

  if (!paymentDueMatch || !allWorkersMatch) {
    verificationStatus = 'PAYMENT_CHANGED';
    message = 'Worker payment totals have changed since this request was submitted.';
  } else if (requestedAmount > currentTotal) {
    verificationStatus = 'OVER_REQUESTED';
    message = 'Requested amount is higher than total payment due to workers.';
  } else if (!requestedWithinFundNeeded && current.fundNeeded < requestedAmount) {
    verificationStatus = 'EXCEEDS_FUND_NEEDED';
    message = 'Requested amount exceeds the fund still needed after available balance.';
  }

  const isCorrect =
    paymentDueMatch && allWorkersMatch && requestedWithinDue && requestedWithinFundNeeded;

  return {
    isCorrect,
    verificationStatus,
    message,
    atRequest: {
      totalPaymentDue: submittedTotal,
      requestedAmount,
      availableBalance: submitted.availableBalance ?? null,
      fundNeeded: submitted.fundNeeded ?? null,
      workerCount: submitted.workerCount ?? submitted.workers?.length ?? 0,
    },
    current: {
      totalPaymentDue: currentTotal,
      availableBalance: current.availableBalance,
      fundNeeded: current.fundNeeded,
      workerCount: current.workerCount,
      workers: current.workers,
    },
    comparison: {
      paymentDueDelta: currentTotal - submittedTotal,
      requestedVsCurrentDue: requestedAmount - currentTotal,
      requestedVsFundNeeded: requestedAmount - current.fundNeeded,
    },
    workerComparison,
  };
}
