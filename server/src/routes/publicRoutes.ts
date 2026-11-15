import { Router } from 'express';
import { z } from 'zod';
import { readDb, mutateDb } from '../models/database.ts';
import { networkController, nadraProvider } from '../integrations/interfaces.ts';
import { generateId, isValidPakistanMobile, normalizeMobileNumber } from '../utils/crypto.ts';

export const publicRoutes = Router();

publicRoutes.get('/overview', async (_req, res) => {
  const db = await readDb();
  const activePackages = db.packages.filter((p) => p.isActive);
  const publicVillages = db.villages.filter(
    (v) =>
      v.isPubliclyVisible &&
      (v.role === 'NOC' || v.coverageStatus === 'Pilot' || v.coverageStatus === 'Active'),
  );

  res.json({
    packages: activePackages,
    villages: publicVillages,
    contact: {
      supportPhone: db.siteConfig.supportPhone,
      supportEmail: db.siteConfig.supportEmail,
      officeAddress: db.siteConfig.officeAddress,
      supportHours: db.siteConfig.supportHours,
      socialNote: db.siteConfig.socialNote,
    },
    integrations: {
      nadraMode: nadraProvider.mode,
      networkHardware: networkController.getHardwareStatus(),
      paymentSandboxOnly: db.siteConfig.paymentMethods.every((m) => m.isSandbox),
      sandboxDemoMode: db.siteConfig.sandboxDemoMode,
    },
  });
});

const publicTicketSchema = z.object({
  contactName: z.string().trim().min(2).max(100),
  contactMobile: z.string().trim().min(10).max(20),
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

publicRoutes.post('/support', async (req, res) => {
  const parsed = publicTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Please check your contact details and support message.',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  if (!isValidPakistanMobile(parsed.data.contactMobile)) {
    return res.status(400).json({
      error: 'Please enter a valid Pakistan mobile number (e.g. 03XXXXXXXXX).',
    });
  }

  const now = new Date().toISOString();
  const ticket = await mutateDb((db) => {
    const created = {
      id: generateId('tkt'),
      userId: null,
      contactName: parsed.data.contactName,
      contactMobile: normalizeMobileNumber(parsed.data.contactMobile),
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
    db.tickets.unshift(created);
    db.auditLogs.unshift({
      id: generateId('aud'),
      actorId: 'public_visitor',
      actorRole: 'Visitor',
      action: 'PUBLIC_SUPPORT_TICKET_CREATED',
      resourceType: 'SupportTicket',
      resourceId: created.id,
      metadata: { category: created.category },
      timestamp: now,
    });
    return created;
  });

  res.status(201).json({
    ticketId: ticket.id,
    status: ticket.status,
    message: 'Your support request has been logged. Our community team will review it shortly.',
  });
});
