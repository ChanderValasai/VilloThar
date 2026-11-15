import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { nadraProvider } from '../integrations/interfaces.ts';
import { authRateLimiter, signAuthToken } from '../middleware/auth.ts';
import {
  CustomerRecord,
  mutateDb,
  readDb,
  sanitizeAdmin,
  sanitizeCustomer,
} from '../models/database.ts';
import {
  encryptCnic,
  generateId,
  hashCnicForLookup,
  isValidCnicFormat,
  isValidPakistanMobile,
  maskCnic,
  normalizeCnic,
  normalizeMobileNumber,
} from '../utils/crypto.ts';

export const authRoutes = Router();

const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Full name is required').max(120),
    cnicNumber: z.string().trim(),
    mobileNumber: z.string().trim(),
    villageId: z.string().trim().min(1, 'Village selection is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    confirmPassword: z.string(),
    consentAccepted: z.boolean().refine((v) => v === true, {
      message: 'Consent to identity verification and data processing is required.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

authRoutes.post('/register', authRateLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid registration data.',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const normalizedCnic = normalizeCnic(parsed.data.cnicNumber);
  if (!isValidCnicFormat(normalizedCnic)) {
    return res.status(400).json({
      error: 'Invalid CNIC format. Expected 13 digits formatted as XXXXX-XXXXXXX-X.',
    });
  }

  const normalizedMobile = normalizeMobileNumber(parsed.data.mobileNumber);
  if (!isValidPakistanMobile(normalizedMobile)) {
    return res.status(400).json({
      error: 'Invalid mobile number. Expected a valid Pakistan mobile number (03XXXXXXXXX).',
    });
  }

  const dbSnapshot = await readDb();
  const village = dbSnapshot.villages.find(
    (v) => v.id === parsed.data.villageId && v.role === 'Coverage',
  );
  if (!village) {
    return res.status(400).json({
      error:
        'Selected location is not an eligible customer coverage village. Mithi is the NOC hub only.',
    });
  }

  const cnicHash = hashCnicForLookup(normalizedCnic);
  if (dbSnapshot.users.some((u) => u.mobileNumber === normalizedMobile)) {
    return res.status(409).json({
      error: 'An account with this mobile number already exists. Please log in instead.',
    });
  }
  if (dbSnapshot.users.some((u) => u.cnicHash === cnicHash)) {
    return res.status(409).json({
      error: 'This CNIC is already associated with an existing VilloThar customer account.',
    });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const nadraResult =
    dbSnapshot.siteConfig.nadraIntegrationMode === 'authorized_disabled'
      ? {
          status: 'Requires Manual Review' as const,
          providerRef: `MANUAL-QUEUE-${generateId('rev')}`,
          mode: 'sandbox' as const,
          note: 'Queued for operator verification while official NADRA channel is pending.',
          timestamp: new Date().toISOString(),
        }
      : await nadraProvider.verifyCnic({
          cnicNormalized: normalizedCnic,
          fullName: parsed.data.fullName,
          mobileNumber: normalizedMobile,
        });

  const now = new Date().toISOString();
  const userRecord: CustomerRecord = {
    id: generateId('usr'),
    fullName: parsed.data.fullName,
    cnicEncrypted: encryptCnic(normalizedCnic),
    cnicMasked: maskCnic(normalizedCnic),
    cnicHash,
    mobileNumber: normalizedMobile,
    villageId: village.id,
    villageName: village.name,
    passwordHash,
    resetToken: null,
    resetTokenExpiresAt: null,
    verificationStatus: nadraResult.status,
    verificationTimestamp: nadraResult.timestamp,
    verificationProviderRef: nadraResult.providerRef,
    verificationMode: nadraResult.mode,
    verificationNote: nadraResult.note,
    consentAccepted: true,
    consentTimestamp: now,
    accountStatus: 'Active',
    createdAt: now,
    updatedAt: now,
  };

  await mutateDb((db) => {
    db.users.unshift(userRecord);
    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId: userRecord.id,
      actorRole: 'Customer',
      action: 'CUSTOMER_REGISTERED',
      resourceType: 'Customer',
      resourceId: userRecord.id,
      metadata: {
        villageId: village.id,
        verificationStatus: userRecord.verificationStatus,
        verificationMode: nadraResult.mode,
      },
      timestamp: now,
    });
  });

  const token = signAuthToken({ sub: userRecord.id, kind: 'customer' });
  res.status(201).json({
    token,
    user: sanitizeCustomer(userRecord, village.name),
    verificationResult: nadraResult,
  });
});

const loginSchema = z.object({
  mobileNumber: z.string().trim().min(10),
  password: z.string().min(1),
});

authRoutes.post('/login', authRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Mobile number and password are required.' });
  }
  const mobile = normalizeMobileNumber(parsed.data.mobileNumber);
  const db = await readDb();
  const user = db.users.find((u) => u.mobileNumber === mobile);
  if (!user) {
    return res.status(401).json({ error: 'Invalid mobile number or password.' });
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid mobile number or password.' });
  }

  const village = db.villages.find((v) => v.id === user.villageId);
  const token = signAuthToken({ sub: user.id, kind: 'customer' });
  res.json({
    token,
    user: sanitizeCustomer(user, village?.name),
  });
});

