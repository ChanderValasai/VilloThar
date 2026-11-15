import { Router } from 'express';
import { z } from 'zod';
import { networkController, nadraProvider } from '../integrations/interfaces.ts';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.ts';
import {
  mutateDb,
  readDb,
  sanitizeAdmin,
  sanitizeCustomer,
  toggleSandboxDemoData,
} from '../models/database.ts';
import {
  activateSubscriptionAndAuthorizeDevice,
  evaluateDeviceNetworkAuthorization,
  expireOutdatedSubscriptions,
} from '../services/networkAuthService.ts';
import { decryptCnic, generateId } from '../utils/crypto.ts';

export const adminRoutes = Router();

adminRoutes.use(requireAdmin());

adminRoutes.get('/overview', async (req: AuthenticatedRequest, res) => {
  const db = await mutateDb((draft) => {
    expireOutdatedSubscriptions(draft);
    return draft;
  });

  const admin = db.admins.find((a) => a.id === req.auth!.sub);
  const totalCustomers = db.users.length;
  const verifiedCustomers = db.users.filter((u) => u.verificationStatus === 'Verified').length;
  const pendingVerifications = db.users.filter(
    (u) =>
      u.verificationStatus === 'Pending Verification' ||
      u.verificationStatus === 'Requires Manual Review',
  ).length;
  const activeDevices = db.devices.filter((d) => d.deviceStatus !== 'Removed');
  const authorizedDevices = activeDevices.filter(
    (d) => d.networkAuthorizationStatus === 'Authorized',
  ).length;
  const activeSubscriptions = db.subscriptions.filter((s) => s.status === 'Active').length;
  const expiredSubscriptions = db.subscriptions.filter((s) => s.status === 'Expired').length;
  const pendingPayments = db.payments.filter(
    (p) => p.status === 'Pending' || p.status === 'Requires Review',
  ).length;
  const successfulPayments = db.payments.filter((p) => p.status === 'Successful').length;
  const openTickets = db.tickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress',
  ).length;

  res.json({
    admin: admin ? sanitizeAdmin(admin) : null,
    sandboxDemoMode: db.siteConfig.sandboxDemoMode,
    metrics: {
      totalCustomers,
      verifiedCustomers,
      pendingVerifications,
      totalDevices: activeDevices.length,
      authorizedDevices,
      activeSubscriptions,
      expiredSubscriptions,
      pendingPayments,
      successfulPayments,
      openTickets,
    },
    integrations: {
      nadraMode: nadraProvider.mode,
      networkHardware: networkController.getHardwareStatus(),
      networkIntegrationMode: db.siteConfig.networkIntegrationMode,
    },
  });
});

adminRoutes.post(
  '/sandbox-demo',
  requireAdmin(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    const enable = Boolean(req.body?.enable);
    const db = await toggleSandboxDemoData(enable, req.auth!.sub, req.auth!.role || 'Super Admin');
    res.json({
      sandboxDemoMode: db.siteConfig.sandboxDemoMode,
      message: enable
        ? 'Sandbox Demo Mode enabled with clearly labelled [Demo] records.'
        : 'Sandbox Demo Mode disabled and reset to clean baseline.',
    });
  },
);

adminRoutes.get('/customers', async (_req, res) => {
  const db = await readDb();
  const customers = db.users.map((u) => {
    const village = db.villages.find((v) => v.id === u.villageId);
    const devices = db.devices.filter((d) => d.userId === u.id && d.deviceStatus !== 'Removed');
    const subscriptions = db.subscriptions.filter((s) => s.userId === u.id);
    return {
      ...sanitizeCustomer(u, village?.name),
      deviceCount: devices.length,
      devices,
      subscriptions,
    };
  });
  res.json({ customers });
});

/**
 * Restricted Super Admin endpoint to inspect full decrypted CNIC.
 * Strictly writes an entry to AuditLog for every access.
 */
adminRoutes.get(
  '/customers/:id/cnic',
  requireAdmin(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    const result = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.params.id);
      if (!user) return null;
      const fullCnic = decryptCnic(user.cnicEncrypted);
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Super Admin',
        action: 'SENSITIVE_CNIC_REVEALED',
        resourceType: 'Customer',
        resourceId: user.id,
        metadata: { cnicMasked: user.cnicMasked },
        timestamp: new Date().toISOString(),
      });
      return { cnic: fullCnic };
    });

    if (!result) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json(result);
  },
);

