import prisma from '../lib/prisma.js';

export async function assertSupervisorAssigned(supervisorId, workerId) {
  const assignment = await prisma.supervisorAssignment.findFirst({
    where: { supervisorId, workerId },
  });
  return !!assignment;
}

/** Distributor profile linked to this user (DISTRIBUTOR role or SUPERVISOR with distributor link). */
export async function getDistributorForUser(user) {
  if (!user?.id || !user.organizationId) return null;
  return prisma.distributor.findFirst({
    where: { userId: user.id, organizationId: user.organizationId, isActive: true },
  });
}

export async function userActsAsDistributor(user) {
  if (user.role === 'DISTRIBUTOR') return true;
  if (user.role === 'SUPERVISOR') {
    return !!(await getDistributorForUser(user));
  }
  return false;
}

export async function assertDistributorAccess(user, distributorId) {
  if (user.role === 'ADMIN') return true;

  const distributor = await prisma.distributor.findFirst({
    where: { id: distributorId, organizationId: user.organizationId },
  });
  if (!distributor) return false;

  if (user.role === 'DISTRIBUTOR' || user.role === 'SUPERVISOR') {
    return distributor.userId === user.id;
  }

  return false;
}

export async function assertFundRequestAccess(user, fundRequest) {
  if (user.role === 'ADMIN') return true;
  if (fundRequest.requestedById === user.id) return true;
  const distributor = await getDistributorForUser(user);
  return distributor && fundRequest.distributorId === distributor.id;
}

export async function getWorkerForUser(user, workerId) {
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, organizationId: user.organizationId },
    include: { distributor: { select: { id: true, name: true } } },
  });
  if (!worker) return null;

  if (user.role === 'ADMIN') return worker;

  const linkedDistributor = await getDistributorForUser(user);
  if (linkedDistributor?.id === worker.distributorId) return worker;

  if (user.role === 'SUPERVISOR') {
    const assigned = await assertSupervisorAssigned(user.id, workerId);
    return assigned ? worker : null;
  }

  return null;
}

export async function getLinkedDistributorSummary(userId, organizationId) {
  if (!userId || organizationId == null) return null;
  const distributor = await prisma.distributor.findFirst({
    where: { userId, organizationId, isActive: true },
    select: { id: true, name: true },
  });
  return distributor;
}
