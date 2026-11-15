import { Router } from 'express';
import { readDb, mutateDb, sanitizeCustomer } from '../models/database.ts';
import { requireCustomer, AuthenticatedRequest } from '../middleware/auth.ts';
import { networkController } from '../integrations/interfaces.ts';
import {
  evaluateDeviceNetworkAuthorization,
  expireOutdatedSubscriptions,
} from '../services/networkAuthService.ts';
import { generateId, isValidMacAddress, maskMacAddress, normalizeMacAddress } from '../utils/crypto.ts';

export const captiveRoutes = Router();

/**
 * Reads gateway-provided MAC parameter (from router/RADIUS captive redirect).
 * Never pretends browser JS can read the hardware MAC directly.
 */
captiveRoutes.get('/session-context', async (req, res) => {
  const gatewayMacRaw = typeof req.query.mac === 'string' ? req.query.mac : '';
  const gatewayAp = typeof req.query.ap === 'string' ? req.query.ap : '';
  const hasGatewayMac = Boolean(gatewayMacRaw && isValidMacAddress(gatewayMacRaw));
  const normalizedMac = hasGatewayMac ? normalizeMacAddress(gatewayMacRaw) : null;

  const db = await mutateDb((draft) => {
    expireOutdatedSubscriptions(draft);
    return draft;
  });

  const packages = db.packages.filter((p) => p.isActive);
  const coverageVillages = db.villages.filter(
    (v) => v.role === 'Coverage' && (v.coverageStatus === 'Pilot' || v.coverageStatus === 'Active'),
  );
  const enabledPaymentMethods = db.siteConfig.paymentMethods.filter((m) => m.enabled);

  let recognizedDevice: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    macMasked: string;
    ownerName: string;
    verificationStatus: string;
    networkAuthorizationStatus: string;
    subscription: {
      id: string;
      packageName: string;
      speedMbps: number;
      status: string;
      expiryDate: string | null;
    } | null;
    eligibilityReasons: string[];
  } | null = null;

  if (normalizedMac) {
    const dev = db.devices.find(
      (d) => d.macAddress === normalizedMac && d.deviceStatus !== 'Removed',
    );
    if (dev) {
      const owner = db.users.find((u) => u.id === dev.userId);
      const sub = dev.activeSubscriptionId
        ? db.subscriptions.find((s) => s.id === dev.activeSubscriptionId)
        : undefined;
      const pkg = sub ? db.packages.find((p) => p.id === sub.packageId) : undefined;
      const report = evaluateDeviceNetworkAuthorization(db, dev);

      recognizedDevice = {
        deviceId: dev.id,
        deviceName: dev.deviceName,
        deviceType: dev.deviceType,
        macMasked: dev.macMasked,
        ownerName: owner?.fullName || 'Registered Customer',
        verificationStatus: owner?.verificationStatus || 'Not Submitted',
        networkAuthorizationStatus: dev.networkAuthorizationStatus,
        subscription: sub
          ? {
              id: sub.id,
              packageName: pkg?.name || sub.packageName || 'Package',
              speedMbps: pkg?.speedMbps || 2,
              status: sub.status,
              expiryDate: sub.expiryDate,
            }
          : null,
        eligibilityReasons: report.reasons,
      };
    }
  }

  res.json({
    gateway: {
      macProvidedByGateway: hasGatewayMac,
      gatewayMacMasked: normalizedMac ? maskMacAddress(normalizedMac) : null,
      gatewayMacNormalized: normalizedMac,
      accessPointId: gatewayAp || null,
      hardwareStatus: networkController.getHardwareStatus(),
      networkIntegrationMode: db.siteConfig.networkIntegrationMode,
    },
    recognizedDevice,
    packages,
    coverageVillages,
    paymentMethods: enabledPaymentMethods,
    contact: {
      supportPhone: db.siteConfig.supportPhone,
      supportEmail: db.siteConfig.supportEmail,
    },
  });
});

captiveRoutes.post('/associate-gateway-mac', requireCustomer, async (req: AuthenticatedRequest, res) => {
  const deviceId = String(req.body?.deviceId || '');
  const gatewayMacRaw = String(req.body?.macAddress || '');
  const source = req.body?.source === 'gateway_redirect' ? 'gateway_redirect' : 'gateway_simulation';

  if (!isValidMacAddress(gatewayMacRaw)) {
    return res.status(400).json({ error: 'Valid MAC address (XX:XX:XX:XX:XX:XX) is required.' });
  }
  const mac = normalizeMacAddress(gatewayMacRaw);

  const result = await mutateDb((db) => {
    const duplicate = db.devices.find(
      (d) => d.macAddress === mac && d.deviceStatus !== 'Removed' && d.id !== deviceId,
    );
    if (duplicate) {
      return { error: 'This MAC address is already registered to another device.', status: 409 as const };
    }

    const device = db.devices.find(
      (d) => d.id === deviceId && d.userId === req.auth!.sub && d.deviceStatus !== 'Removed',
    );
    if (!device) {
      return { error: 'Registered device not found for this account.', status: 404 as const };
    }

    const now = new Date().toISOString();
    const prev = device.macAddress;
    device.macAddress = mac;
    device.macMasked = maskMacAddress(mac);
    device.macAssociationStatus = 'Gateway Associated';
    device.macHistory.unshift({
      id: generateId('mac'),
      previousMac: prev === mac ? null : prev,
      newMac: mac,
      changedBy: req.auth!.sub,
      reason:
        source === 'gateway_redirect'
          ? 'Associated from Captive Portal gateway redirect'
          : 'Associated via Captive Portal Gateway Simulation adapter',
      timestamp: now,
    });

    const user = db.users.find((u) => u.id === req.auth!.sub);
    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId: req.auth!.sub,
      actorRole: 'Customer',
      action: 'CAPTIVE_MAC_ASSOCIATED',
      resourceType: 'RegisteredDevice',
      resourceId: device.id,
      metadata: { macMasked: device.macMasked, source },
      timestamp: now,
    });

    return {
      status: 200 as const,
      device,
      user: user ? sanitizeCustomer(user) : null,
    };
  });

  if ('error' in result) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json(result);
});