adminRoutes.patch(
  '/customers/:id/verification',
  requireAdmin(['Super Admin', 'Support Agent']),
  async (req: AuthenticatedRequest, res) => {
    const status = req.body?.status;
    const note = String(req.body?.note || '').trim();
    if (
      status !== 'Verified' &&
      status !== 'Verification Failed' &&
      status !== 'Requires Manual Review'
    ) {
      return res.status(400).json({ error: 'Invalid verification decision.' });
    }

    const updated = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.params.id);
      if (!user) return null;
      const now = new Date().toISOString();
      user.verificationStatus = status;
      user.verificationTimestamp = now;
      user.verificationProviderRef = `OP-REVIEW-${generateId('rev')}`;
      user.verificationMode = 'manual';
      user.verificationNote = note || `Reviewed by ${req.auth!.role}.`;
      user.updatedAt = now;

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Admin',
        action: 'CUSTOMER_VERIFICATION_UPDATED',
        resourceType: 'Customer',
        resourceId: user.id,
        metadata: { status, note: user.verificationNote },
        timestamp: now,
      });

      const village = db.villages.find((v) => v.id === user.villageId);
      return sanitizeCustomer(user, village?.name);
    });

    if (!updated) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json({ customer: updated });
  },
);

adminRoutes.patch(
  '/customers/:id/status',
  requireAdmin(['Super Admin', 'Support Agent']),
  async (req: AuthenticatedRequest, res) => {
    const accountStatus = req.body?.accountStatus === 'Suspended' ? 'Suspended' : 'Active';
    const updated = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.params.id);
      if (!user) return null;
      user.accountStatus = accountStatus;
      user.updatedAt = new Date().toISOString();
      if (accountStatus === 'Suspended') {
        for (const d of db.devices.filter((dev) => dev.userId === user.id)) {
          d.networkAuthorizationStatus = 'Suspended';
        }
      }
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Admin',
        action: 'CUSTOMER_ACCOUNT_STATUS_CHANGED',
        resourceType: 'Customer',
        resourceId: user.id,
        metadata: { accountStatus },
        timestamp: user.updatedAt,
      });
      return sanitizeCustomer(user);
    });
    if (!updated) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ customer: updated });
  },
);

adminRoutes.get('/devices', async (_req, res) => {
  const db = await readDb();
  const devices = db.devices.map((d) => {
    const owner = db.users.find((u) => u.id === d.userId);
    const sub = d.activeSubscriptionId
      ? db.subscriptions.find((s) => s.id === d.activeSubscriptionId) || null
      : null;
    const sessions = db.sessions.filter((s) => s.deviceId === d.id).slice(0, 10);
    const eligibility = evaluateDeviceNetworkAuthorization(db, d);
    return {
      ...d,
      ownerName: owner?.fullName || 'Unknown',
      ownerMobile: owner?.mobileNumber || '',
      ownerVerificationStatus: owner?.verificationStatus || 'Not Submitted',
      activeSubscription: sub,
      recentSessions: sessions,
      eligibility,
    };
  });
  res.json({ devices });
});

adminRoutes.patch(
  '/devices/:id/status',
  requireAdmin(['Super Admin', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const deviceStatus = req.body?.deviceStatus;
    const macAssociationStatus = req.body?.macAssociationStatus;

    const updated = await mutateDb(async (db) => {
      const device = db.devices.find((d) => d.id === req.params.id);
      if (!device) return null;

      if (deviceStatus === 'Active' || deviceStatus === 'Suspended') {
        device.deviceStatus = deviceStatus;
        if (deviceStatus === 'Suspended') {
          device.networkAuthorizationStatus = 'Suspended';
          await networkController.deauthorizeDevice({
            macAddress: device.macAddress,
            deviceId: device.id,
            sandboxMode: db.siteConfig.networkIntegrationMode === 'sandbox_adapter',
          });
        }
      }

      if (
        macAssociationStatus === 'Gateway Associated' ||
        macAssociationStatus === 'Pending Gateway' ||
        macAssociationStatus === 'Suspended'
      ) {
        device.macAssociationStatus = macAssociationStatus;
      }

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Admin',
        action: 'DEVICE_ADMIN_UPDATED',
        resourceType: 'RegisteredDevice',
        resourceId: device.id,
        metadata: {
          deviceStatus: device.deviceStatus,
          macAssociationStatus: device.macAssociationStatus,
        },
        timestamp: new Date().toISOString(),
      });

      return device;
    });

    if (!updated) return res.status(404).json({ error: 'Device not found.' });
    res.json({ device: updated });
  },
);

