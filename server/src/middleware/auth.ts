import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { readDb } from '../models/database.ts';
import { AdminRole } from '../../../src/types/domain.ts';

export interface AuthTokenPayload {
  sub: string;
  kind: 'customer' | 'admin';
  role?: AdminRole;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '12h' });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export async function requireCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required.' });
    }
    const token = header.slice(7);
    const decoded = verifyAuthToken(token);
    if (decoded.kind !== 'customer') {
      return res.status(403).json({ error: 'Customer account access required.' });
    }
    const db = await readDb();
    const user = db.users.find((u) => u.id === decoded.sub);
    if (!user) {
      return res.status(401).json({ error: 'Account session is invalid or expired.' });
    }
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication session.' });
  }
}

export function requireAdmin(allowedRoles?: AdminRole[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Operator authentication token required.' });
      }
      const token = header.slice(7);
      const decoded = verifyAuthToken(token);
      if (decoded.kind !== 'admin' || !decoded.role) {
        return res.status(403).json({ error: 'Administrator privileges required.' });
      }
      const db = await readDb();
      const admin = db.admins.find((a) => a.id === decoded.sub);
      if (!admin || admin.accountStatus !== 'Active') {
        return res.status(403).json({ error: 'Administrator account is inactive.' });
      }
      if (
        allowedRoles &&
        allowedRoles.length > 0 &&
        admin.role !== 'Super Admin' &&
        !allowedRoles.includes(admin.role)
      ) {
        return res.status(403).json({
          error: `Role "${admin.role}" does not have permission for this action.`,
        });
      }
      req.auth = { sub: admin.id, kind: 'admin', role: admin.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired operator session.' });
    }
  };
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for sensitive action. Please try shortly.' },
});
