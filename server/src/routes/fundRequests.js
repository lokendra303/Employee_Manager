import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import { getDistributorForUser, assertFundRequestAccess } from '../services/access.js';
import {
  calculateDistributorPaymentDue,
  calculateSupervisorPaymentDue,
  verifyFundRequest,
} from '../services/fundRequest.js';
import { ensureWalletForUser, creditWallet } from '../services/wallet.js';
import { createAuditLog } from '../services/audit.js';
import {
  formatCurrency,
  notifyFundRequestCreated,
  notifyFundRequestNote,
  notifyFundRequestStatus,
  notifyOrgAdmins,
} from '../services/notification.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantUser);

async function resolveRequesterContext(user) {
  if (user.role === 'DISTRIBUTOR') {
    const distributor = await getDistributorForUser(user);
    if (!distributor) return null;
    const wallet = await ensureWalletForUser(user, distributor.id);
    return {
      requesterType: 'DISTRIBUTOR',
      distributorId: distributor.id,
      distributorName: distributor.name,
      walletId: wallet.id,
    };
  }

  if (user.role === 'SUPERVISOR') {
    const wallet = await ensureWalletForUser(user);
    return {
      requesterType: 'SUPERVISOR',
      distributorId: null,
      distributorName: null,
      walletId: wallet.id,
    };
  }

  return null;
}

