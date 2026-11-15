import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import {
  nadraProvider,
  networkController,
  paymentGateway,
} from '../integrations/interfaces.ts';
import {
  AuthenticatedRequest,
  requireCustomer,
  sensitiveActionLimiter,
} from '../middleware/auth.ts';
import { mutateDb, sanitizeCustomer } from '../models/database.ts';
import {
  activateSubscriptionAndAuthorizeDevice,
  evaluateDeviceNetworkAuthorization,
  evaluateDevicePurchaseEligibility,
  expireOutdatedSubscriptions,
} from '../services/networkAuthService.ts';
import {
  decryptCnic,
  generateId,
  isValidMacAddress,
  maskMacAddress,
  normalizeMacAddress,
} from '../utils/crypto.ts';

export const customerRoutes = Router();

customerRoutes.use(requireCustomer);

customerRoutes.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  const db = await mutateDb((draft) => {
    expireOutdatedSubscriptions(draft);
    return draft;
  });

  const user = db.users.find((u) => u.id === req.auth!.sub);
  if (!user) {
    return res.status(404).json({ error: 'Customer account not found.' });
  }

  const village = db.villages.find((v) => v.id === user.villageId);
  const devices = db.devices
    .filter((d) => d.userId === user.id && d.deviceStatus !== 'Removed')
    .map((device) => {
      const eligibility = evaluateDeviceNetworkAuthorization(db, device);
      const purchaseEligibility = evaluateDevicePurchaseEligibility(db, user, device);
      const activeSub = device.activeSubscriptionId
        ? db.subscriptions.find((s) => s.id === device.activeSubscriptionId) || null
        : null;
      return {
        ...device,
        activeSubscription: activeSub,
        networkEligibility: eligibility,
        purchaseEligibility,
      };
    });

  const subscriptions = db.subscriptions.filter((s) => s.userId === user.id);
  const payments = db.payments.filter((p) => p.userId === user.id);
  const tickets = db.tickets.filter((t) => t.userId === user.id);
  const packages = db.packages.filter((p) => p.isActive);
  const paymentMethods = db.siteConfig.paymentMethods.filter((m) => m.enabled);
  const coverageVillages = db.villages.filter((v) => v.role === 'Coverage');

  res.json({
    user: sanitizeCustomer(user, village?.name),
    village: village || null,
    devices,
    subscriptions,
    payments,
    tickets,
    packages,
    paymentMethods,
    coverageVillages,
    integrations: {
      nadraMode: nadraProvider.mode,
      nadraPolicy: db.siteConfig.nadraPolicy,
      networkHardware: networkController.getHardwareStatus(),
      networkIntegrationMode: db.siteConfig.networkIntegrationMode,
    },
  });
});

customerRoutes.post(
  '/verification/resubmit',
  sensitiveActionLimiter,
  async (req: AuthenticatedRequest, res) => {
    const requestManual = Boolean(req.body?.requestManualReview);

    const dbRead = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.auth!.sub);
      if (!user) return { error: 'Customer not found.', status: 404 as const };
      return { user, mode: db.siteConfig.nadraIntegrationMode };
    });

    if ('error' in dbRead || !dbRead.user) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const plainCnic = decryptCnic(dbRead.user.cnicEncrypted);
    const result =
      requestManual || dbRead.mode === 'authorized_disabled'
        ? {
            status: 'Requires Manual Review' as const,
            providerRef: `MANUAL-REQ-${generateId('rev')}`,
            mode: 'sandbox' as const,
            note: 'Manual verification review requested by customer.',
            timestamp: new Date().toISOString(),
          }
        : await nadraProvider.verifyCnic({
            cnicNormalized: plainCnic,
            fullName: dbRead.user.fullName,
            mobileNumber: dbRead.user.mobileNumber,
          });

    const updated = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.auth!.sub)!;
      user.verificationStatus = result.status;
      user.verificationTimestamp = result.timestamp;
      user.verificationProviderRef = result.providerRef;
      user.verificationMode = requestManual ? 'manual' : result.mode;
      user.verificationNote = result.note;
      user.updatedAt = result.timestamp;

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: user.id,
        actorRole: 'Customer',
        action: 'CNIC_VERIFICATION_RESUBMITTED',
        resourceType: 'Customer',
        resourceId: user.id,
        metadata: { status: result.status, mode: user.verificationMode },
        timestamp: result.timestamp,
      });

      const village = db.villages.find((v) => v.id === user.villageId);
      return sanitizeCustomer(user, village?.name);
    });

    res.json({ user: updated, verificationResult: result });
  },
);