adminRoutes.post(
  '/devices/:id/evaluate-auth',
  requireAdmin(['Super Admin', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const result = await mutateDb(async (db) => {
      const device = db.devices.find((d) => d.id === req.params.id);
      if (!device) return null;
      const report = evaluateDeviceNetworkAuthorization(db, device);
      if (report.eligible && device.activeSubscriptionId) {
        const sub = db.subscriptions.find((s) => s.id === device.activeSubscriptionId);
        const payment = sub ? db.payments.find((p) => p.id === sub.paymentId) : undefined;
        const pkg = sub ? db.packages.find((p) => p.id === sub.packageId) : undefined;
        if (sub && payment && pkg) {
          const dispatch = await networkController.authorizeDevice({
            macAddress: device.macAddress,
            deviceId: device.id,
            speedMbps: pkg.speedMbps,
            expiryDate: sub.expiryDate || new Date().toISOString(),
            sandboxMode: db.siteConfig.networkIntegrationMode === 'sandbox_adapter',
          });
          device.networkAuthorizationStatus = dispatch.authorizationStatus;
          sub.networkAuthStatus = dispatch.authorizationStatus;
        }
      } else {
        device.networkAuthorizationStatus = 'Unauthorized';
      }
      return { device, report };
    });

    if (!result) return res.status(404).json({ error: 'Device not found.' });
    res.json(result);
  },
);

adminRoutes.get('/packages', async (_req, res) => {
  const db = await readDb();
  const packages = db.packages.map((pkg) => {
    const subs = db.subscriptions.filter((s) => s.packageId === pkg.id);
    return {
      ...pkg,
      totalPurchases: subs.length,
      activeCount: subs.filter((s) => s.status === 'Active').length,
      expiredCount: subs.filter((s) => s.status === 'Expired').length,
    };
  });
  res.json({ packages });
});

const packageSchema = z.object({
  name: z.string().trim().min(2).max(40),
  pricePkr: z.number().positive(),
  speedMbps: z.number().positive(),
  validityDays: z.number().int().positive(),
  isActive: z.boolean(),
  description: z.string().trim().min(4).max(200),
  taxNote: z.string().trim().max(200).optional(),
});

adminRoutes.post(
  '/packages',
  requireAdmin(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    const parsed = packageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid package fields.' });
    }

    const pkg = await mutateDb((db) => {
      const created = {
        id: generateId('pkg'),
        ...parsed.data,
        taxNote:
          parsed.data.taxNote ||
          'Indicative price pending pilot confirmation. Applicable taxes may apply.',
        updatedAt: new Date().toISOString(),
      };
      db.packages.push(created);
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Super Admin',
        action: 'PACKAGE_CREATED',
        resourceType: 'Package',
        resourceId: created.id,
        metadata: { name: created.name, pricePkr: created.pricePkr },
        timestamp: created.updatedAt,
      });
      return created;
    });

    res.status(201).json({ package: pkg });
  },
);

