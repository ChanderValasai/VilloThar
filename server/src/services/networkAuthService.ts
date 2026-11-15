import {
  DatabaseSchema,
  CustomerRecord,
} from '../models/database.ts';
import {
  PackagePlan,
  PaymentRecord,
  RegisteredDevice,
  Subscription,
  Village,
} from '../../../src/types/domain.ts';
import { networkController } from '../integrations/interfaces.ts';
import { generateId } from '../utils/crypto.ts';

export interface EligibilityReport {
  eligible: boolean;
  reasons: string[];
  checks: {
    customerActive: boolean;
    identityVerified: boolean;
    deviceActive: boolean;
    macAssociated: boolean;
    villageCovered: boolean;
    hasValidSubscription: boolean;
    paymentVerified: boolean;
    notExpired: boolean;
  };
}

export function expireOutdatedSubscriptions(db: DatabaseSchema): number {
  const nowMs = Date.now();
  let expiredCount = 0;

  for (const sub of db.subscriptions) {
    if (sub.status === 'Active' && sub.expiryDate) {
      if (new Date(sub.expiryDate).getTime() <= nowMs) {
        sub.status = 'Expired';
        sub.networkAuthStatus = 'Unauthorized';
        expiredCount += 1;

        const device = db.devices.find((d) => d.id === sub.deviceId);
        if (device && device.activeSubscriptionId === sub.id) {
          device.networkAuthorizationStatus = 'Unauthorized';
        }

        for (const ses of db.sessions) {
          if (ses.deviceId === sub.deviceId && ses.sessionStatus === 'Active') {
            ses.sessionStatus = 'Ended';
            ses.sessionEnd = new Date().toISOString();
          }
        }
      }
    }
  }
  return expiredCount;
}

export function evaluateDevicePurchaseEligibility(
  db: DatabaseSchema,
  user: CustomerRecord,
  device: RegisteredDevice,
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (user.accountStatus !== 'Active') {
    reasons.push('Customer account is suspended.');
  }
  const policy = db.siteConfig.nadraPolicy;
  if (policy === 'require_verified' && user.verificationStatus !== 'Verified') {
    reasons.push(
      `Identity verification status is "${user.verificationStatus}". Verified identity is required before activation.`,
    );
  } else if (
    policy === 'allow_manual_review_pilot' &&
    user.verificationStatus !== 'Verified' &&
    user.verificationStatus !== 'Requires Manual Review'
  ) {
    reasons.push(
      `Identity verification status is "${user.verificationStatus}". Please submit valid CNIC verification first.`,
    );
  }
  if (device.deviceStatus !== 'Active') {
    reasons.push(`Device status is "${device.deviceStatus}".`);
  }
  if (device.macAssociationStatus !== 'Gateway Associated') {
    reasons.push(
      'Device MAC address must be associated through the captive portal gateway or operator verification before activation.',
    );
  }
  const village = db.villages.find((v) => v.id === user.villageId);
  if (!village || (village.coverageStatus !== 'Pilot' && village.coverageStatus !== 'Active')) {
    reasons.push(
      village
        ? `Village "${village.name}" currently has status "${village.coverageStatus}" and is not an active coverage zone.`
        : 'Selected village is not an active coverage zone.',
    );
  }
  return { eligible: reasons.length === 0, reasons };
}