const registerDeviceSchema = z.object({
  deviceName: z.string().trim().min(2).max(80),
  deviceType: z.enum(['Mobile', 'Laptop', 'Tablet', 'Other']),
  macAddress: z.string().trim(),
  associationSource: z
    .enum(['gateway_redirect', 'gateway_simulation', 'manual_pending'])
    .optional(),
});

customerRoutes.post(
  '/devices',
  sensitiveActionLimiter,
  async (req: AuthenticatedRequest, res) => {
    const parsed = registerDeviceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid device registration fields.',
      });
    }

    if (!isValidMacAddress(parsed.data.macAddress)) {
      return res.status(400).json({
        error: 'Invalid MAC address format. Expected 6 hex pairs such as A4:5E:60:C1:88:12.',
      });
    }

    const mac = normalizeMacAddress(parsed.data.macAddress);
    const associationSource = parsed.data.associationSource || 'manual_pending';

    const outcome = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.auth!.sub);
      if (!user) {
        return { error: 'Customer not found.', status: 404 as const };
      }

      const duplicate = db.devices.find(
        (d) => d.macAddress === mac && d.deviceStatus !== 'Removed',
      );
      if (duplicate) {
        return {
          error:
            duplicate.userId === user.id
              ? 'This MAC address is already registered under your account.'
              : 'This MAC address is already associated with another registered device.',
          status: 409 as const,
        };
      }

      const now = new Date().toISOString();
      const macAssociationStatus =
        associationSource === 'gateway_redirect' || associationSource === 'gateway_simulation'
          ? ('Gateway Associated' as const)
          : ('Pending Gateway' as const);

      const newDevice = {
        id: generateId('dev'),
        userId: user.id,
        deviceName: parsed.data.deviceName,
        deviceType: parsed.data.deviceType,
        macAddress: mac,
        macMasked: maskMacAddress(mac),
        macAssociationStatus,
        macHistory: [
          {
            id: generateId('mac'),
            previousMac: null,
            newMac: mac,
            changedBy: user.id,
            reason:
              associationSource === 'gateway_redirect'
                ? 'Registered via Captive Gateway redirect'
                : associationSource === 'gateway_simulation'
                  ? 'Registered via Captive Gateway simulation'
                  : 'Submitted by customer (awaiting gateway/operator MAC association)',
            timestamp: now,
          },
        ],
        registrationDate: now,
        activeSubscriptionId: null,
        networkAuthorizationStatus: 'Unauthorized' as const,
        lastConnection: null,
        deviceStatus: 'Active' as const,
      };

      db.devices.unshift(newDevice);
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: user.id,
        actorRole: 'Customer',
        action: 'DEVICE_REGISTERED',
        resourceType: 'RegisteredDevice',
        resourceId: newDevice.id,
        metadata: {
          deviceType: newDevice.deviceType,
          macMasked: newDevice.macMasked,
          macAssociationStatus,
        },
        timestamp: now,
      });

      return { status: 201 as const, device: newDevice };
    });

    if ('error' in outcome) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json({ device: outcome.device });
  },
);

