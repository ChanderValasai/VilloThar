import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Radio,
  Settings,
  Shield,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { StatusLabel } from '../components/StatusBadge';
import { VilloTharLogo } from '../components/VilloTharLogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { VillageCoverageStatus } from '../types/domain';

type AdminSection =
  | 'overview'
  | 'customers'
  | 'devices'
  | 'packages'
  | 'payments'
  | 'villages'
  | 'network'
  | 'tickets'
  | 'settings'
  | 'audit';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminToken, adminUser, logoutAdmin } = useAuth();

  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [networkData, setNetworkData] = useState<any>(null);
  const [ticketsData, setTicketsData] = useState<any>({ tickets: [], admins: [] });
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [revealedCnics, setRevealedCnics] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Forms inside admin sections
  const [newVillage, setNewVillage] = useState({
    name: '',
    coverageStatus: 'Planned' as VillageCoverageStatus,
    distanceFromNocKm: 15,
    description: '',
    isPubliclyVisible: false,
  });
  const [newPackage, setNewPackage] = useState({
    name: '',
    pricePkr: 100,
    speedMbps: 2,
    validityDays: 3,
    description: '',
  });
  const [reconcileNote, setReconcileNote] = useState<Record<string, string>>({});
  const [maintInput, setMaintInput] = useState<Record<string, string>>({});
  const [ticketReply, setTicketReply] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    try {
      const [ov, cust, dev, pkg, pay, vil, net, tkt, cfg, aud] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getCustomers(),
        api.admin.getDevices(),
        api.admin.getPackages(),
        api.admin.getPayments(),
        api.admin.getVillages(),
        api.admin.getNetwork(),
        api.admin.getTickets(),
        api.admin.getSiteConfig(),
        api.admin.getAuditLogs(),
      ]);
      setOverview(ov);
      setCustomers(cust.customers || []);
      setDevices(dev.devices || []);
      setPackages(pkg.packages || []);
      setPayments(pay.payments || []);
      setVillages(vil.villages || []);
      setNetworkData(net);
      setTicketsData(tkt);
      setSiteConfig(cfg.siteConfig);
      setAuditLogs(aud.auditLogs || []);
    } catch (err: any) {
      if (err.message?.includes('session') || err.message?.includes('token')) {
        logoutAdmin();
        navigate('/admin/login');
      } else {
        setNotice({ type: 'err', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [logoutAdmin, navigate]);

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    loadAll();
  }, [adminToken, navigate, loadAll]);

  const handleToggleDemo = async () => {
    setNotice(null);
    try {
      const next = !overview?.sandboxDemoMode;
      const res = await api.admin.toggleSandboxDemo(next);
      setNotice({ type: 'ok', text: res.message });
      await loadAll();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleRevealCnic = async (customerId: string) => {
    setNotice(null);
    try {
      const res = await api.admin.revealCustomerCnic(customerId);
      setRevealedCnics((p) => ({ ...p, [customerId]: res.cnic }));
      setNotice({
        type: 'ok',
        text: 'Full CNIC decrypted for authorized Super Admin view. Access recorded in Audit Log.',
      });
      await loadAll();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleVerifyCustomer = async (id: string, status: string) => {
    setNotice(null);
    try {
      await api.admin.updateCustomerVerification(
        id,
        status,
        `Updated to ${status} by operator`,
      );
      setNotice({ type: 'ok', text: `Customer verification updated to ${status}.` });
      await loadAll();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleToggleCustomerStatus = async (id: string, current: string) => {
    try {
      const next = current === 'Active' ? 'Suspended' : 'Active';
      await api.admin.updateCustomerStatus(id, next);
      await loadAll();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      await api.admin.updateSiteConfig(siteConfig);
      setNotice({ type: 'ok', text: 'Site configuration & integration settings saved.' });
      await loadAll();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  if (loading || !overview) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <p className="text-sm text-[#475569]">Loading Mithi NOC & Admin Operations...</p>
      </div>
    );
  }

  const navItems: { id: AdminSection; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers & CNIC', icon: Users },
    { id: 'devices', label: 'Devices & MACs', icon: Smartphone },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'villages', label: 'Villages', icon: MapPin },
    { id: 'network', label: 'NOC & Network', icon: Radio },
    { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
    { id: 'settings', label: 'Site & Integrations', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  const m = overview.metrics;

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobileNumber.includes(searchQuery) ||
      c.cnicMasked.includes(searchQuery),
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.macAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ownerName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#132238] flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FFFFFF] border-r border-[#E2E0DA] flex flex-col justify-between transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-[#E2E0DA] flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <VilloTharLogo size="sm" />
              <span className="font-display font-bold text-base text-[#132238]">
                VilloThar NOC
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-[#475569]"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#0B66A8] text-white'
                      : 'text-[#475569] hover:bg-[#FAF9F6] hover:text-[#132238]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#E2E0DA] space-y-2 text-xs">
          <div>
            <p className="font-semibold text-[#132238] truncate">{adminUser?.name}</p>
            <p className="text-[#64748B]">{adminUser?.role}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logoutAdmin();
              navigate('/admin/login');
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E0DA] text-[#132238] hover:bg-[#FAF9F6]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#FFFFFF] border-b border-[#E2E0DA] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#E2E0DA]"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-[#475569] truncate">
              VilloThar / <strong className="text-[#132238] capitalize">{section}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleDemo}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap ${
                overview.sandboxDemoMode
                  ? 'bg-[#D97706]/10 border-[#D97706]/40 text-[#92400E]'
                  : 'bg-[#FAF9F6] border-[#E2E0DA] text-[#132238]'
              }`}
            >
              {overview.sandboxDemoMode ? 'Sandbox Demo: ON (Reset)' : 'Load Sandbox Demo Data'}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
          {notice && (
            <div
              className={`p-3.5 rounded-xl border text-sm ${
                notice.type === 'ok'
                  ? 'bg-[#15803D]/10 border-[#15803D]/25 text-[#15803D]'
                  : 'bg-[#B91C1C]/10 border-[#B91C1C]/25 text-[#B91C1C]'
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              {overview.sandboxDemoMode ? (
                <div className="p-4 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 text-xs text-[#92400E]">
                  <strong>Sandbox Demo Mode Active:</strong> Metrics include clearly labelled <code>[Demo]</code> sample records for testing. Disable Demo Mode in the header to return to a clean baseline.
                </div>
              ) : (
                m.totalCustomers === 0 && (
                  <div className="p-5 rounded-xl bg-[#FFFFFF] border border-[#E2E0DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-sm text-[#132238]">
                        Clean Production Baseline Active
                      </h2>
                      <p className="text-xs text-[#475569] mt-0.5">
                        Zero fabricated metrics are displayed. Register a real test customer or enable Sandbox Demo Data to inspect populated workflows.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleDemo}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg whitespace-nowrap"
                    >
                      Enable Sandbox Demo Data
                    </button>
                  </div>
                )
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Customers', val: m.totalCustomers },
                  { label: 'Verified Customers', val: m.verifiedCustomers },
                  { label: 'Pending Reviews', val: m.pendingVerifications },
                  { label: 'Registered Devices', val: m.totalDevices },
                  { label: 'Authorized Devices', val: m.authorizedDevices },
                  { label: 'Active Subscriptions', val: m.activeSubscriptions },
                  { label: 'Expired Subscriptions', val: m.expiredSubscriptions },
                  { label: 'Pending Payments', val: m.pendingPayments },
                  { label: 'Successful Payments', val: m.successfulPayments },
                  { label: 'Open Tickets', val: m.openTickets },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-4"
                  >
                    <p className="text-xs text-[#64748B]">{kpi.label}</p>
                    <p className="mt-1 font-mono-data text-2xl font-bold text-[#132238]">
                      {kpi.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[#64748B]">NADRA Verification Channel</p>
                  <p className="font-semibold text-[#132238] mt-1">
                    {overview.integrations.nadraMode === 'authorized'
                      ? 'Authorized Endpoint Configured'
                      : 'Sandbox / Manual Review Mode (Official API Pending)'}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B]">Network Hardware / RADIUS</p>
                  <p className="font-semibold text-[#132238] mt-1">
                    {overview.integrations.networkHardware.connected
                      ? 'Connected'
                      : `Disconnected (${overview.integrations.networkIntegrationMode})`}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B]">Payment Gateway</p>
                  <p className="font-semibold text-[#132238] mt-1">
                    Configurable Test/Sandbox Mode
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMERS & CNIC */}
          {section === 'customers' && (
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">Customer & Identity Review</h2>
                  <p className="text-xs text-[#64748B]">
                    CNIC numbers are masked by default. Full CNIC reveal is restricted to Super Admin and logged.
                  </p>
                </div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or mobile..."
                  className="px-3.5 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm w-full sm:w-64"
                />
              </div>

              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-[#64748B] py-6">No customers match the current view.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E0DA] text-xs text-[#64748B]">
                        <th className="py-2.5 pr-4">Customer</th>
                        <th className="py-2.5 pr-4">CNIC</th>
                        <th className="py-2.5 pr-4">Village</th>
                        <th className="py-2.5 pr-4">Verification</th>
                        <th className="py-2.5 pr-4">Devices</th>
                        <th className="py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E0DA]">
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} className="align-top">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-[#132238]">{c.fullName}</p>
                            <p className="font-mono-data text-xs text-[#64748B]">
                              {c.mobileNumber} · {c.accountStatus}
                            </p>
                          </td>
                          <td className="py-3 pr-4 font-mono-data text-xs">
                            <span>{revealedCnics[c.id] || c.cnicMasked}</span>
                            {adminUser?.role === 'Super Admin' && !revealedCnics[c.id] && (
                              <button
                                type="button"
                                onClick={() => handleRevealCnic(c.id)}
                                className="ml-2 inline-flex items-center gap-1 text-[#0B66A8] hover:underline"
                              >
                                <Eye className="w-3 h-3" />
                                Reveal
                              </button>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs">{c.villageName}</td>
                          <td className="py-3 pr-4">
                            <StatusLabel status={c.verificationStatus} compact />
                          </td>
                          <td className="py-3 pr-4 font-mono-data text-xs">{c.deviceCount}</td>
                          <td className="py-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleVerifyCustomer(c.id, 'Verified')}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-[#15803D]/30 text-[#15803D] hover:bg-[#15803D]/10"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyCustomer(c.id, 'Verification Failed')}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10"
                            >
                              Fail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCustomerStatus(c.id, c.accountStatus)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-[#E2E0DA]"
                            >
                              {c.accountStatus === 'Active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DEVICES & MACS */}
          {section === 'devices' && (
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Registered Devices & MAC Audit</h2>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search device or MAC..."
                  className="px-3.5 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm w-full sm:w-64"
                />
              </div>

              {filteredDevices.length === 0 ? (
                <p className="text-sm text-[#64748B] py-6">No registered devices found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E0DA] text-xs text-[#64748B]">
                        <th className="py-2.5 pr-4">Device</th>
                        <th className="py-2.5 pr-4">MAC & Binding</th>
                        <th className="py-2.5 pr-4">Owner</th>
                        <th className="py-2.5 pr-4">Authorization</th>
                        <th className="py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E0DA]">
                      {filteredDevices.map((d) => (
                        <tr key={d.id} className="align-top">
                          <td className="py-3 pr-4">
                            <p className="font-semibold">{d.deviceName}</p>
                            <p className="text-xs text-[#64748B]">
                              {d.deviceType} · {d.deviceStatus}
                            </p>
                          </td>
                          <td className="py-3 pr-4 font-mono-data text-xs">
                            <p>{d.macAddress}</p>
                            <p className="text-[#64748B]">{d.macAssociationStatus}</p>
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            <p className="font-medium">{d.ownerName}</p>
                            <StatusLabel status={d.ownerVerificationStatus} compact />
                          </td>
                          <td className="py-3 pr-4">
                            <StatusLabel status={d.networkAuthorizationStatus} compact />
                            {d.activeSubscription && (
                              <p className="text-xs text-[#64748B] mt-0.5">
                                {d.activeSubscription.packageName} ({d.activeSubscription.status})
                              </p>
                            )}
                          </td>
                          <td className="py-3 flex flex-wrap gap-1.5">
                            {d.macAssociationStatus !== 'Gateway Associated' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.admin.updateDeviceStatus(d.id, {
                                    macAssociationStatus: 'Gateway Associated',
                                  });
                                  await loadAll();
                                }}
                                className="px-2.5 py-1 text-xs rounded border border-[#0B66A8]/35 text-[#0B66A8]"
                              >
                                Confirm MAC
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await api.admin.evaluateDeviceAuth(d.id);
                                setNotice({
                                  type: res.report.eligible ? 'ok' : 'err',
                                  text: res.report.eligible
                                    ? 'All 8 eligibility checks passed.'
                                    : res.report.reasons.join(' '),
                                });
                                await loadAll();
                              }}
                              className="px-2.5 py-1 text-xs rounded border border-[#E2E0DA]"
                            >
                              Check Auth
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await api.admin.updateDeviceStatus(d.id, {
                                  deviceStatus:
                                    d.deviceStatus === 'Active' ? 'Suspended' : 'Active',
                                });
                                await loadAll();
                              }}
                              className="px-2.5 py-1 text-xs rounded border border-[#B91C1C]/30 text-[#B91C1C]"
                            >
                              {d.deviceStatus === 'Active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PACKAGES */}
          {section === 'packages' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold">Internet Packages (2 Mbps)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-4 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[#132238]">{pkg.name}</h3>
                        <StatusLabel status={pkg.isActive ? 'Active' : 'Suspended'} compact />
                      </div>
                      <p className="font-mono-data text-xl font-bold">
                        Rs {pkg.pricePkr} · {pkg.validityDays}d · {pkg.speedMbps} Mbps
                      </p>
                      <p className="text-xs text-[#64748B] font-mono-data">
                        Purchases: {pkg.totalPurchases} · Active: {pkg.activeCount}
                      </p>
                      {adminUser?.role === 'Super Admin' && (
                        <div className="pt-2 border-t border-[#E2E0DA] flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.admin.updatePackage(pkg.id, {
                                isActive: !pkg.isActive,
                              });
                              await loadAll();
                            }}
                            className="px-2.5 py-1 text-xs rounded border border-[#E2E0DA] bg-[#FFFFFF]"
                          >
                            {pkg.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {adminUser?.role === 'Super Admin' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.admin.createPackage(newPackage);
                    setNewPackage({
                      name: '',
                      pricePkr: 100,
                      speedMbps: 2,
                      validityDays: 3,
                      description: '',
                    });
                    await loadAll();
                  }}
                  className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4"
                >
                  <h3 className="font-display text-base font-bold">Create Custom Package</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      value={newPackage.name}
                      onChange={(e) => setNewPackage((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Package Name"
                      className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm"
                    />
                    <input
                      type="number"
                      required
                      value={newPackage.pricePkr}
                      onChange={(e) =>
                        setNewPackage((p) => ({ ...p, pricePkr: Number(e.target.value) }))
                      }
                      placeholder="Price (Rs)"
                      className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm font-mono-data"
                    />
                    <input
                      type="number"
                      required
                      value={newPackage.validityDays}
                      onChange={(e) =>
                        setNewPackage((p) => ({ ...p, validityDays: Number(e.target.value) }))
                      }
                      placeholder="Validity (days)"
                      className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm font-mono-data"
                    />
                    <input
                      type="text"
                      required
                      value={newPackage.description}
                      onChange={(e) =>
                        setNewPackage((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Short description"
                      className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg"
                  >
                    Create Package
                  </button>
                </form>
              )}
            </div>
          )}

          {/* PAYMENTS */}
          {section === 'payments' && (
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold">Payment Reconciliation</h2>
                <p className="text-xs text-[#64748B]">
                  Manual reconciliation requires an explicit audit reason and writes to AuditLog.
                </p>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-[#64748B] py-6">No payment transactions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-data font-semibold text-[#132238]">
                            {p.transactionReference}
                          </span>
                          <StatusLabel status={p.status} compact />
                        </div>
                        <p className="text-[#475569]">
                          {p.customerName} · {p.deviceName} · {p.packageName} ·{' '}
                          <strong className="font-mono-data text-[#132238]">Rs {p.amountPkr}</strong>
                        </p>
                        <p className="text-[#64748B]">{p.methodName}</p>
                      </div>

                      {p.status !== 'Successful' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={reconcileNote[p.id] || ''}
                            onChange={(e) =>
                              setReconcileNote((n) => ({ ...n, [p.id]: e.target.value }))
                            }
                            placeholder="Audit reason (min 5 chars)"
                            className="px-3 py-1.5 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-xs"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.admin.reconcilePayment(
                                  p.id,
                                  'Successful',
                                  reconcileNote[p.id] || '',
                                );
                                await loadAll();
                              } catch (err: any) {
                                setNotice({ type: 'err', text: err.message });
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#15803D] rounded-lg"
                          >
                            Approve & Activate
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VILLAGES */}
          {section === 'villages' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold">Villages & Coverage Management</h2>
                <div className="space-y-3">
                  {villages.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#132238]">{v.name}</span>
                          <StatusLabel status={v.coverageStatus} compact />
                          <span className="font-mono-data text-xs text-[#64748B]">
                            ({v.distanceFromNocKm} km from Mithi NOC)
                          </span>
                        </div>
                        <p className="text-xs text-[#475569]">{v.description}</p>
                        <p className="font-mono-data text-xs text-[#64748B]">
                          Customers: {v.customerCount} · Devices: {v.deviceCount} · Equipment: {v.equipmentCount}
                        </p>
                      </div>

                      {v.role !== 'NOC' && (
                        <select
                          value={v.coverageStatus}
                          onChange={async (e) => {
                            await api.admin.updateVillage(v.id, {
                              coverageStatus: e.target.value,
                            });
                            await loadAll();
                          }}
                          className="px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-xs"
                        >
                          <option value="Planned">Planned</option>
                          <option value="Under Development">Under Development</option>
                          <option value="Pilot">Pilot</option>
                          <option value="Active">Active</option>
                          <option value="Temporarily Unavailable">Temporarily Unavailable</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await api.admin.addVillage(newVillage);
                  setNewVillage({
                    name: '',
                    coverageStatus: 'Planned',
                    distanceFromNocKm: 15,
                    description: '',
                    isPubliclyVisible: false,
                  });
                  await loadAll();
                }}
                className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4"
              >
                <h3 className="font-display text-base font-bold">Add Future Village</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={newVillage.name}
                    onChange={(e) => setNewVillage((v) => ({ ...v, name: e.target.value }))}
                    placeholder="Village Name"
                    className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm"
                  />
                  <select
                    value={newVillage.coverageStatus}
                    onChange={(e) =>
                      setNewVillage((v) => ({
                        ...v,
                        coverageStatus: e.target.value as VillageCoverageStatus,
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Under Development">Under Development</option>
                    <option value="Pilot">Pilot</option>
                    <option value="Active">Active</option>
                  </select>
                  <input
                    type="number"
                    required
                    value={newVillage.distanceFromNocKm}
                    onChange={(e) =>
                      setNewVillage((v) => ({ ...v, distanceFromNocKm: Number(e.target.value) }))
                    }
                    placeholder="Distance from Mithi NOC (km)"
                    className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm font-mono-data"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={newVillage.description}
                  onChange={(e) => setNewVillage((v) => ({ ...v, description: e.target.value }))}
                  placeholder="Village coverage notes"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg"
                >
                  Add Village
                </button>
              </form>
            </div>
          )}

          {/* NOC & NETWORK */}
          {section === 'network' && networkData && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">
                    Mithi NOC & Network Adapter Status
                  </h2>
                  <StatusLabel
                    status={
                      networkData.hardwareStatus.connected
                        ? 'Connected'
                        : 'Disconnected (Hardware Pending)'
                    }
                    compact
                  />
                </div>
                <p className="text-xs text-[#475569]">{networkData.hardwareStatus.note}</p>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold">
                  Router & Access Point Inventory
                </h3>
                <div className="space-y-4">
                  {networkData.equipment.map((eq: any) => (
                    <div
                      key={eq.id}
                      className="p-4 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{eq.name}</p>
                          <p className="text-xs text-[#64748B]">
                            {eq.equipmentType} · {eq.modelPlaceholder}
                          </p>
                        </div>
                        <StatusLabel status={eq.connectionState} compact />
                      </div>
                      <p className="text-xs text-[#475569]">{eq.notes}</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={maintInput[eq.id] || ''}
                          onChange={(e) =>
                            setMaintInput((m) => ({ ...m, [eq.id]: e.target.value }))
                          }
                          placeholder="Add equipment maintenance log..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-xs"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!maintInput[eq.id]?.trim()) return;
                            await api.admin.addMaintenanceLog(eq.id, maintInput[eq.id]);
                            setMaintInput((m) => ({ ...m, [eq.id]: '' }));
                            await loadAll();
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#0B66A8] text-white rounded-lg"
                        >
                          Log Note
                        </button>
                      </div>
                      {eq.maintenanceLogs.length > 0 && (
                        <ul className="text-xs text-[#475569] space-y-1 pt-2 border-t border-[#E2E0DA]">
                          {eq.maintenanceLogs.map((l: any) => (
                            <li key={l.id}>
                              <span className="font-mono-data text-[#64748B]">
                                {new Date(l.timestamp).toLocaleDateString()}
                              </span>{' '}
                              — {l.summary} ({l.performedBy})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-3">
                <h3 className="font-display text-base font-bold">Network Authorization Sessions</h3>
                {networkData.sessions.length === 0 ? (
                  <p className="text-sm text-[#64748B]">No network sessions recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {networkData.sessions.map((s: any) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E0DA] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono-data font-semibold">{s.macAddress}</span> ·{' '}
                          <span>{s.providerRef}</span>
                          {s.isSandbox && (
                            <span className="ml-2 text-[#B45309]">(Sandbox Adapter)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusLabel status={s.sessionStatus} compact />
                          {s.sessionStatus === 'Active' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await api.admin.terminateSession(s.id);
                                await loadAll();
                              }}
                              className="text-[#B91C1C] hover:underline font-medium"
                            >
                              Terminate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUPPORT TICKETS */}
          {section === 'tickets' && (
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">Support & Complaint Tickets</h2>
              {ticketsData.tickets.length === 0 ? (
                <p className="text-sm text-[#64748B]">No support tickets logged yet.</p>
              ) : (
                <div className="space-y-4">
                  {ticketsData.tickets.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm">{t.subject}</h3>
                          <p className="text-xs text-[#64748B]">
                            {t.contactName} ({t.contactMobile}) · {t.category}
                          </p>
                        </div>
                        <select
                          value={t.status}
                          onChange={async (e) => {
                            await api.admin.updateTicket(t.id, { status: e.target.value });
                            await loadAll();
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-xs"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Waiting on Customer">Waiting on Customer</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                      <p className="text-sm text-[#475569]">{t.description}</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ticketReply[t.id] || ''}
                          onChange={(e) =>
                            setTicketReply((r) => ({ ...r, [t.id]: e.target.value }))
                          }
                          placeholder="Write response to customer..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-xs"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!ticketReply[t.id]?.trim()) return;
                            await api.admin.updateTicket(t.id, {
                              replyMessage: ticketReply[t.id],
                            });
                            setTicketReply((r) => ({ ...r, [t.id]: '' }));
                            await loadAll();
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SITE CONFIG & INTEGRATIONS */}
          {section === 'settings' && siteConfig && (
            <form
              onSubmit={handleSaveSiteConfig}
              className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-5 max-w-3xl"
            >
              <h2 className="font-display text-lg font-bold">
                Public Contact Info & Integration Policies
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={siteConfig.supportPhone}
                    onChange={(e) =>
                      setSiteConfig((s: any) => ({ ...s, supportPhone: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Support Email</label>
                  <input
                    type="text"
                    value={siteConfig.supportEmail}
                    onChange={(e) =>
                      setSiteConfig((s: any) => ({ ...s, supportEmail: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Office Address</label>
                <input
                  type="text"
                  value={siteConfig.officeAddress}
                  onChange={(e) =>
                    setSiteConfig((s: any) => ({ ...s, officeAddress: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E0DA]">
                <div>
                  <label className="block text-xs font-medium mb-1">NADRA Verification Policy</label>
                  <select
                    value={siteConfig.nadraPolicy}
                    onChange={(e) =>
                      setSiteConfig((s: any) => ({ ...s, nadraPolicy: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  >
                    <option value="require_verified">Require Verified Status</option>
                    <option value="allow_manual_review_pilot">
                      Allow Pending Manual Review (Pilot)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Network Controller Mode
                  </label>
                  <select
                    value={siteConfig.networkIntegrationMode}
                    onChange={(e) =>
                      setSiteConfig((s: any) => ({ ...s, networkIntegrationMode: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  >
                    <option value="disconnected">Disconnected (Hardware Pending)</option>
                    <option value="sandbox_adapter">Sandbox Network Adapter</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B66A8] rounded-lg"
              >
                Save Settings
              </button>
            </form>
          )}

          {/* AUDIT LOGS */}
          {section === 'audit' && (
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">Security & Operations Audit Log</h2>
              <div className="divide-y divide-[#E2E0DA] text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono-data font-semibold text-[#132238]">
                        {log.action}
                      </span>{' '}
                      <span className="text-[#475569]">
                        by {log.actorRole} ({log.actorId}) on {log.resourceType}:{log.resourceId}
                      </span>
                    </div>
                    <span className="font-mono-data text-[#64748B]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