adminRoutes.patch(
  '/packages/:id',
  requireAdmin(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    const updated = await mutateDb((db) => {
      const pkg = db.packages.find((p) => p.id === req.params.id);
      if (!pkg) return null;
      if (typeof req.body?.pricePkr === 'number' && req.body.pricePkr > 0) {
        pkg.pricePkr = req.body.pricePkr;
      }
      if (typeof req.body?.validityDays === 'number' && req.body.validityDays > 0) {
        pkg.validityDays = Math.floor(req.body.validityDays);
      }
      if (typeof req.body?.isActive === 'boolean') {
        pkg.isActive = req.body.isActive;
      }
      if (typeof req.body?.description === 'string' && req.body.description.trim()) {
        pkg.description = req.body.description.trim();
      }
      pkg.updatedAt = new Date().toISOString();
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Super Admin',
        action: 'PACKAGE_UPDATED',
        resourceType: 'Package',
        resourceId: pkg.id,
        metadata: { pricePkr: pkg.pricePkr, validityDays: pkg.validityDays, isActive: pkg.isActive },
        timestamp: pkg.updatedAt,
      });
      return pkg;
    });

    if (!updated) return res.status(404).json({ error: 'Package not found.' });
    res.json({ package: updated });
  },
);

adminRoutes.get('/payments', async (_req, res) => {
  const db = await readDb();
  const payments = db.payments.map((p) => {
    const user = db.users.find((u) => u.id === p.userId);
    const dev = db.devices.find((d) => d.id === p.deviceId);
    const pkg = db.packages.find((pk) => pk.id === p.packageId);
    return {
      ...p,
      customerName: user?.fullName || 'Unknown',
      customerMobile: user?.mobileNumber || '',
      deviceName: dev?.deviceName || 'Unknown Device',
      packageName: pkg?.name || '',
    };
  });
  res.json({ payments });
});

adminRoutes.patch(
  '/payments/:id/reconcile',
  requireAdmin(['Super Admin', 'Finance Reviewer']),
  async (req: AuthenticatedRequest, res) => {
    const newStatus = req.body?.status;
    const note = String(req.body?.note || '').trim();

    if (
      newStatus !== 'Successful' &&
      newStatus !== 'Failed' &&
      newStatus !== 'Refunded' &&
      newStatus !== 'Requires Review'
    ) {
      return res.status(400).json({ error: 'Invalid payment reconciliation status.' });
    }
    if (!note || note.length < 5) {
      return res.status(400).json({
        error: 'An audit reason (minimum 5 characters) is mandatory for manual payment reconciliation.',
      });
    }

    const result = await mutateDb(async (db) => {
      const payment = db.payments.find((p) => p.id === req.params.id);
      if (!payment) return { error: 'Payment record not found.', status: 404 as const };

      payment.status = newStatus;
      payment.reviewNote = note;

      const sub = db.subscriptions.find((s) => s.id === payment.subscriptionId);
      const pkg = db.packages.find((p) => p.id === payment.packageId);

      let activation = null;
      if (newStatus === 'Successful' && sub && pkg) {
        activation = await activateSubscriptionAndAuthorizeDevice(
          db,
          sub,
          payment,
          pkg,
          req.auth!.sub,
          req.auth!.role || 'Finance Reviewer',
        );
      } else if (sub && (newStatus === 'Failed' || newStatus === 'Refunded')) {
        sub.status = newStatus === 'Failed' ? 'Payment Failed' : 'Cancelled';
        sub.networkAuthStatus = 'Suspended';
      }

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Finance Reviewer',
        action: 'PAYMENT_MANUALLY_RECONCILED',
        resourceType: 'Payment',
        resourceId: payment.id,
        metadata: { status: newStatus, note },
        timestamp: new Date().toISOString(),
      });

      return { status: 200 as const, payment, activation };
    });

    if ('error' in result) return res.status(result.status).json({ error: result.error });
    res.json(result);
  },
);

adminRoutes.get('/villages', async (_req, res) => {
  const db = await readDb();
  const villages = db.villages.map((v) => ({
    ...v,
    customerCount: db.users.filter((u) => u.villageId === v.id).length,
    deviceCount: db.devices.filter((d) => {
      const owner = db.users.find((u) => u.id === d.userId);
      return owner?.villageId === v.id && d.deviceStatus !== 'Removed';
    }).length,
    equipmentCount: db.equipment.filter((eq) => eq.villageId === v.id).length,
  }));
  res.json({ villages });
});

const villageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  coverageStatus: z.enum([
    'Planned',
    'Under Development',
    'Pilot',
    'Active',
    'Temporarily Unavailable',
  ]),
  distanceFromNocKm: z.number().min(0).max(500),
  description: z.string().trim().min(5).max(300),
  isPubliclyVisible: z.boolean().optional(),
});