authRoutes.post('/forgot-password', authRateLimiter, async (req, res) => {
  const mobile = normalizeMobileNumber(String(req.body?.mobileNumber || ''));
  if (!isValidPakistanMobile(mobile)) {
    return res.status(400).json({ error: 'Enter a valid mobile number (03XXXXXXXXX).' });
  }

  const resetCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const found = await mutateDb((db) => {
    const user = db.users.find((u) => u.mobileNumber === mobile);
    if (!user) return false;
    user.resetToken = resetCode;
    user.resetTokenExpiresAt = expiresAt;
    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId: user.id,
      actorRole: 'Customer',
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'Customer',
      resourceId: user.id,
      metadata: { deliveryMode: 'sandbox_preview' },
      timestamp: new Date().toISOString(),
    });
    return true;
  });

  res.json({
    message:
      'If an account matches this mobile number, a reset code has been generated. (SMS gateway integration pending — sandbox preview code shown below when matched.)',
    sandboxResetCode: found ? resetCode : null,
  });
});

const resetSchema = z.object({
  mobileNumber: z.string().trim(),
  resetCode: z.string().trim().length(6),
  newPassword: z.string().min(8).max(100),
});

authRoutes.post('/reset-password', authRateLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Valid mobile number, 6-digit code, and new password (min 8 chars) required.' });
  }
  const mobile = normalizeMobileNumber(parsed.data.mobileNumber);
  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);

  const ok = await mutateDb((db) => {
    const user = db.users.find((u) => u.mobileNumber === mobile);
    if (
      !user ||
      !user.resetToken ||
      user.resetToken !== parsed.data.resetCode ||
      !user.resetTokenExpiresAt ||
      new Date(user.resetTokenExpiresAt).getTime() < Date.now()
    ) {
      return false;
    }
    user.passwordHash = newHash;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.updatedAt = new Date().toISOString();
    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId: user.id,
      actorRole: 'Customer',
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'Customer',
      resourceId: user.id,
      metadata: {},
      timestamp: user.updatedAt,
    });
    return true;
  });

  if (!ok) {
    return res.status(400).json({ error: 'Invalid or expired password reset code.' });
  }
  res.json({ message: 'Password updated successfully. You may now log in.' });
});

authRoutes.post('/admin/login', authRateLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Operator email and password are required.' });
  }

  const db = await readDb();
  const admin = db.admins.find((a) => a.email.toLowerCase() === email);
  if (!admin || admin.accountStatus !== 'Active') {
    return res.status(401).json({ error: 'Invalid operator credentials or inactive account.' });
  }
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid operator credentials.' });
  }

  await mutateDb((draft) => {
    draft.auditLogs.unshift({
      id: generateId('aud'),
      actorId: admin.id,
      actorRole: admin.role,
      action: 'ADMIN_LOGIN',
      resourceType: 'AdminUser',
      resourceId: admin.id,
      metadata: {},
      timestamp: new Date().toISOString(),
    });
  });

  const token = signAuthToken({
    sub: admin.id,
    kind: 'admin',
    role: admin.role,
  });
  res.json({ token, admin: sanitizeAdmin(admin) });
});
