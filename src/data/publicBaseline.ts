import { PackagePlan, Village } from '../types/domain';

export const BASELINE_CONTACT = {
  supportPhone: 'https://wa.me/923212472380',
  supportEmail: 'admin@villothar.com',
  officeAddress: 'VilloThar NOC Desk, Mithi & Pabohar Community Point, Tharparkar, Sindh',
  supportHours: 'Saturday – Thursday · 09:00 AM – 06:00 PM',
  socialNote: 'Official WhatsApp support and email channels active.',
};

export const BASELINE_PACKAGES: PackagePlan[] = [
  {
    id: 'pkg_daily',
    name: 'Daily',
    pricePkr: 50,
    speedMbps: 2,
    validityDays: 1,
    isActive: true,
    description: '24-hour internet access for one registered device.',
    taxNote: 'Indicative price pending pilot confirmation. Applicable taxes may apply.',
    updatedAt: '2026-11-15T00:00:00.000Z',
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
    updatedAt: '2026-11-15T00:00:00.000Z',
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
    updatedAt: '2026-11-15T00:00:00.000Z',
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
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
];

export const BASELINE_VILLAGES: Village[] = [
  {
    id: 'vil_mithi_noc',
    name: 'Mithi',
    role: 'NOC',
    coverageStatus: 'NOC Hub',
    distanceFromNocKm: 0,
    description:
      'Network Operations Centre (NOC) and primary regional uplink hub. Mithi is the operations hub and is not listed as an active customer Wi-Fi coverage village.',
    isPubliclyVisible: true,
    updatedAt: '2026-11-15T00:00:00.000Z',
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
    updatedAt: '2026-11-15T00:00:00.000Z',
  },
];
