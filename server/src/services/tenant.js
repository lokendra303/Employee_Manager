import { error } from '../lib/response.js';

export function isSystemAdmin(user) {
  return user?.role === 'SYSTEM_ADMIN';
}

export function requireOrganizationId(user) {
  if (isSystemAdmin(user)) {
    return null;
  }
  if (!user?.organizationId) {
    throw new Error('User is not linked to an organization');
  }
  return user.organizationId;
}

export function organizationFilter(user, extra = {}) {
  const orgId = requireOrganizationId(user);
  if (orgId === null) return extra;
  return { ...extra, organizationId: orgId };
}

export function assertSameOrganization(user, entityOrgId) {
  if (isSystemAdmin(user)) return;
  const orgId = requireOrganizationId(user);
  if (entityOrgId !== orgId) {
    throw new Error('Access denied for this organization');
  }
}

export function tenantError(res, message = 'Organization access denied') {
  return error(res, 'FORBIDDEN', message, 403);
}
