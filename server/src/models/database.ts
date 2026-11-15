import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  AdminUserPublic,
  AuditLog,
  CustomerPublic,
  NetworkEquipment,
  NetworkSession,
  PackagePlan,
  PaymentRecord,
  RegisteredDevice,
  SiteConfig,
  Subscription,
  SupportTicket,
  VerificationStatus,
  Village,
} from '../../../src/types/domain.ts';
import { env } from '../config/env.ts';
import {
  encryptCnic,
  generateId,
  hashCnicForLookup,
  maskCnic,
  maskMacAddress,
} from '../utils/crypto.ts';

export interface CustomerRecord extends CustomerPublic {
  cnicEncrypted: string;
  cnicHash: string;
  passwordHash: string;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
}

export interface AdminUserRecord extends AdminUserPublic {
  passwordHash: string;
}

export interface DatabaseSchema {
  users: CustomerRecord[];
  devices: RegisteredDevice[];
  packages: PackagePlan[];
  subscriptions: Subscription[];
  payments: PaymentRecord[];
  sessions: NetworkSession[];
  tickets: SupportTicket[];
  villages: Village[];
  equipment: NetworkEquipment[];
  admins: AdminUserRecord[];
  auditLogs: AuditLog[];
  siteConfig: SiteConfig;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'villothar-db.json');

let writeQueue: Promise<void> = Promise.resolve();
let memoryCache: DatabaseSchema | null = null;

