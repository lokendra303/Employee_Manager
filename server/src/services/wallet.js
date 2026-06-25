import prisma from '../lib/prisma.js';

export async function getWalletBalance(walletId) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new Error('Wallet not found');

  const credits = await prisma.walletTransaction.aggregate({
    where: {
      walletId,
      type: { in: ['CREDIT', 'ADJUSTMENT'] },
    },
    _sum: { amount: true },
  });

  const debits = await prisma.walletTransaction.aggregate({
    where: { walletId, type: 'DEBIT' },
    _sum: { amount: true },
  });

  return (
    Number(wallet.openingBalance) +
    Number(credits._sum.amount || 0) -
    Number(debits._sum.amount || 0)
  );
}

export async function getWalletForUser(user) {
  return prisma.wallet.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
  });
}

export async function ensureWalletForUser(user, distributorId = null) {
  const existing = await getWalletForUser(user);
  if (existing) return existing;

  const holderType = user.role === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'SUPERVISOR';

  return prisma.wallet.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      holderType,
      distributorId: holderType === 'DISTRIBUTOR' ? distributorId : null,
    },
  });
}

export async function creditWallet(tx, { walletId, amount, fundRequestId, createdById, notes }) {
  return tx.walletTransaction.create({
    data: {
      walletId,
      type: 'CREDIT',
      amount,
      fundRequestId,
      notes,
      createdById,
    },
  });
}

export const PERSONAL_ADVANCE_PREFIX = '[Personal advance]';

export function isPersonalAdvanceTransaction(transaction) {
  return transaction.notes?.startsWith(PERSONAL_ADVANCE_PREFIX) ?? false;
}

export async function getPersonalAdvanceDue(walletId) {
  const balance = await getWalletBalance(walletId);
  return Math.max(0, -balance);
}

export async function debitWallet(tx, { walletId, amount, workerId, paymentMethod, reference, notes, createdById }) {
  const balance = await getWalletBalanceInTx(tx, walletId);
  if (amount > balance) {
    throw new Error(`Insufficient wallet balance. Available: ₹${balance}`);
  }

  return tx.walletTransaction.create({
    data: {
      walletId,
      type: 'DEBIT',
      amount,
      workerId,
      paymentMethod,
      reference,
      notes,
      createdById,
    },
  });
}

export async function debitWalletPersonalAdvance(
  tx,
  { walletId, amount, workerId, paymentMethod, reference, notes, createdById }
) {
  const advanceNote = notes?.trim()
    ? `${PERSONAL_ADVANCE_PREFIX} ${notes.trim()}`
    : `${PERSONAL_ADVANCE_PREFIX} Paid from personal funds — pending reimbursement`;

  return tx.walletTransaction.create({
    data: {
      walletId,
      type: 'DEBIT',
      amount,
      workerId,
      paymentMethod,
      reference,
      notes: advanceNote,
      createdById,
    },
  });
}

/**
 * Debits wallet for a salary payment. Uses available org wallet balance first;
 * any shortfall is recorded as personal advance (negative balance / reimbursement due).
 */
export async function debitWalletForDisbursement(
  tx,
  { walletId, amount, workerId, paymentMethod, reference, notes, createdById, forcePersonalAdvance = false }
) {
  if (forcePersonalAdvance) {
    await debitWalletPersonalAdvance(tx, {
      walletId,
      amount,
      workerId,
      paymentMethod,
      reference,
      notes,
      createdById,
    });
    return { usedPersonalAdvance: true, personalAdvanceAmount: amount, walletAmount: 0 };
  }

  const balance = await getWalletBalanceInTx(tx, walletId);

  if (amount <= balance) {
    await debitWallet(tx, {
      walletId,
      amount,
      workerId,
      paymentMethod,
      reference,
      notes,
      createdById,
    });
    return { usedPersonalAdvance: false, personalAdvanceAmount: 0, walletAmount: amount };
  }

  const walletAmount = Math.max(0, balance);
  const personalAdvanceAmount = amount - walletAmount;

  if (walletAmount > 0) {
    await debitWallet(tx, {
      walletId,
      amount: walletAmount,
      workerId,
      paymentMethod,
      reference,
      notes,
      createdById,
    });
  }

  if (personalAdvanceAmount > 0) {
    await debitWalletPersonalAdvance(tx, {
      walletId,
      amount: personalAdvanceAmount,
      workerId,
      paymentMethod,
      reference,
      notes,
      createdById,
    });
  }

  return {
    usedPersonalAdvance: personalAdvanceAmount > 0,
    personalAdvanceAmount,
    walletAmount,
  };
}

async function getWalletBalanceInTx(tx, walletId) {
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new Error('Wallet not found');

  const credits = await tx.walletTransaction.aggregate({
    where: { walletId, type: { in: ['CREDIT', 'ADJUSTMENT'] } },
    _sum: { amount: true },
  });
  const debits = await tx.walletTransaction.aggregate({
    where: { walletId, type: 'DEBIT' },
    _sum: { amount: true },
  });

  return (
    Number(wallet.openingBalance) +
    Number(credits._sum.amount || 0) -
    Number(debits._sum.amount || 0)
  );
}

export async function getWalletSummary(walletId) {
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      distributor: { select: { id: true, name: true } },
    },
  });
  if (!wallet) throw new Error('Wallet not found');

  const balance = await getWalletBalance(walletId);

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId },
    include: {
      worker: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return {
    ...wallet,
    openingBalance: Number(wallet.openingBalance),
    balance,
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
  };
}
