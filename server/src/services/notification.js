import prisma from '../lib/prisma.js';

export async function createNotification({
  userId,
  organizationId = null,
  type,
  title,
  body,
  entityType = null,
  entityId = null,
  metadata = null,
}) {
  return prisma.notification.create({
    data: {
      userId,
      organizationId,
      type,
      title,
      body,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function notifyUsers(userIds, payload) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  return Promise.all(uniqueIds.map((userId) => createNotification({ ...payload, userId })));
}

export async function notifyOrgAdmins(organizationId, payload, { excludeUserId } = {}) {
  const admins = await prisma.user.findMany({
    where: {
      organizationId,
      role: 'ADMIN',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  return notifyUsers(
    admins.map((a) => a.id),
    { ...payload, organizationId }
  );
}

export function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export async function notifyFundRequestCreated(fundRequest, requester, note) {
  const amount = formatCurrency(fundRequest.requestedAmount);
  const roleLabel =
    fundRequest.requesterType === 'SUPERVISOR'
      ? 'Supervisor'
      : fundRequest.requesterType === 'DISTRIBUTOR'
        ? 'Distributor'
        : requester.role?.replace(/_/g, ' ') || 'User';

  const body = note
    ? `${roleLabel} ${requester.name} requested ${amount}. Note: ${note}`
    : `${roleLabel} ${requester.name} requested ${amount}.`;

  return notifyOrgAdmins(fundRequest.organizationId, {
    type: 'FUND_REQUEST_CREATED',
    title: `New fund request from ${roleLabel}`,
    body,
    entityType: 'FundRequest',
    entityId: fundRequest.id,
    metadata: {
      status: fundRequest.status,
      requestedAmount: Number(fundRequest.requestedAmount),
      requesterType: fundRequest.requesterType,
      requesterName: requester.name,
    },
  }, { excludeUserId: requester.id });
}

export async function notifyFundRequestStatus(fundRequest, { title, body, type, userId, metadata }) {
  return createNotification({
    userId,
    organizationId: fundRequest.organizationId,
    type,
    title,
    body,
    entityType: 'FundRequest',
    entityId: fundRequest.id,
    metadata: metadata ?? { status: fundRequest.status },
  });
}

export async function notifyFundRequestNote(fundRequest, author, noteBody) {
  const isAdmin = author.role === 'ADMIN';
  const title = `Note on fund request #${fundRequest.id}`;
  const body = `${author.name}: ${noteBody}`;

  if (isAdmin) {
    return notifyFundRequestStatus(fundRequest, {
      type: 'FUND_REQUEST_NOTE',
      title,
      body,
      userId: fundRequest.requestedById,
    });
  }

  return notifyOrgAdmins(fundRequest.organizationId, {
    type: 'FUND_REQUEST_NOTE',
    title,
    body,
    entityType: 'FundRequest',
    entityId: fundRequest.id,
    metadata: { status: fundRequest.status },
  }, { excludeUserId: author.id });
}