async function addFundRequestNote(fundRequestId, authorId, body) {
  const trimmed = body?.trim();
  if (!trimmed) return null;

  return prisma.fundRequestNote.create({
    data: { fundRequestId, authorId, body: trimmed },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
}

async function getFundRequestNotes(fundRequestId) {
  return prisma.fundRequestNote.findMany({
    where: { fundRequestId },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

router.get('/calculate', requireRole('DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const ctx = await resolveRequesterContext(req.user);
    if (!ctx) return error(res, 'NOT_FOUND', 'Profile not found', 404);

    const calculation =
      ctx.requesterType === 'SUPERVISOR'
        ? await calculateSupervisorPaymentDue(req.user.id, req.user.organizationId)
        : await calculateDistributorPaymentDue(ctx.distributorId);

    return success(res, {
      requesterType: ctx.requesterType,
      distributorId: ctx.distributorId,
      distributorName: ctx.distributorName,
      walletId: ctx.walletId,
      ...calculation,
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.get('/', requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const status = req.query.status;
    let where = { organizationId: req.user.organizationId };
    if (status) where.status = status;

    if (req.user.role === 'DISTRIBUTOR') {
      const distributor = await getDistributorForUser(req.user);
      if (!distributor) return success(res, []);
      where.OR = [{ distributorId: distributor.id }, { requestedById: req.user.id }];
    }

    if (req.user.role === 'SUPERVISOR') {
      where.requestedById = req.user.id;
    }

    const requests = await prisma.fundRequest.findMany({
      where,
      include: {
        distributor: { select: { id: true, name: true } },
        wallet: { select: { id: true, holderType: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true } },
        fundSentBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(
      res,
      requests.map((r) => ({
        ...r,
        calculatedAmount: Number(r.calculatedAmount),
        requestedAmount: Number(r.requestedAmount),
        approvedAmount: r.approvedAmount ? Number(r.approvedAmount) : null,
        breakdown: JSON.parse(r.breakdown),
      }))
    );
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const createSchema = z.object({
  requestedAmount: z.number().positive(),
  notes: z.string().optional(),
});

router.post('/', requireRole('DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const ctx = await resolveRequesterContext(req.user);
    if (!ctx) return error(res, 'NOT_FOUND', 'Profile not found', 404);

    const pending = await prisma.fundRequest.findFirst({
      where: {
        walletId: ctx.walletId,
        status: { in: ['PENDING', 'APPROVED', 'FUND_SENT', 'DISPUTED'] },
      },
    });
    if (pending) {
      return error(res, 'PENDING_EXISTS', 'You already have an active fund request in progress', 409);
    }

    const calculation =
      ctx.requesterType === 'SUPERVISOR'
        ? await calculateSupervisorPaymentDue(req.user.id, req.user.organizationId)
        : await calculateDistributorPaymentDue(ctx.distributorId);

    const request = await prisma.fundRequest.create({
      data: {
        organizationId: req.user.organizationId,
        requesterType: ctx.requesterType,
        walletId: ctx.walletId,
        distributorId: ctx.distributorId,
        calculatedAmount: calculation.totalPaymentDue,
        requestedAmount: data.requestedAmount,
        breakdown: JSON.stringify(calculation),
        notes: data.notes,
        requestedById: req.user.id,
      },
      include: {
        distributor: { select: { name: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (data.notes?.trim()) {
      await addFundRequestNote(request.id, req.user.id, data.notes);
    }

    await createAuditLog({
      userId: req.user.id,
      entityType: 'FundRequest',
      entityId: request.id,
      action: 'CREATE',
      newValue: { requestedAmount: data.requestedAmount, requesterType: ctx.requesterType },
    });

    try {
      await notifyFundRequestCreated(request, request.requestedBy, data.notes?.trim());
    } catch (notifyErr) {
      console.error('Failed to notify admins of fund request:', notifyErr);
    }

    return success(
      res,
      {
        ...request,
        calculatedAmount: Number(request.calculatedAmount),
        requestedAmount: Number(request.requestedAmount),
        breakdown: JSON.parse(request.breakdown),
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

const approveSchema = z.object({
  approvedAmount: z.number().positive().optional(),
  notes: z.string().optional(),
});

router.get('/:id/verify', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
      include: {
        distributor: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
      },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);

    const verification = await verifyFundRequest(fundRequest);

    return success(res, {
      fundRequestId: id,
      requesterType: fundRequest.requesterType,
      requester: fundRequest.requestedBy,
      distributor: fundRequest.distributor,
      status: fundRequest.status,
      createdAt: fundRequest.createdAt,
      ...verification,
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/:id/approve', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = approveSchema.parse(req.body);

    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (fundRequest.status !== 'PENDING') {
      return error(res, 'INVALID_STATUS', 'Only pending requests can be approved', 400);
    }

    const approvedAmount = data.approvedAmount ?? Number(fundRequest.requestedAmount);
    const requestedAmount = Number(fundRequest.requestedAmount);

    const updated = await prisma.fundRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAmount,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'FundRequest',
      entityId: id,
      action: 'APPROVE',
      newValue: { approvedAmount },
    });

    let approveBody =
      approvedAmount === requestedAmount
        ? `Your fund request was approved for ${formatCurrency(approvedAmount)}.`
        : `Your fund request for ${formatCurrency(requestedAmount)} was approved for ${formatCurrency(approvedAmount)}.`;

    if (data.notes?.trim()) {
      approveBody += ` Note: ${data.notes.trim()}`;
      await addFundRequestNote(id, req.user.id, data.notes);
    }

    await notifyFundRequestStatus(updated, {
      type: 'FUND_REQUEST_APPROVED',
      title: 'Fund request approved',
      body: approveBody,
      userId: fundRequest.requestedById,
      metadata: {
        status: 'APPROVED',
        requestedAmount,
        approvedAmount,
      },
    });

    return success(res, {
      ...updated,
      calculatedAmount: Number(updated.calculatedAmount),
      requestedAmount: Number(updated.requestedAmount),
      approvedAmount: Number(updated.approvedAmount),
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const rejectSchema = z.object({
  reason: z.string().min(3),
});

router.post('/:id/reject', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reason } = rejectSchema.parse(req.body);

    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (fundRequest.status !== 'PENDING') {
      return error(res, 'INVALID_STATUS', 'Only pending requests can be rejected', 400);
    }

    const updated = await prisma.fundRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason: reason,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'FundRequest',
      entityId: id,
      action: 'REJECT',
      newValue: { reason },
    });

    await notifyFundRequestStatus(updated, {
      type: 'FUND_REQUEST_REJECTED',
      title: 'Fund request rejected',
      body: `Your fund request was rejected. Reason: ${reason}`,
      userId: fundRequest.requestedById,
    });

    return success(res, updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const markSentSchema = z
  .object({
    paymentMethod: z.enum(['CASH', 'UPI', 'BANK', 'OTHER']),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === 'CASH') return true;
      return !!(data.reference?.trim() || data.notes?.trim());
    },
    { message: 'Online/bank transfers require a reference or note' }
  );

router.post('/:id/mark-sent', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = markSentSchema.parse(req.body);

    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (!['APPROVED', 'DISPUTED'].includes(fundRequest.status)) {
      return error(res, 'INVALID_STATUS', 'Only approved or disputed requests can be marked as sent', 400);
    }

    const updated = await prisma.fundRequest.update({
      where: { id },
      data: {
        status: 'FUND_SENT',
        fundSentAt: new Date(),
        fundSentById: req.user.id,
        sentPaymentMethod: data.paymentMethod,
        sentReference: data.reference?.trim() || null,
        sentNotes: data.notes?.trim() || null,
        disputeReason: fundRequest.status === 'DISPUTED' ? fundRequest.disputeReason : null,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'FundRequest',
      entityId: id,
      action: 'MARK_SENT',
      newValue: data,
    });

    const sentBody = data.notes?.trim()
      ? `Funds marked as sent via ${data.paymentMethod}. Note: ${data.notes.trim()}`
      : `Funds marked as sent via ${data.paymentMethod}. Please accept or dispute.`;

    if (data.notes?.trim()) {
      await addFundRequestNote(id, req.user.id, data.notes);
    }

    await notifyFundRequestStatus(updated, {
      type: 'FUND_REQUEST_SENT',
      title: 'Funds sent',
      body: sentBody,
      userId: fundRequest.requestedById,
    });

    return success(res, updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/:id/accept', requireRole('DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (!(await assertFundRequestAccess(req.user, fundRequest))) {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }
    if (fundRequest.status !== 'FUND_SENT') {
      return error(res, 'INVALID_STATUS', 'Only fund-sent requests can be accepted', 400);
    }

    const amount = Number(fundRequest.approvedAmount);

    const updated = await prisma.$transaction(async (tx) => {
      await creditWallet(tx, {
        walletId: fundRequest.walletId,
        amount,
        fundRequestId: id,
        createdById: req.user.id,
        notes: `Fund request #${id} received — credited to wallet`,
      });

      return tx.fundRequest.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'FundRequest',
      entityId: id,
      action: 'ACCEPT_RECEIPT',
      newValue: { amount },
    });

    await notifyOrgAdmins(fundRequest.organizationId, {
      type: 'FUND_REQUEST_RECEIVED',
      title: 'Fund request completed',
      body: `Fund request #${id} was accepted. ${formatCurrency(amount)} credited to wallet.`,
      entityType: 'FundRequest',
      entityId: id,
      metadata: { status: 'RECEIVED' },
    }, { excludeUserId: req.user.id });

    return success(res, {
      ...updated,
      creditedAmount: amount,
    });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const disputeSchema = z.object({
  reason: z.string().min(3),
});

router.post('/:id/dispute', requireRole('DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reason } = disputeSchema.parse(req.body);

    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (!(await assertFundRequestAccess(req.user, fundRequest))) {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }
    if (fundRequest.status !== 'FUND_SENT') {
      return error(res, 'INVALID_STATUS', 'Only fund-sent requests can be disputed', 400);
    }

    const updated = await prisma.fundRequest.update({
      where: { id },
      data: {
        status: 'DISPUTED',
        disputeReason: reason,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      entityType: 'FundRequest',
      entityId: id,
      action: 'DISPUTE',
      newValue: { reason },
    });

    await notifyOrgAdmins(fundRequest.organizationId, {
      type: 'FUND_REQUEST_DISPUTED',
      title: 'Fund request disputed',
      body: `Fund request #${id} was disputed. Reason: ${reason}`,
      entityType: 'FundRequest',
      entityId: id,
      metadata: { status: 'DISPUTED' },
    }, { excludeUserId: req.user.id });

    return success(res, updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

const noteSchema = z.object({
  body: z.string().min(1).max(2000),
});

router.get('/:id/notes', requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (!(await assertFundRequestAccess(req.user, fundRequest))) {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const notes = await getFundRequestNotes(id);
    return success(res, notes);
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

router.post('/:id/notes', requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { body } = noteSchema.parse(req.body);

    const fundRequest = await prisma.fundRequest.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });
    if (!fundRequest) return error(res, 'NOT_FOUND', 'Fund request not found', 404);
    if (!(await assertFundRequestAccess(req.user, fundRequest))) {
      return error(res, 'FORBIDDEN', 'Access denied', 403);
    }

    const note = await addFundRequestNote(id, req.user.id, body);
    await notifyFundRequestNote(fundRequest, req.user, body);

    return success(res, note, 201);
  } catch (err) {
    if (err.name === 'ZodError') {
      return error(res, 'VALIDATION_ERROR', err.errors[0].message);
    }
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