customerRoutes.patch(
  '/devices/:deviceId/mac',
  sensitiveActionLimiter,
  async (req: AuthenticatedRequest, res) => {
    const newMacRaw = String(req.body?.macAddress || '');
    const reason = String(req.body?.reason || 'Device MAC replacement / private Wi-Fi address update').slice(
      0,
      160,
    );
    const associateNow = Boolean(req.body?.associateViaGateway);

    if (!isValidMacAddress(newMacRaw)) {
      return res.status(400).json({ error: 'Invalid MAC address format.' });
    }
    const newMac = normalizeMacAddress(newMacRaw);

    const outcome = await mutateDb((db) => {
      const device = db.devices.find(
        (d) =>
          d.id === req.params.deviceId &&
          d.userId === req.auth!.sub &&
          d.deviceStatus !== 'Removed',
      );
      if (!device) {
        return { error: 'Device not found.', status: 404 as const };
      }

      const duplicate = db.devices.find(
        (d) => d.macAddress === newMac && d.deviceStatus !== 'Removed' && d.id !== device.id,
      );
      if (duplicate) {
        return { error: 'MAC address already belongs to another device.', status: 409 as const };
      }

      const now = new Date().toISOString();
      const prevMac = device.macAddress;
      device.macAddress = newMac;
      device.macMasked = maskMacAddress(newMac);
      device.macAssociationStatus = associateNow ? 'Gateway Associated' : 'Pending Gateway';
      device.networkAuthorizationStatus = 'Unauthorized';
      device.macHistory.unshift({
        id: generateId('mac'),
        previousMac: prevMac,
        newMac,
        changedBy: req.auth!.sub,
        reason,
        timestamp: now,
      });

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: 'Customer',
        action: 'DEVICE_MAC_UPDATED',
        resourceType: 'RegisteredDevice',
        resourceId: device.id,
        metadata: {
          previousMacMasked: maskMacAddress(prevMac),
          newMacMasked: device.macMasked,
          reason,
        },
        timestamp: now,
      });

      return { status: 200 as const, device };
    });

    if ('error' in outcome) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json({ device: outcome.device });
  },
);

customerRoutes.delete('/devices/:deviceId', async (req: AuthenticatedRequest, res) => {
  const outcome = await mutateDb(async (db) => {
    const device = db.devices.find(
      (d) =>
        d.id === req.params.deviceId &&
        d.userId === req.auth!.sub &&
        d.deviceStatus !== 'Removed',
    );
    if (!device) {
      return { error: 'Device not found.', status: 404 as const };
    }

    const now = new Date().toISOString();
    device.deviceStatus = 'Removed';
    device.networkAuthorizationStatus = 'Suspended';
    device.macAssociationStatus = 'Replaced';

    if (device.activeSubscriptionId) {
      const sub = db.subscriptions.find((s) => s.id === device.activeSubscriptionId);
      if (sub && sub.status === 'Active') {
        sub.status = 'Cancelled';
        sub.networkAuthStatus = 'Suspended';
      }
    }

    await networkController.deauthorizeDevice({
      macAddress: device.macAddress,
      deviceId: device.id,
      sandboxMode: db.siteConfig.networkIntegrationMode === 'sandbox_adapter',
    });

    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId: req.auth!.sub,
      actorRole: 'Customer',
      action: 'DEVICE_REMOVED',
      resourceType: 'RegisteredDevice',
      resourceId: device.id,
      metadata: { macMasked: device.macMasked },
      timestamp: now,
    });

    return { status: 200 as const };
  });

  if ('error' in outcome) {
    return res.status(outcome.status).json({ error: outcome.error });
  }
  res.json({ message: 'Device removed and network authorization revoked.' });
});

const purchaseSchema = z.object({
  deviceId: z.string().min(1),
  packageId: z.string().min(1),
  methodId: z.string().min(1),
  idempotencyKey: z.string().min(6).max(80),
  sandboxOutcome: z.enum(['success', 'pending', 'failed']).optional(),
});