export function evaluateDeviceNetworkAuthorization(
  db: DatabaseSchema,
  device: RegisteredDevice,
): EligibilityReport {
  expireOutdatedSubscriptions(db);

  const user = db.users.find((u) => u.id === device.userId);
  const village: Village | undefined = user
    ? db.villages.find((v) => v.id === user.villageId)
    : undefined;
  const sub: Subscription | undefined = device.activeSubscriptionId
    ? db.subscriptions.find((s) => s.id === device.activeSubscriptionId)
    : undefined;
  const payment: PaymentRecord | undefined = sub
    ? db.payments.find((p) => p.id === sub.paymentId)
    : undefined;

  const customerActive = Boolean(user && user.accountStatus === 'Active');
  const identityVerified = Boolean(
    user &&
      (user.verificationStatus === 'Verified' ||
        (db.siteConfig.nadraPolicy === 'allow_manual_review_pilot' &&
          user.verificationStatus === 'Requires Manual Review')),
  );
  const deviceActive = device.deviceStatus === 'Active';
  const macAssociated = device.macAssociationStatus === 'Gateway Associated';
  const villageCovered = Boolean(
    village &&
      village.role === 'Coverage' &&
      (village.coverageStatus === 'Pilot' || village.coverageStatus === 'Active'),
  );
  const hasValidSubscription = Boolean(
    sub &&
      sub.deviceId === device.id &&
      (sub.status === 'Active' || sub.status === 'Pending Activation'),
  );
  const paymentVerified = Boolean(payment && payment.status === 'Successful');
  const notExpired = Boolean(
    sub && sub.expiryDate && new Date(sub.expiryDate).getTime() > Date.now(),
  );

  const reasons: string[] = [];
  if (!customerActive) reasons.push('Customer account is inactive or suspended.');
  if (!identityVerified) reasons.push('Customer CNIC verification has not passed policy.');
  if (!deviceActive) reasons.push('Device is suspended or removed.');
  if (!macAssociated) reasons.push('MAC address is not associated via gateway.');
  if (!villageCovered) reasons.push('Customer village does not have active/pilot coverage.');
  if (!hasValidSubscription) reasons.push('Device does not have an active device-specific subscription.');
  if (!paymentVerified) reasons.push('Subscription payment is not verified.');
  if (!notExpired) reasons.push('Device subscription has expired.');

  return {
    eligible: reasons.length === 0,
    reasons,
    checks: {
      customerActive,
      identityVerified,
      deviceActive,
      macAssociated,
      villageCovered,
      hasValidSubscription,
      paymentVerified,
      notExpired,
    },
  };
}

export async function activateSubscriptionAndAuthorizeDevice(
  db: DatabaseSchema,
  subscription: Subscription,
  payment: PaymentRecord,
  pkg: PackagePlan,
  actorId: string,
  actorRole: string,
) {
  const device = db.devices.find((d) => d.id === subscription.deviceId);
  const user = db.users.find((u) => u.id === subscription.userId);
  if (!device || !user) {
    throw new Error('Linked customer or device record not found.');
  }

  const now = new Date();
  const activationDate = now.toISOString();
  const expiryDate = new Date(
    now.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  subscription.activationDate = activationDate;
  subscription.expiryDate = expiryDate;
  subscription.status = 'Pending Activation';
  device.activeSubscriptionId = subscription.id;

  const eligibility = evaluateDeviceNetworkAuthorization(db, device);
  if (!eligibility.eligible) {
    subscription.networkAuthStatus = 'Unauthorized';
    device.networkAuthorizationStatus = 'Unauthorized';
    return {
      activated: false,
      authorized: false,
      message: eligibility.reasons.join(' '),
      eligibility,
    };
  }

  const sandboxAdapter = db.siteConfig.networkIntegrationMode === 'sandbox_adapter';
  const dispatch = await networkController.authorizeDevice({
    macAddress: device.macAddress,
    deviceId: device.id,
    speedMbps: pkg.speedMbps,
    expiryDate,
    sandboxMode: sandboxAdapter,
  });

  subscription.status = 'Active';
  subscription.networkAuthStatus = dispatch.authorizationStatus;
  device.networkAuthorizationStatus = dispatch.authorizationStatus;
  if (dispatch.authorizationStatus === 'Authorized') {
    device.lastConnection = activationDate;
  }

  const villageEquipment =
    db.equipment.find((eq) => eq.villageId === user.villageId) || db.equipment[0];

  db.sessions.unshift({
    id: generateId('ses'),
    userId: user.id,
    deviceId: device.id,
    macAddress: device.macAddress,
    equipmentId: villageEquipment ? villageEquipment.id : 'eq_pabohar_ap1',
    villageId: user.villageId,
    sessionStart: activationDate,
    sessionEnd: null,
    sessionStatus: dispatch.sessionStatus,
    providerRef: dispatch.providerRef,
    isSandbox: dispatch.isSandbox,
    isDemo: Boolean(user.isDemo),
  });

  db.auditLogs.unshift({
    id: generateId('aud'),
    actorId,
    actorRole,
    action: 'SUBSCRIPTION_ACTIVATED_AND_AUTH_DISPATCHED',
    resourceType: 'Subscription',
    resourceId: subscription.id,
    metadata: {
      deviceId: device.id,
      packageId: pkg.id,
      paymentId: payment.id,
      authorizationStatus: dispatch.authorizationStatus,
      hardwareConnected: dispatch.hardwareConnected,
    },
    timestamp: activationDate,
  });

  return {
    activated: true,
    authorized: dispatch.authorizationStatus === 'Authorized',
    hardwareConnected: dispatch.hardwareConnected,
    isSandboxNetwork: dispatch.isSandbox,
    message: dispatch.message,
    eligibility,
  };
}
