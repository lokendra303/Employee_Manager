import prisma from '../lib/prisma.js';
import { isPersonalAdvanceTransaction } from './wallet.js';

function endOfDay(date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function inRange(date, from, toEnd) {
  if (!date) return false;
  const d = new Date(date);
  return d >= from && d <= toEnd;
}

function num(value) {
  return Number(value || 0);
}

export async function getFinancialOverview(organizationId, fromDate, toDate) {
  const toEnd = endOfDay(toDate);
  const createdInRange = { gte: fromDate, lte: toEnd };

  const [fundRequests, disbursements, walletTransactions, pendingAccrual, paidAccrualInRange] =
    await Promise.all([
      prisma.fundRequest.findMany({
        where: { organizationId },
        include: {
          requestedBy: { select: { id: true, name: true, role: true } },
          reviewedBy: { select: { name: true } },
          fundSentBy: { select: { name: true } },
          distributor: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.distributorTransaction.findMany({
        where: {
          type: 'DISBURSEMENT',
          distributor: { organizationId },
          createdAt: createdInRange,
        },
        include: {
          worker: { select: { id: true, name: true } },
          distributor: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.walletTransaction.findMany({
        where: {
          wallet: { organizationId },
          createdAt: createdInRange,
        },
        include: {
          worker: { select: { id: true, name: true } },
          createdBy: { select: { name: true, role: true } },
          wallet: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payAccrual.aggregate({
        where: { status: 'ACCRUED', worker: { organizationId } },
        _sum: { amount: true },
      }),
      prisma.payAccrual.aggregate({
        where: {
          status: 'PAID',
          worker: { organizationId },
          updatedAt: createdInRange,
        },
        _sum: { amount: true },
      }),
    ]);

  const fundsApprovedInPeriod = fundRequests.filter(
    (fr) => fr.reviewedAt && inRange(fr.reviewedAt, fromDate, toEnd) && fr.approvedAmount
  );
  const fundsSentInPeriod = fundRequests.filter(
    (fr) => fr.fundSentAt && inRange(fr.fundSentAt, fromDate, toEnd)
  );
  const fundsReceivedInPeriod = fundRequests.filter(
    (fr) => fr.receivedAt && inRange(fr.receivedAt, fromDate, toEnd)
  );

  const fundSummary = {
    approvedCount: fundsApprovedInPeriod.length,
    approvedAmount: fundsApprovedInPeriod.reduce((s, fr) => s + num(fr.approvedAmount), 0),
    sentCount: fundsSentInPeriod.length,
    sentAmount: fundsSentInPeriod.reduce((s, fr) => s + num(fr.approvedAmount), 0),
    receivedCount: fundsReceivedInPeriod.length,
    receivedAmount: fundsReceivedInPeriod.reduce((s, fr) => s + num(fr.approvedAmount), 0),
    pendingCount: fundRequests.filter((fr) =>
      ['PENDING', 'APPROVED', 'FUND_SENT', 'DISPUTED'].includes(fr.status)
    ).length,
  };

  const workerPaymentTotal = disbursements.reduce((s, d) => s + num(d.amount), 0);

  const walletDebits = walletTransactions.filter((t) => t.type === 'DEBIT' && t.workerId);
  const walletCredits = walletTransactions.filter((t) => t.type === 'CREDIT');

  let paidFromWallet = 0;
  let paidPersonalAdvance = 0;
  let paidByAdmin = 0;
  const byMethod = { CASH: 0, UPI: 0, BANK: 0, OTHER: 0 };

  for (const d of disbursements) {
    const method = d.paymentMethod || 'OTHER';
    byMethod[method] = (byMethod[method] || 0) + num(d.amount);
    if (d.createdBy?.role === 'ADMIN') {
      paidByAdmin += num(d.amount);
    } else if ((d.notes || '').includes('Paid from personal funds')) {
      paidPersonalAdvance += num(d.amount);
    } else {
      paidFromWallet += num(d.amount);
    }
  }

  for (const t of walletDebits) {
    const amount = num(t.amount);
    if (isPersonalAdvanceTransaction(t)) {
      // Already counted via disbursement notes when linked; keep for wallet-only edge cases
      if (!disbursements.some(
        (d) => d.workerId === t.workerId && num(d.amount) === amount
      )) {
        paidPersonalAdvance += amount;
      }
    }
  }

  const fundCreditsToWallet = walletCredits.reduce((s, t) => s + num(t.amount), 0);

  const ledger = [];

  for (const fr of fundRequests) {
    if (fr.receivedAt && inRange(fr.receivedAt, fromDate, toEnd)) {
      ledger.push({
        id: `fr-received-${fr.id}`,
        category: 'FUND_RECEIVED',
        label: 'Fund received into wallet',
        amount: num(fr.approvedAmount),
        date: fr.receivedAt,
        party: fr.requestedBy?.name,
        partyRole: fr.requesterType,
        project: fr.distributor?.name,
        reference: `Fund request #${fr.id}`,
        method: fr.sentPaymentMethod,
        detail: fr.sentReference ? `Ref: ${fr.sentReference}` : fr.sentNotes,
      });
    }
    if (fr.fundSentAt && inRange(fr.fundSentAt, fromDate, toEnd)) {
      ledger.push({
        id: `fr-sent-${fr.id}`,
        category: 'FUND_SENT',
        label: 'Fund sent by admin',
        amount: num(fr.approvedAmount),
        date: fr.fundSentAt,
        party: fr.requestedBy?.name,
        partyRole: fr.requesterType,
        project: fr.distributor?.name,
        reference: `Fund request #${fr.id}`,
        method: fr.sentPaymentMethod,
        detail: fr.sentNotes,
      });
    }
    if (
      fr.reviewedAt &&
      inRange(fr.reviewedAt, fromDate, toEnd) &&
      fr.approvedAmount &&
      fr.status !== 'REJECTED'
    ) {
      ledger.push({
        id: `fr-approved-${fr.id}`,
        category: 'FUND_APPROVED',
        label: 'Fund request approved',
        amount: num(fr.approvedAmount),
        date: fr.reviewedAt,
        party: fr.requestedBy?.name,
        partyRole: fr.requesterType,
        project: fr.distributor?.name,
        reference: `Fund request #${fr.id}`,
        detail:
          num(fr.approvedAmount) !== num(fr.requestedAmount)
            ? `Requested ${num(fr.requestedAmount)}`
            : null,
      });
    }
  }

  for (const d of disbursements) {
    const notes = d.notes || '';
    const isPersonal = notes.includes('Paid from personal funds');
    const paidByAdmin = d.createdBy?.role === 'ADMIN';
    ledger.push({
      id: `pay-${d.id}`,
      category: 'WORKER_PAYMENT',
      label: paidByAdmin ? 'Salary paid to worker (admin)' : 'Salary paid to worker',
      amount: num(d.amount),
      date: d.createdAt,
      party: d.worker?.name,
      project: d.distributor?.name,
      paidBy: d.createdBy?.name,
      paidByRole: d.createdBy?.role,
      method: d.paymentMethod,
      source: paidByAdmin ? 'ADMIN_DIRECT' : isPersonal ? 'PERSONAL_ADVANCE' : 'ORG_WALLET',
      reference: `Payment #${d.id}`,
      detail: d.notes,
    });
  }

  for (const t of walletCredits) {
    if (!t.fundRequestId) continue;
    ledger.push({
      id: `wc-${t.id}`,
      category: 'WALLET_CREDIT',
      label: 'Wallet credited (fund release)',
      amount: num(t.amount),
      date: t.createdAt,
      party: t.wallet?.user?.name,
      partyRole: t.wallet?.user?.role,
      reference: t.fundRequestId ? `Fund request #${t.fundRequestId}` : null,
      detail: t.notes,
    });
  }

  ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    range: {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    },
    summary: {
      fundsReleasedToStaff: fundSummary.receivedAmount,
      fundsSentNotYetReceived: fundsSentInPeriod
        .filter((fr) => fr.status === 'FUND_SENT')
        .reduce((s, fr) => s + num(fr.approvedAmount), 0),
      fundsApprovedNotSent: fundRequests
        .filter((fr) => fr.status === 'APPROVED')
        .reduce((s, fr) => s + num(fr.approvedAmount), 0),
      fundRequests: fundSummary,
      workerPayments: {
        total: workerPaymentTotal,
        count: disbursements.length,
        fromOrgWallet: paidFromWallet,
        personalAdvance: paidPersonalAdvance,
        adminDirect: paidByAdmin,
        byMethod,
      },
      walletCreditsInPeriod: fundCreditsToWallet,
      salaryAccrualsMarkedPaid: num(paidAccrualInRange._sum.amount),
      salaryStillPending: num(pendingAccrual._sum.amount),
    },
    ledger,
  };
}