customerRoutes.post(
  '/purchases',
  sensitiveActionLimiter,
  async (req: AuthenticatedRequest, res) => {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid purchase request parameters.' });
    }

    const outcome = await mutateDb(async (db) => {
      const existingByIdem = db.payments.find(
        (p) =>
          p.idempotencyKey === parsed.data.idempotencyKey &&
          p.userId === req.auth!.sub,
      );
      if (existingByIdem) {
        const sub = db.subscriptions.find((s) => s.id === existingByIdem.subscriptionId);
        return {
          status: 200 as const,
          duplicatePrevented: true,
          payment: existingByIdem,
          subscription: sub || null,
        };
      }

      const user = db.users.find((u) => u.id === req.auth!.sub);
      const device = db.devices.find(
        (d) =>
          d.id === parsed.data.deviceId &&
          d.userId === req.auth!.sub &&
          d.deviceStatus !== 'Removed',
      );
      const pkg = db.packages.find((p) => p.id === parsed.data.packageId && p.isActive);
      const method = db.siteConfig.paymentMethods.find(
        (m) => m.id === parsed.data.methodId && m.enabled,
      );

      if (!user || !device) {
        return { error: 'Registered device not found for your account.', status: 404 as const };
      }
      if (!pkg) {
        return { error: 'Selected internet package is unavailable.', status: 404 as const };
      }
      if (!method) {
        return { error: 'Selected payment method is not currently enabled.', status: 400 as const };
      }

      const eligibility = evaluateDevicePurchaseEligibility(db, user, device);
      if (!eligibility.eligible) {
        return {
          error: eligibility.reasons.join(' '),
          status: 403 as const,
        };
      }

      const gatewayInit = await paymentGateway.initiatePayment({
        methodId: method.id,
        providerType: method.providerType,
        amountPkr: pkg.pricePkr,
        customerMobile: user.mobileNumber,
        sandboxOutcome: parsed.data.sandboxOutcome,
      });

      const now = new Date().toISOString();
      const paymentId = generateId('pay');
      const subscriptionId = generateId('sub');

      const paymentRecord = {
        id: paymentId,
        idempotencyKey: parsed.data.idempotencyKey,
        userId: user.id,
        deviceId: device.id,
        subscriptionId,
        packageId: pkg.id,
        amountPkr: pkg.pricePkr,
        methodId: method.id,
        methodName: method.name,
        transactionReference: gatewayInit.transactionReference,
        isSandbox: gatewayInit.isSandbox,
        status: gatewayInit.status,
        timestamp: now,
      };

      const subscriptionRecord = {
        id: subscriptionId,
        userId: user.id,
        deviceId: device.id,
        packageId: pkg.id,
        packageName: pkg.name,
        speedMbps: pkg.speedMbps,
        paymentId,
        purchaseDate: now,
        activationDate: null,
        expiryDate: null,
        status:
          gatewayInit.status === 'Failed'
            ? ('Payment Failed' as const)
            : ('Pending Payment' as const),
        networkAuthStatus: 'Unauthorized' as const,
      };

      db.payments.unshift(paymentRecord);
      db.subscriptions.unshift(subscriptionRecord);
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: user.id,
        actorRole: 'Customer',
        action: 'PAYMENT_INITIATED',
        resourceType: 'Payment',
        resourceId: paymentId,
        metadata: {
          deviceId: device.id,
          packageId: pkg.id,
          amountPkr: pkg.pricePkr,
          isSandbox: gatewayInit.isSandbox,
          status: paymentRecord.status,
        },
        timestamp: now,
      });

      return {
        status: 201 as const,
        duplicatePrevented: false,
        payment: paymentRecord,
        subscription: subscriptionRecord,
        gatewayMessage: gatewayInit.gatewayMessage,
      };
    });

    if ('error' in outcome) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(outcome.status).json(outcome);
  },
);