adminRoutes.post(
  '/villages',
  requireAdmin(['Super Admin', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const parsed = villageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid village details.' });
    }

    const village = await mutateDb((db) => {
      const now = new Date().toISOString();
      const created = {
        id: generateId('vil'),
        name: parsed.data.name,
        role: 'Coverage' as const,
        coverageStatus: parsed.data.coverageStatus,
        distanceFromNocKm: parsed.data.distanceFromNocKm,
        description: parsed.data.description,
        isPubliclyVisible: parsed.data.isPubliclyVisible ?? false,
        updatedAt: now,
      };
      db.villages.push(created);
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Admin',
        action: 'VILLAGE_ADDED',
        resourceType: 'Village',
        resourceId: created.id,
        metadata: { name: created.name, coverageStatus: created.coverageStatus },
        timestamp: now,
      });
      return created;
    });

    res.status(201).json({ village });
  },
);

adminRoutes.patch(
  '/villages/:id',
  requireAdmin(['Super Admin', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const updated = await mutateDb((db) => {
      const village = db.villages.find((v) => v.id === req.params.id);
      if (!village) return null;
      if (village.role !== 'NOC' && req.body?.coverageStatus) {
        village.coverageStatus = req.body.coverageStatus;
      }
      if (typeof req.body?.description === 'string' && req.body.description.trim()) {
        village.description = req.body.description.trim();
      }
      if (typeof req.body?.isPubliclyVisible === 'boolean') {
        village.isPubliclyVisible = req.body.isPubliclyVisible;
      }
      village.updatedAt = new Date().toISOString();
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Admin',
        action: 'VILLAGE_UPDATED',
        resourceType: 'Village',
        resourceId: village.id,
        metadata: { coverageStatus: village.coverageStatus },
        timestamp: village.updatedAt,
      });
      return village;
    });
    if (!updated) return res.status(404).json({ error: 'Village not found.' });
    res.json({ village: updated });
  },
);

adminRoutes.get('/network', async (_req, res) => {
  const db = await mutateDb((draft) => {
    expireOutdatedSubscriptions(draft);
    return draft;
  });

  res.json({
    hardwareStatus: networkController.getHardwareStatus(),
    networkIntegrationMode: db.siteConfig.networkIntegrationMode,
    equipment: db.equipment,
    sessions: db.sessions,
    villages: db.villages,
  });
});

adminRoutes.post(
  '/network/equipment/:id/maintenance',
  requireAdmin(['Super Admin', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const summary = String(req.body?.summary || '').trim();
    if (summary.length < 4) {
      return res.status(400).json({ error: 'Maintenance log summary is required.' });
    }
    const eq = await mutateDb((db) => {
      const item = db.equipment.find((e) => e.id === req.params.id);
      const admin = db.admins.find((a) => a.id === req.auth!.sub);
      if (!item) return null;
      const now = new Date().toISOString();
      item.maintenanceLogs.unshift({
        id: generateId('mnt'),
        summary,
        performedBy: admin?.name || req.auth!.sub,
        timestamp: now,
      });
      return item;
    });
    if (!eq) return res.status(404).json({ error: 'Equipment item not found.' });
    res.json({ equipment: eq });
  },
);

adminRoutes.post(
  '/network/sessions/:id/terminate',
  requireAdmin(['Super Admin', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const updated = await mutateDb(async (db) => {
      const session = db.sessions.find((s) => s.id === req.params.id);
      if (!session) return null;
      const now = new Date().toISOString();
      session.sessionStatus = 'Ended';
      session.sessionEnd = now;
      const dev = db.devices.find((d) => d.id === session.deviceId);
      if (dev) {
        dev.networkAuthorizationStatus = 'Unauthorized';
      }
      await networkController.deauthorizeDevice({
        macAddress: session.macAddress,
        deviceId: session.deviceId,
        sandboxMode: db.siteConfig.networkIntegrationMode === 'sandbox_adapter',
      });
      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Network Operator',
        action: 'NETWORK_SESSION_TERMINATED',
        resourceType: 'NetworkSession',
        resourceId: session.id,
        metadata: { deviceId: session.deviceId },
        timestamp: now,
      });
      return session;
    });
    if (!updated) return res.status(404).json({ error: 'Session not found.' });
    res.json({ session: updated });
  },
);

