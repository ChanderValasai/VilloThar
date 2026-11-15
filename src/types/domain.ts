export type VerificationStatus =
  | 'Not Submitted'
  | 'Pending Verification'
  | 'Verified'
  | 'Verification Failed'
  | 'Requires Manual Review';

export type AccountStatus = 'Active' | 'Suspended';

export type DeviceType = 'Mobile' | 'Laptop' | 'Tablet' | 'Other';

export type MacAssociationStatus =
  | 'Pending Gateway'
  | 'Gateway Associated'
  | 'Suspended'
  | 'Replaced';

export type NetworkAuthorizationStatus =
  | 'Unauthorized'
  | 'Authorization Requested'
  | 'Authorized'
  | 'Suspended';

export type DeviceStatus = 'Active' | 'Suspended' | 'Removed';

export type SubscriptionStatus =
  | 'Pending Payment'
  | 'Payment Failed'
  | 'Pending Activation'
  | 'Active'
  | 'Expired'
  | 'Suspended'
  | 'Cancelled';

export type PaymentStatus =
  | 'Pending'
  | 'Successful'
  | 'Failed'
  | 'Refunded'
  | 'Requires Review';

export type VillageCoverageStatus =
  | 'NOC Hub'
  | 'Planned'
  | 'Under Development'
  | 'Pilot'
  | 'Active'
  | 'Temporarily Unavailable';

export type AdminRole =
  | 'Super Admin'
  | 'Network Operator'
  | 'Support Agent'
  | 'Finance Reviewer';

export type TicketCategory =
  | 'Login Problem'
  | 'Payment Problem'
  | 'Package Expiry'
  | 'Device Registration'
  | 'Internet Connectivity'
  | 'Identity Verification'
  | 'Other';

export type TicketStatus = 'Open' | 'In Progress' | 'Waiting on Customer' | 'Resolved' | 'Closed';

export interface CustomerPublic {
  id: string;
  fullName: string;
  cnicMasked: string;
  mobileNumber: string;
  villageId: string;
  villageName?: string;
  verificationStatus: VerificationStatus;
  verificationTimestamp: string | null;
  verificationProviderRef: string | null;
  verificationMode: 'authorized' | 'sandbox' | 'manual' | null;
  verificationNote?: string;
  consentAccepted: boolean;
  consentTimestamp: string;
  accountStatus: AccountStatus;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MacChangeRecord {
  id: string;
  previousMac: string | null;
  newMac: string;
  changedBy: string;
  reason: string;
  timestamp: string;
}

export interface RegisteredDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: DeviceType;
  macAddress: string;
  macMasked: string;
  macAssociationStatus: MacAssociationStatus;
  macHistory: MacChangeRecord[];
  registrationDate: string;
  activeSubscriptionId: string | null;
  networkAuthorizationStatus: NetworkAuthorizationStatus;
  lastConnection: string | null;
  deviceStatus: DeviceStatus;
  isDemo?: boolean;
}

export interface PackagePlan {
  id: string;
  name: string;
  pricePkr: number;
  speedMbps: number;
  validityDays: number;
  isActive: boolean;
  description: string;
  taxNote: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  deviceId: string;
  packageId: string;
  packageName?: string;
  speedMbps?: number;
  paymentId: string;
  purchaseDate: string;
  activationDate: string | null;
  expiryDate: string | null;
  status: SubscriptionStatus;
  networkAuthStatus: NetworkAuthorizationStatus;
  isDemo?: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  providerType: 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'generic_test';
  enabled: boolean;
  isSandbox: boolean;
  instructions: string;
}

export interface PaymentRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  deviceId: string;
  subscriptionId: string;
  packageId: string;
  amountPkr: number;
  methodId: string;
  methodName: string;
  transactionReference: string;
  isSandbox: boolean;
  status: PaymentStatus;
  reviewNote?: string;
  timestamp: string;
  isDemo?: boolean;
}

export interface Village {
  id: string;
  name: string;
  role: 'NOC' | 'Coverage';
  coverageStatus: VillageCoverageStatus;
  distanceFromNocKm: number;
  description: string;
  isPubliclyVisible: boolean;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  summary: string;
  performedBy: string;
  timestamp: string;
}

export interface NetworkEquipment {
  id: string;
  villageId: string;
  name: string;
  equipmentType: 'NOC Core Router' | 'Backhaul Link' | 'Village Router' | 'Wi-Fi Access Point';
  modelPlaceholder: string;
  adapterType: 'router_api' | 'radius' | 'captive_gateway';
  connectionState: 'Disconnected (Hardware Pending)' | 'Sandbox Simulated' | 'Connected';
  notes: string;
  maintenanceLogs: MaintenanceRecord[];
}

export interface NetworkSession {
  id: string;
  userId: string;
  deviceId: string;
  macAddress: string;
  equipmentId: string;
  villageId: string;
  sessionStart: string;
  sessionEnd: string | null;
  sessionStatus: 'Authorization Requested' | 'Active' | 'Ended' | 'Denied';
  providerRef: string;
  isSandbox: boolean;
  isDemo?: boolean;
}

export interface TicketReply {
  id: string;
  authorName: string;
  authorRole: 'Customer' | 'Admin';
  message: string;
  isInternalNote: boolean;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string | null;
  contactName: string;
  contactMobile: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface AdminUserPublic {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, string | number | boolean | null>;
  timestamp: string;
}

export interface SiteConfig {
  supportPhone: string;
  supportEmail: string;
  officeAddress: string;
  supportHours: string;
  socialNote: string;
  nadraPolicy: 'require_verified' | 'allow_manual_review_pilot';
  nadraIntegrationMode: 'sandbox' | 'authorized_disabled';
  networkIntegrationMode: 'disconnected' | 'sandbox_adapter';
  sandboxDemoMode: boolean;
  paymentMethods: PaymentMethodConfig[];
  updatedAt: string;
}