function createInitialBaseline(): DatabaseSchema {
  const now = new Date().toISOString();
  const adminPasswordHash = bcrypt.hashSync(env.adminBootstrap.password, 10);

  return {
    users: [],
    devices: [],
    packages: [
      {
        id: 'pkg_daily',
        name: 'Daily',
        pricePkr: 50,
        speedMbps: 2,
        validityDays: 1,
        isActive: true,
        description: '24-hour internet access for one registered device.',
        taxNote: 'Indicative price pending pilot confirmation. Applicable taxes may apply.',
        updatedAt: now,
      },
      {
        id: 'pkg_weekly',
        name: 'Weekly',
        pricePkr: 200,
        speedMbps: 2,
        validityDays: 7,
        isActive: true,
        description: '7-day internet access for one registered device.',
        taxNote: 'Indicative price pending pilot confirmation. Applicable taxes may apply.',
        updatedAt: now,
      },
      {
        id: 'pkg_biweekly',
        name: 'Biweekly',
        pricePkr: 350,
        speedMbps: 2,
        validityDays: 14,
        isActive: true,
        description: '14-day internet access for one registered device.',
        taxNote: 'Indicative price pending pilot confirmation. Applicable taxes may apply.',
        updatedAt: now,
      },
      {
        id: 'pkg_monthly',
        name: 'Monthly',
        pricePkr: 600,
        speedMbps: 2,
        validityDays: 30,
        isActive: true,
        description: '30-day internet access for one registered device.',
        taxNote: 'Indicative price pending pilot confirmation. Applicable taxes may apply.',
        updatedAt: now,
      },
    ],
    subscriptions: [],
    payments: [],
    sessions: [],
    tickets: [],
    villages: [
      {
        id: 'vil_mithi_noc',
        name: 'Mithi',
        role: 'NOC',
        coverageStatus: 'NOC Hub',
        distanceFromNocKm: 0,
        description:
          'Network Operations Centre (NOC) and primary regional uplink hub. Mithi is the operations hub and is not listed as an active customer Wi-Fi coverage village.',
        isPubliclyVisible: true,
        updatedAt: now,
      },
      {
        id: 'vil_pabohar',
        name: 'Pabohar',
        role: 'Coverage',
        coverageStatus: 'Pilot',
        distanceFromNocKm: 12,
        description:
          'First pilot coverage village located approximately 12 km from the Mithi NOC. Community Wi-Fi access points serve registered customer devices in the village.',
        isPubliclyVisible: true,
        updatedAt: now,
      },
    ],
    equipment: [
      {
        id: 'eq_mithi_core',
        villageId: 'vil_mithi_noc',
        name: 'Mithi NOC Core Gateway & Backhaul',
        equipmentType: 'NOC Core Router',
        modelPlaceholder: 'Configurable Router / RADIUS Core (Vendor Pending)',
        adapterType: 'router_api',
        connectionState: 'Disconnected (Hardware Pending)',
        notes: 'Primary hub linking upstream backhaul toward Pabohar (~12 km).',
        maintenanceLogs: [],
      },
      {
        id: 'eq_pabohar_ap1',
        villageId: 'vil_pabohar',
        name: 'Pabohar Community Relay & Wi-Fi AP-01',
        equipmentType: 'Wi-Fi Access Point',
        modelPlaceholder: 'Captive-Enabled Outdoor Wi-Fi AP (Vendor Pending)',
        adapterType: 'captive_gateway',
        connectionState: 'Disconnected (Hardware Pending)',
        notes: 'Broadcasts VilloThar SSID and redirects unauthenticated devices to the captive portal.',
        maintenanceLogs: [],
      },
    ],
    admins: [
      {
        id: 'adm_super_01',
        name: 'Mithi NOC Lead Operator',
        email: env.adminBootstrap.email,
        passwordHash: adminPasswordHash,
        role: 'Super Admin',
        permissions: ['*'],
        accountStatus: 'Active',
        createdAt: now,
      },
      {
        id: 'adm_net_01',
        name: 'Pabohar Network Technician',
        email: 'network@villothar.local',
        passwordHash: adminPasswordHash,
        role: 'Network Operator',
        permissions: [
          'devices:read',
          'devices:manage',
          'network:read',
          'network:manage',
          'villages:manage',
        ],
        accountStatus: 'Active',
        createdAt: now,
      },
      {
        id: 'adm_support_01',
        name: 'Community Support Coordinator',
        email: 'support@villothar.local',
        passwordHash: adminPasswordHash,
        role: 'Support Agent',
        permissions: [
          'customers:read',
          'customers:verify_review',
          'tickets:read',
          'tickets:manage',
        ],
        accountStatus: 'Active',
        createdAt: now,
      },
    ],
    auditLogs: [
      {
        id: generateId('aud'),
        actorId: 'system',
        actorRole: 'System',
        action: 'BASELINE_INITIALIZED',
        resourceType: 'System',
        resourceId: 'villothar',
        metadata: {
          note: 'Initialized clean baseline with 4 launch packages, Mithi NOC, and Pabohar Pilot.',
        },
        timestamp: now,
      },
    ],
    siteConfig: {
      supportPhone: '[Placeholder — Set Verified Local Helpline in Admin]',
      supportEmail: '[Placeholder — Set Official Support Email in Admin]',
      officeAddress: 'VilloThar NOC Desk, Mithi & Pabohar Community Point, Tharparkar, Sindh',
      supportHours: 'Saturday – Thursday · 09:00 AM – 06:00 PM (Placeholder)',
      socialNote: 'Official social channels will be published after pilot confirmation.',
      nadraPolicy: 'require_verified',
      nadraIntegrationMode: 'sandbox',
      networkIntegrationMode: 'disconnected',
      sandboxDemoMode: false,
      paymentMethods: [
        {
          id: 'pm_easypaisa_sandbox',
          name: 'Easypaisa Mobile Account (Sandbox Test)',
          providerType: 'easypaisa',
          enabled: true,
          isSandbox: true,
          instructions:
            'Test mode only. Simulates Easypaisa checkout and backend callback verification without transferring real funds.',
        },
        {
          id: 'pm_jazzcash_sandbox',
          name: 'JazzCash Mobile Wallet (Sandbox Test)',
          providerType: 'jazzcash',
          enabled: true,
          isSandbox: true,
          instructions:
            'Test mode only. Simulates JazzCash payment confirmation via backend webhook validation.',
        },
        {
          id: 'pm_bank_sandbox',
          name: 'Local Bank / Raast Reference (Sandbox Test)',
          providerType: 'bank_transfer',
          enabled: true,
          isSandbox: true,
          instructions:
            'Test mode only. Generates a pending payment record requiring backend verification or Finance Reviewer approval.',
        },
        {
          id: 'pm_generic_test',
          name: 'Generic Test Payment Simulator',
          providerType: 'generic_test',
          enabled: true,
          isSandbox: true,
          instructions:
            'Test mode only. Allows testing Immediate Success, Pending Review, or Failed Payment states.',
        },
      ],
      updatedAt: now,
    },
  };
}