adminRoutes.get('/tickets', async (_req, res) => {
  const db = await readDb();
  res.json({ tickets: db.tickets, admins: db.admins.map(sanitizeAdmin) });
});

adminRoutes.patch(
  '/tickets/:id',
  requireAdmin(['Super Admin', 'Support Agent', 'Network Operator']),
  async (req: AuthenticatedRequest, res) => {
    const updated = await mutateDb((db) => {
      const ticket = db.tickets.find((t) => t.id === req.params.id);
      const actor = db.admins.find((a) => a.id === req.auth!.sub);
      if (!ticket || !actor) return null;
      const now = new Date().toISOString();

      if (req.body?.status) {
        ticket.status = req.body.status;
      }
      if (typeof req.body?.assignedAdminId === 'string') {
        const assignee = db.admins.find((a) => a.id === req.body.assignedAdminId);
        ticket.assignedAdminId = assignee?.id || null;
        ticket.assignedAdminName = assignee?.name || null;
      }
      if (typeof req.body?.replyMessage === 'string' && req.body.replyMessage.trim()) {
        ticket.replies.push({
          id: generateId('rep'),
          authorName: actor.name,
          authorRole: 'Admin',
          message: req.body.replyMessage.trim(),
          isInternalNote: Boolean(req.body.isInternalNote),
          timestamp: now,
        });
      }
      ticket.updatedAt = now;
      return ticket;
    });
    if (!updated) return res.status(404).json({ error: 'Ticket not found.' });
    res.json({ ticket: updated });
  },
);

adminRoutes.get('/site-config', async (_req, res) => {
  const db = await readDb();
  res.json({ siteConfig: db.siteConfig });
});

adminRoutes.patch(
  '/site-config',
  requireAdmin(['Super Admin']),
  async (req: AuthenticatedRequest, res) => {
    const updated = await mutateDb((db) => {
      const cfg = db.siteConfig;
      if (typeof req.body?.supportPhone === 'string') cfg.supportPhone = req.body.supportPhone.trim();
      if (typeof req.body?.supportEmail === 'string') cfg.supportEmail = req.body.supportEmail.trim();
      if (typeof req.body?.officeAddress === 'string') cfg.officeAddress = req.body.officeAddress.trim();
      if (typeof req.body?.supportHours === 'string') cfg.supportHours = req.body.supportHours.trim();
      if (typeof req.body?.socialNote === 'string') cfg.socialNote = req.body.socialNote.trim();
      if (
        req.body?.nadraPolicy === 'require_verified' ||
        req.body?.nadraPolicy === 'allow_manual_review_pilot'
      ) {
        cfg.nadraPolicy = req.body.nadraPolicy;
      }
      if (
        req.body?.nadraIntegrationMode === 'sandbox' ||
        req.body?.nadraIntegrationMode === 'authorized_disabled'
      ) {
        cfg.nadraIntegrationMode = req.body.nadraIntegrationMode;
      }
      if (
        req.body?.networkIntegrationMode === 'disconnected' ||
        req.body?.networkIntegrationMode === 'sandbox_adapter'
      ) {
        cfg.networkIntegrationMode = req.body.networkIntegrationMode;
      }
      if (Array.isArray(req.body?.paymentMethods)) {
        cfg.paymentMethods = req.body.paymentMethods;
      }
      cfg.updatedAt = new Date().toISOString();

      db.auditLogs.unshift({
        id: generateId('aud'),
        actorId: req.auth!.sub,
        actorRole: req.auth!.role || 'Super Admin',
        action: 'SITE_CONFIG_UPDATED',
        resourceType: 'SiteConfig',
        resourceId: 'global',
        metadata: {
          nadraPolicy: cfg.nadraPolicy,
          networkIntegrationMode: cfg.networkIntegrationMode,
        },
        timestamp: cfg.updatedAt,
      });
      return cfg;
    });
    res.json({ siteConfig: updated });
  },
);

adminRoutes.get('/audit-logs', async (_req, res) => {
  const db = await readDb();
  res.json({ auditLogs: db.auditLogs.slice(0, 200) });
});