customerRoutes.post(
  '/payments/:paymentId/webhook-simulate',
  sensitiveActionLimiter,
  async (req: AuthenticatedRequest, res) => {
    const requestedOutcome =
      req.body?.outcome === 'Failed' ? ('Failed' as const) : ('Successful' as const);

    const outcome = await mutateDb(async (db) => {
      const payment = db.payments.find(
        (p) => p.id === req.params.paymentId && p.userId === req.auth!.sub,
      );
      if (!payment) {
        return { error: 'Payment transaction not found.', status: 404 as const };
      }
      if (payment.status === 'Successful') {
        const sub = db.subscriptions.find((s) => s.id === payment.subscriptionId);
        return {
          status: 200 as const,
          alreadyProcessed: true,
          payment,
          subscription: sub || null,
          activation: null,
        };
      }

      const verification = await paymentGateway.verifyWebhookCallback({
        transactionReference: payment.transactionReference,
        outcome: requestedOutcome,
      });

      const sub = db.subscriptions.find((s) => s.id === payment.subscriptionId);
      const pkg = db.packages.find((p) => p.id === payment.packageId);
      if (!sub || !pkg) {
        return { error: 'Linked subscription or package missing.', status: 404 as const };
      }

      payment.status = verification.status;
      payment.reviewNote = verification.reason;
      payment.timestamp = new Date().toISOString();

      let activation = null;
      if (verification.verified && verification.status === 'Successful') {
        activation = await activateSubscriptionAndAuthorizeDevice(
          db,
          sub,
          payment,
          pkg,
          'payment_webhook',
          'PaymentGatewayWebhook',
        );
      } else {
        sub.status = verification.status === 'Failed' ? 'Payment Failed' : 'Pending Payment';
      }

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: 'payment_webhook',
        actorRole: 'PaymentGatewayWebhook',
        action: 'PAYMENT_WEBHOOK_VERIFIED',
        resourceType: 'Payment',
        resourceId: payment.id,
        metadata: {
          status: payment.status,
          verified: verification.verified,
          isSandbox: payment.isSandbox,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        status: 200 as const,
        alreadyProcessed: false,
        payment,
        subscription: sub,
        activation,
      };
    });

    if ('error' in outcome) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  },
);

const ticketSchema = z.object({
  category: z.enum([
    'Login Problem',
    'Payment Problem',
    'Package Expiry',
    'Device Registration',
    'Internet Connectivity',
    'Identity Verification',
    'Other',
  ]),
  subject: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(2000),
});

customerRoutes.post('/tickets', async (req: AuthenticatedRequest, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please complete subject and issue description.' });
  }

  const created = await mutateDb((db) => {
    const user = db.users.find((u) => u.id === req.auth!.sub);
    if (!user) return null;
    const now = new Date().toISOString();
    const ticket = {
      id: generateId('tkt'),
      userId: user.id,
      contactName: user.fullName,
      contactMobile: user.mobileNumber,
      category: parsed.data.category,
      subject: parsed.data.subject,
      description: parsed.data.description,
      status: 'Open' as const,
      assignedAdminId: null,
      assignedAdminName: null,
      replies: [],
      createdAt: now,
      updatedAt: now,
    };
    db.tickets.unshift(ticket);
    return ticket;
  });

  if (!created) {
    return res.status(404).json({ error: 'Customer not found.' });
  }
  res.status(201).json({ ticket: created });
});

customerRoutes.post('/tickets/:ticketId/reply', async (req: AuthenticatedRequest, res) => {
  const message = String(req.body?.message || '').trim();
  if (message.length < 2) {
    return res.status(400).json({ error: 'Reply message cannot be empty.' });
  }

  const updated = await mutateDb((db) => {
    const ticket = db.tickets.find(
      (t) => t.id === req.params.ticketId && t.userId === req.auth!.sub,
    );
    const user = db.users.find((u) => u.id === req.auth!.sub);
    if (!ticket || !user) return null;

    const now = new Date().toISOString();
    ticket.replies.push({
      id: generateId('rep'),
      authorName: user.fullName,
      authorRole: 'Customer',
      message,
      isInternalNote: false,
      timestamp: now,
    });
    ticket.updatedAt = now;
    if (ticket.status === 'Waiting on Customer') {
      ticket.status = 'Open';
    }
    return ticket;
  });

  if (!updated) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }
  res.json({ ticket: updated });
});

customerRoutes.patch('/profile', async (req: AuthenticatedRequest, res) => {
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  const outcome = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === req.auth!.sub);
    if (!user) return { error: 'Customer not found.', status: 404 as const };

    if (fullName && fullName.length >= 3) {
      user.fullName = fullName;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return { error: 'New password must be at least 8 characters.', status: 400 as const };
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return { error: 'Current password is incorrect.', status: 401 as const };
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    user.updatedAt = new Date().toISOString();
    const village = db.villages.find((v) => v.id === user.villageId);
    return { status: 200 as const, user: sanitizeCustomer(user, village?.name) };
  });

  if ('error' in outcome) {
    return res.status(outcome.status).json({ error: outcome.error });
  }
  res.json({ user: outcome.user });
});