async function ensureLoaded(): Promise<DatabaseSchema> {
  if (memoryCache) {
    return memoryCache;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    memoryCache = JSON.parse(raw) as DatabaseSchema;
  } catch {
    memoryCache = createInitialBaseline();
    await persistDb(memoryCache);
  }
  return memoryCache;
}

async function persistDb(db: DatabaseSchema): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DB_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tempFile, DB_FILE);
}

export async function readDb(): Promise<DatabaseSchema> {
  return ensureLoaded();
}

export async function mutateDb<T>(
  mutator: (db: DatabaseSchema) => T | Promise<T>,
): Promise<T> {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    const db = await ensureLoaded();
    result = await mutator(db);
    await persistDb(db);
  });
  await writeQueue;
  return result;
}

export function sanitizeCustomer(user: CustomerRecord, villageName?: string): CustomerPublic {
  return {
    id: user.id,
    fullName: user.fullName,
    cnicMasked: user.cnicMasked,
    mobileNumber: user.mobileNumber,
    villageId: user.villageId,
    villageName: villageName ?? user.villageName,
    verificationStatus: user.verificationStatus,
    verificationTimestamp: user.verificationTimestamp,
    verificationProviderRef: user.verificationProviderRef,
    verificationMode: user.verificationMode,
    verificationNote: user.verificationNote,
    consentAccepted: user.consentAccepted,
    consentTimestamp: user.consentTimestamp,
    accountStatus: user.accountStatus,
    isDemo: user.isDemo,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function sanitizeAdmin(admin: AdminUserRecord): AdminUserPublic {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
    accountStatus: admin.accountStatus,
    createdAt: admin.createdAt,
  };
}

export async function toggleSandboxDemoData(
  enable: boolean,
  actorId: string,
  actorRole: string,
): Promise<DatabaseSchema> {
  return mutateDb((db) => {
    // Always remove existing demo records first to keep clean idempotency
    db.users = db.users.filter((u) => !u.isDemo);
    db.devices = db.devices.filter((d) => !d.isDemo);
    db.subscriptions = db.subscriptions.filter((s) => !s.isDemo);
    db.payments = db.payments.filter((p) => !p.isDemo);
    db.sessions = db.sessions.filter((s) => !s.isDemo);
    db.tickets = db.tickets.filter((t) => !t.isDemo);

    const now = new Date();
    const isoNow = now.toISOString();
    const demoPassHash = bcrypt.hashSync('DemoUser@2026', 10);

    if (enable) {
      const c1Id = 'usr_demo_01';
      const c2Id = 'usr_demo_02';
      const c3Id = 'usr_demo_03';

      const cnic1 = '44301-1234567-1';
      const cnic2 = '44301-7654321-5';
      const cnic3 = '44301-9988776-9';

      const demoUsers: CustomerRecord[] = [
        {
          id: c1Id,
          fullName: 'Kheemchand Menghwar [Demo]',
          cnicEncrypted: encryptCnic(cnic1),
          cnicMasked: maskCnic(cnic1),
          cnicHash: hashCnicForLookup(cnic1),
          mobileNumber: '03001112233',
          villageId: 'vil_pabohar',
          villageName: 'Pabohar',
          passwordHash: demoPassHash,
          resetToken: null,
          resetTokenExpiresAt: null,
          verificationStatus: 'Verified' as VerificationStatus,
          verificationTimestamp: isoNow,
          verificationProviderRef: 'SANDBOX-NADRA-DEMO-01',
          verificationMode: 'sandbox',
          verificationNote: 'Sandbox Demo Record — Simulated verification for testing.',
          consentAccepted: true,
          consentTimestamp: isoNow,
          accountStatus: 'Active' as AccountStatus,
          isDemo: true,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
        {
          id: c2Id,
          fullName: 'Sita Bai Bheel [Demo]',
          cnicEncrypted: encryptCnic(cnic2),
          cnicMasked: maskCnic(cnic2),
          cnicHash: hashCnicForLookup(cnic2),
          mobileNumber: '03014445566',
          villageId: 'vil_pabohar',
          villageName: 'Pabohar',
          passwordHash: demoPassHash,
          resetToken: null,
          resetTokenExpiresAt: null,
          verificationStatus: 'Requires Manual Review' as VerificationStatus,
          verificationTimestamp: isoNow,
          verificationProviderRef: 'SANDBOX-NADRA-REV-02',
          verificationMode: 'sandbox',
          verificationNote: 'Awaiting operator review in Demo Mode.',
          consentAccepted: true,
          consentTimestamp: isoNow,
          accountStatus: 'Active' as AccountStatus,
          isDemo: true,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
        {
          id: c3Id,
          fullName: 'Gulab Rai Thakur [Demo]',
          cnicEncrypted: encryptCnic(cnic3),
          cnicMasked: maskCnic(cnic3),
          cnicHash: hashCnicForLookup(cnic3),
          mobileNumber: '03337778899',
          villageId: 'vil_pabohar',
          villageName: 'Pabohar',
          passwordHash: demoPassHash,
          resetToken: null,
          resetTokenExpiresAt: null,
          verificationStatus: 'Verification Failed' as VerificationStatus,
          verificationTimestamp: isoNow,
          verificationProviderRef: 'SANDBOX-NADRA-FAIL-03',
          verificationMode: 'sandbox',
          verificationNote: 'Simulated mismatch in Demo Mode.',
          consentAccepted: true,
          consentTimestamp: isoNow,
          accountStatus: 'Active' as AccountStatus,
          isDemo: true,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      ];

      const mac1 = 'A4:5E:60:C1:88:12';
      const mac2 = 'B8:27:EB:44:10:9A';
      const mac3 = '3C:5A:B4:19:02:7F';

      const sub1Id = 'sub_demo_01';
      const sub2Id = 'sub_demo_02';
      const pay1Id = 'pay_demo_01';
      const pay2Id = 'pay_demo_02';

      const expiryFuture = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const expiryPast = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

      const demoDevices: RegisteredDevice[] = [
        {
          id: 'dev_demo_01',
          userId: c1Id,
          deviceName: 'Galaxy A14 Phone [Demo]',
          deviceType: 'Mobile',
          macAddress: mac1,
          macMasked: maskMacAddress(mac1),
          macAssociationStatus: 'Gateway Associated',
          macHistory: [
            {
              id: 'mac_demo_1',
              previousMac: null,
              newMac: mac1,
              changedBy: c1Id,
              reason: 'Demo gateway association',
              timestamp: isoNow,
            },
          ],
          registrationDate: isoNow,
          activeSubscriptionId: sub1Id,
          networkAuthorizationStatus: 'Authorized',
          lastConnection: isoNow,
          deviceStatus: 'Active',
          isDemo: true,
        },
        {
          id: 'dev_demo_02',
          userId: c1Id,
          deviceName: 'School Study Tablet [Demo]',
          deviceType: 'Tablet',
          macAddress: mac2,
          macMasked: maskMacAddress(mac2),
          macAssociationStatus: 'Gateway Associated',
          macHistory: [
            {
              id: 'mac_demo_2',
              previousMac: null,
              newMac: mac2,
              changedBy: c1Id,
              reason: 'Demo gateway association',
              timestamp: isoNow,
            },
          ],
          registrationDate: isoNow,
          activeSubscriptionId: sub2Id,
          networkAuthorizationStatus: 'Unauthorized',
          lastConnection: expiryPast,
          deviceStatus: 'Active',
          isDemo: true,
        },
        {
          id: 'dev_demo_03',
          userId: c2Id,
          deviceName: 'Android Handset [Demo]',
          deviceType: 'Mobile',
          macAddress: mac3,
          macMasked: maskMacAddress(mac3),
          macAssociationStatus: 'Pending Gateway',
          macHistory: [],
          registrationDate: isoNow,
          activeSubscriptionId: null,
          networkAuthorizationStatus: 'Unauthorized',
          lastConnection: null,
          deviceStatus: 'Active',
          isDemo: true,
        },
      ];

      const demoPayments: PaymentRecord[] = [
        {
          id: pay1Id,
          idempotencyKey: 'idem_demo_01',
          userId: c1Id,
          deviceId: 'dev_demo_01',
          subscriptionId: sub1Id,
          packageId: 'pkg_weekly',
          amountPkr: 200,
          methodId: 'pm_easypaisa_sandbox',
          methodName: 'Easypaisa Mobile Account (Sandbox Test)',
          transactionReference: 'SANDBOX-EP-DEMO-1001',
          isSandbox: true,
          status: 'Successful',
          timestamp: isoNow,
          isDemo: true,
        },
        {
          id: pay2Id,
          idempotencyKey: 'idem_demo_02',
          userId: c1Id,
          deviceId: 'dev_demo_02',
          subscriptionId: sub2Id,
          packageId: 'pkg_daily',
          amountPkr: 50,
          methodId: 'pm_bank_sandbox',
          methodName: 'Local Bank / Raast Reference (Sandbox Test)',
          transactionReference: 'SANDBOX-BANK-DEMO-1002',
          isSandbox: true,
          status: 'Requires Review',
          reviewNote: 'Pending Finance Reviewer check in Demo Mode',
          timestamp: isoNow,
          isDemo: true,
        },
      ];

      const demoSubscriptions: Subscription[] = [
        {
          id: sub1Id,
          userId: c1Id,
          deviceId: 'dev_demo_01',
          packageId: 'pkg_weekly',
          packageName: 'Weekly',
          speedMbps: 2,
          paymentId: pay1Id,
          purchaseDate: isoNow,
          activationDate: isoNow,
          expiryDate: expiryFuture,
          status: 'Active',
          networkAuthStatus: 'Authorized',
          isDemo: true,
        },
        {
          id: sub2Id,
          userId: c1Id,
          deviceId: 'dev_demo_02',
          packageId: 'pkg_daily',
          packageName: 'Daily',
          speedMbps: 2,
          paymentId: pay2Id,
          purchaseDate: expiryPast,
          activationDate: expiryPast,
          expiryDate: expiryPast,
          status: 'Expired',
          networkAuthStatus: 'Unauthorized',
          isDemo: true,
        },
      ];

      const demoSessions: NetworkSession[] = [
        {
          id: 'ses_demo_01',
          userId: c1Id,
          deviceId: 'dev_demo_01',
          macAddress: mac1,
          equipmentId: 'eq_pabohar_ap1',
          villageId: 'vil_pabohar',
          sessionStart: isoNow,
          sessionEnd: null,
          sessionStatus: 'Active',
          providerRef: 'SANDBOX-RAD-DEMO-01',
          isSandbox: true,
          isDemo: true,
        },
      ];

      const demoTickets: SupportTicket[] = [
        {
          id: 'tkt_demo_01',
          userId: c2Id,
          contactName: 'Sita Bai Bheel [Demo]',
          contactMobile: '03014445566',
          category: 'Identity Verification',
          subject: 'Manual CNIC check needed for Pabohar registration',
          description:
            'Submitted CNIC through the captive portal on Android; status shows Requires Manual Review.',
          status: 'Open',
          assignedAdminId: 'adm_support_01',
          assignedAdminName: 'Community Support Coordinator',
          replies: [],
          createdAt: isoNow,
          updatedAt: isoNow,
          isDemo: true,
        },
      ];

      db.users.push(...demoUsers);
      db.devices.push(...demoDevices);
      db.payments.push(...demoPayments);
      db.subscriptions.push(...demoSubscriptions);
      db.sessions.push(...demoSessions);
      db.tickets.push(...demoTickets);
      db.siteConfig.sandboxDemoMode = true;
      db.siteConfig.networkIntegrationMode = 'sandbox_adapter';
    } else {
      db.siteConfig.sandboxDemoMode = false;
      db.siteConfig.networkIntegrationMode = 'disconnected';
    }

    db.siteConfig.updatedAt = isoNow;
    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId,
      actorRole,
      action: enable ? 'SANDBOX_DEMO_ENABLED' : 'SANDBOX_DEMO_DISABLED',
      resourceType: 'SiteConfig',
      resourceId: 'sandboxDemoMode',
      metadata: { enable },
      timestamp: isoNow,
    });

    return db;
  });
}
