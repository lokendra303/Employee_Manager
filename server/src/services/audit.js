import prisma from '../lib/prisma.js';

export async function createAuditLog({
  userId,
  entityType,
  entityId,
  action,
  oldValue = null,
  newValue = null,
  reason = null,
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      entityType,
      entityId,
      action,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      reason,
    },
  });
}
