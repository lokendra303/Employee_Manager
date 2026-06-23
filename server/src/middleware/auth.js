import jwt from 'jsonwebtoken';
import { error } from '../lib/response.js';
import { userActsAsDistributor } from '../services/access.js';

export function signToken(user, organization = null, extra = {}) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organizationId: user.organizationId ?? null,
      organizationName: organization?.name ?? null,
      organizationStatus: organization?.status ?? null,
      linkedDistributorId: extra.linkedDistributorId ?? null,
      linkedDistributorName: extra.linkedDistributorName ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return error(res, 'INVALID_TOKEN', 'Invalid or expired token', 401);
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return error(res, 'FORBIDDEN', 'You do not have permission', 403);
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    if (roles.includes('DISTRIBUTOR') && (await userActsAsDistributor(req.user))) {
      return next();
    }
    return error(res, 'FORBIDDEN', 'You do not have permission', 403);
  };
}

export function requireTenantUser(req, res, next) {
  if (req.user?.role === 'SYSTEM_ADMIN') {
    return error(res, 'FORBIDDEN', 'System admin cannot access organization resources here', 403);
  }
  if (!req.user?.organizationId) {
    return error(res, 'FORBIDDEN', 'No organization linked to this account', 403);
  }
  next();
}
