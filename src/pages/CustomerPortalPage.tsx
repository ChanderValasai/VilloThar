import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Info,
  Laptop,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Wifi,
} from 'lucide-react';
import { StatusLabel } from '../components/StatusBadge';
import { VilloTharLogo } from '../components/VilloTharLogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { resolveSupportEmail, resolveWhatsAppSupport } from '../utils/contactLinks';
import {
  DeviceType,
  PackagePlan,
  PaymentMethodConfig,
  PaymentRecord,
  RegisteredDevice,
  Subscription,
  SupportTicket,
  TicketCategory,
} from '../types/domain';

type PortalTab = 'overview' | 'devices' | 'buy' | 'payments' | 'support' | 'settings';

function formatTimeLeft(expiryIso: string | null): string {
  if (!expiryIso) return '—';
  const diff = new Date(expiryIso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return days > 0 ? `${days}d ${remHours}h remaining` : `${remHours}h remaining`;
}

export function CustomerPortalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customerToken, logoutCustomer, updateCustomerUser } = useAuth();

  const initialTab = (searchParams.get('tab') as PortalTab) || 'overview';
  const initialPkg = searchParams.get('package') || '';

  const [tab, setTab] = useState<PortalTab>(initialTab);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Device Registration Form State
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('Mobile');
  const [macAddress, setMacAddress] = useState('');
  const [assocMode, setAssocMode] = useState<'gateway_simulation' | 'manual_pending'>(
    'gateway_simulation',
  );

  // MAC Edit State
  const [editingMacDevice, setEditingMacDevice] = useState<string | null>(null);
  const [newMacValue, setNewMacValue] = useState('');
  const [macReason, setMacReason] = useState('');

  // Purchase Flow State
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(initialPkg);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [pendingPayment, setPendingPayment] = useState<PaymentRecord | null>(null);
  const [receiptModal, setReceiptModal] = useState<PaymentRecord | null>(null);

  // Ticket State
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('Internet Connectivity');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // Settings State
  const [profileName, setProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.customer.getDashboard();
      setData(res);
      updateCustomerUser(res.user);
      setProfileName(res.user.fullName);
      if (res.devices?.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(res.devices[0].id);
      }
      if (res.packages?.length > 0 && !selectedPackageId) {
        setSelectedPackageId(res.packages[0].id);
      }
      if (res.paymentMethods?.length > 0 && !selectedMethodId) {
        setSelectedMethodId(res.paymentMethods[0].id);
      }
    } catch (err: any) {
      if (err.message?.includes('Session') || err.message?.includes('token')) {
        logoutCustomer();
        navigate('/portal/login');
      } else {
        setNotice({ type: 'err', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [logoutCustomer, navigate, selectedDeviceId, selectedMethodId, selectedPackageId, updateCustomerUser]);

  useEffect(() => {
    if (!customerToken) {
      navigate('/portal/login');
      return;
    }
    loadDashboard();
  }, [customerToken, navigate, loadDashboard]);

  const handleResubmitVerification = async (manual: boolean) => {
    setNotice(null);
    try {
      const res = await api.customer.resubmitVerification(manual);
      setNotice({
        type: 'ok',
        text: `Verification status updated to "${res.user.verificationStatus}".`,
      });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      const res = await api.customer.registerDevice({
        deviceName,
        deviceType,
        macAddress,
        associationSource: assocMode,
      });
      setDeviceName('');
      setMacAddress('');
      setShowAddDevice(false);
      setSelectedDeviceId(res.device.id);
      setNotice({
        type: 'ok',
        text: `Device "${res.device.deviceName}" registered (${res.device.macAssociationStatus}).`,
      });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleUpdateMac = async (deviceId: string) => {
    setNotice(null);
    try {
      await api.customer.updateDeviceMac(deviceId, {
        macAddress: newMacValue,
        reason: macReason || 'Customer updated Wi-Fi MAC address',
        associateViaGateway: true,
      });
      setEditingMacDevice(null);
      setNewMacValue('');
      setMacReason('');
      setNotice({ type: 'ok', text: 'Device MAC address updated and recorded in audit log.' });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setNotice(null);
    try {
      await api.customer.removeDevice(deviceId);
      setNotice({ type: 'ok', text: 'Device removed and authorization revoked.' });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleInitiatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await api.customer.initiatePurchase({
        deviceId: selectedDeviceId,
        packageId: selectedPackageId,
        methodId: selectedMethodId,
        idempotencyKey,
      });
      setPendingPayment(res.payment);
      setNotice({
        type: 'ok',
        text: res.gatewayMessage || 'Payment initiated. Complete webhook verification below.',
      });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleConfirmPaymentCallback = async (
    paymentId: string,
    outcome: 'Successful' | 'Failed',
  ) => {
    setNotice(null);
    try {
      const res = await api.customer.simulatePaymentWebhook(paymentId, outcome);
      setPendingPayment(null);
      if (outcome === 'Successful') {
        setNotice({
          type: 'ok',
          text:
            res.activation?.message ||
            'Payment verified by backend and subscription processed.',
        });
      } else {
        setNotice({ type: 'err', text: 'Sandbox payment marked Failed. Device remains unauthorized.' });
      }
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      await api.customer.createTicket({
        category: ticketCategory,
        subject: ticketSubject,
        description: ticketDesc,
      });
      setTicketSubject('');
      setTicketDesc('');
      setNotice({ type: 'ok', text: 'Support ticket submitted to community team.' });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleTicketReply = async (ticketId: string) => {
    const msg = replyText[ticketId];
    if (!msg?.trim()) return;
    try {
      await api.customer.replyTicket(ticketId, msg);
      setReplyText((p) => ({ ...p, [ticketId]: '' }));
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      await api.customer.updateProfile({
        fullName: profileName,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNotice({ type: 'ok', text: 'Account settings updated.' });
      await loadDashboard();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message });
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <p className="text-sm text-[#475569]">Loading Customer Portal...</p>
      </div>
    );
  }

  const user = data.user;
  const devices: (RegisteredDevice & {
    activeSubscription: Subscription | null;
    networkEligibility: { eligible: boolean; reasons: string[] };
    purchaseEligibility: { eligible: boolean; reasons: string[] };
  })[] = data.devices || [];
  const packages: PackagePlan[] = data.packages || [];
  const paymentMethods: PaymentMethodConfig[] = data.paymentMethods || [];
  const payments: PaymentRecord[] = data.payments || [];
  const tickets: SupportTicket[] = data.tickets || [];

  const activeDeviceCount = devices.filter(
    (d) => d.activeSubscription?.status === 'Active',
  ).length;
  const pendingPaymentCount = payments.filter(
    (p) => p.status === 'Pending' || p.status === 'Requires Review',
  ).length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#132238] flex flex-col">
      {/* Top Portal Bar */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E0DA] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <VilloTharLogo size="sm" />
            <span className="font-display text-lg font-bold text-[#132238]">VilloThar</span>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/captive"
              className="hidden sm:inline-block text-[#475569] hover:text-[#0B66A8] whitespace-nowrap"
            >
              Captive View
            </Link>
            <button
              type="button"
              onClick={() => {
                logoutCustomer();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E0DA] text-xs font-medium text-[#132238] hover:bg-[#F3F1EC] min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Customer Header Summary */}
        <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
              <span>{user.villageName || 'Pabohar'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-data">CNIC {user.cnicMasked}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-data">{user.mobileNumber}</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#132238]">{user.fullName}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-left md:text-right">
              <p className="text-xs text-[#64748B]">CNIC Verification</p>
              <StatusLabel status={user.verificationStatus} />
            </div>
            <div className="text-left md:text-right pl-4 border-l border-[#E2E0DA]">
              <p className="text-xs text-[#64748B]">Account</p>
              <StatusLabel status={user.accountStatus} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'devices', label: `My Devices (${devices.length})` },
            { id: 'buy', label: 'Buy / Renew Package' },
            { id: 'payments', label: `Payments (${payments.length})` },
            { id: 'support', label: `Support (${tickets.length})` },
            { id: 'settings', label: 'Account Settings' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as PortalTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 min-h-[42px] transition-colors ${
                tab === item.id
                  ? 'bg-[#0B66A8] text-white'
                  : 'bg-[#FFFFFF] border border-[#E2E0DA] text-[#475569] hover:text-[#132238]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {notice && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
              notice.type === 'ok'
                ? 'bg-[#15803D]/10 border-[#15803D]/25 text-[#15803D]'
                : 'bg-[#B91C1C]/10 border-[#B91C1C]/25 text-[#B91C1C]'
            }`}
          >
            {notice.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* CNIC Verification Guidance Banner if not Verified */}
            {user.verificationStatus !== 'Verified' && (
              <div className="bg-[#FFFFFF] border border-[#D97706]/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#132238]">
                    <ShieldCheck className="w-4 h-4 text-[#B45309]" />
                    <span>Identity Verification: {user.verificationStatus}</span>
                  </div>
                  <p className="text-xs text-[#475569]">
                    {user.verificationNote ||
                      'Official NADRA authorization channel is configurable. You can re-run sandbox verification or request manual operator review.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResubmitVerification(false)}
                    className="px-3.5 py-2 text-xs font-semibold bg-[#0B66A8] text-white rounded-lg min-h-[40px]"
                  >
                    Re-run Verification Check
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResubmitVerification(true)}
                    className="px-3.5 py-2 text-xs font-semibold border border-[#E2E0DA] text-[#132238] rounded-lg min-h-[40px]"
                  >
                    Request Manual Review
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5">
                <p className="text-xs text-[#64748B]">Registered Devices</p>
                <p className="mt-1 font-mono-data text-2xl font-bold">{devices.length}</p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5">
                <p className="text-xs text-[#64748B]">Active Device Packages</p>
                <p className="mt-1 font-mono-data text-2xl font-bold text-[#15803D]">
                  {activeDeviceCount}
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5">
                <p className="text-xs text-[#64748B]">Pending Payments</p>
                <p className="mt-1 font-mono-data text-2xl font-bold text-[#B45309]">
                  {pendingPaymentCount}
                </p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5">
                <p className="text-xs text-[#64748B]">Support Tickets</p>
                <p className="mt-1 font-mono-data text-2xl font-bold">{tickets.length}</p>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Your Devices & Connectivity</h2>
                <button
                  type="button"
                  onClick={() => {
                    setTab('devices');
                    setShowAddDevice(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Device</span>
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="py-8 text-center space-y-3 border border-dashed border-[#E2E0DA] rounded-xl">
                  <p className="text-sm text-[#475569]">
                    No devices registered yet. Each device needs its own registration and package.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('devices');
                      setShowAddDevice(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg"
                  >
                    Add Your First Device
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E0DA]">
                  {devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#132238]">{dev.deviceName}</span>
                          <span className="text-xs text-[#64748B]">· {dev.deviceType}</span>
                          <span className="font-mono-data text-xs text-[#64748B]">
                            · {dev.macMasked}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                          <span>
                            Package:{' '}
                            <strong className="text-[#132238]">
                              {dev.activeSubscription
                                ? `${dev.activeSubscription.packageName} (${dev.activeSubscription.status})`
                                : 'None'}
                            </strong>
                          </span>
                          {dev.activeSubscription?.expiryDate && (
                            <span className="font-mono-data">
                              · {formatTimeLeft(dev.activeSubscription.expiryDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusLabel status={dev.networkAuthorizationStatus} compact />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId(dev.id);
                            setTab('buy');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold border border-[#E2E0DA] rounded-lg hover:bg-[#FAF9F6] min-h-[36px]"
                        >
                          {dev.activeSubscription?.status === 'Active' ? 'Renew' : 'Buy Package'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEVICES & MAC MANAGEMENT */}
        {tab === 'devices' && (
          <div className="space-y-6">
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">Registered Devices</h2>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Browsers cannot directly read your Wi-Fi MAC address. Associate your device via the captive portal gateway or enter your device Wi-Fi MAC manually.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDevice((s) => !s)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg whitespace-nowrap min-h-[42px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddDevice ? 'Close Form' : 'Register New Device'}</span>
                </button>
              </div>

              {showAddDevice && (
                <form
                  onSubmit={handleRegisterDevice}
                  className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#132238] mb-1">
                        Device Name
                      </label>
                      <input
                        type="text"
                        required
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="e.g. My Android Phone"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#132238] mb-1">
                        Device Type
                      </label>
                      <select
                        value={deviceType}
                        onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-sm"
                      >
                        <option value="Mobile">Mobile</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#132238] mb-1">
                        Wi-Fi MAC Address
                      </label>
                      <input
                        type="text"
                        required
                        value={macAddress}
                        onChange={(e) => setMacAddress(e.target.value)}
                        placeholder="A4:5E:60:C1:88:12"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-sm font-mono-data"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-start gap-2 p-3 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] cursor-pointer">
                      <input
                        type="radio"
                        name="assocMode"
                        checked={assocMode === 'gateway_simulation'}
                        onChange={() => setAssocMode('gateway_simulation')}
                        className="mt-0.5 accent-[#0B66A8]"
                      />
                      <span>
                        <strong className="text-[#132238]">Gateway Association (Sandbox)</strong>
                        <br />
                        Simulates captive gateway recognizing and binding this MAC immediately.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 p-3 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] cursor-pointer">
                      <input
                        type="radio"
                        name="assocMode"
                        checked={assocMode === 'manual_pending'}
                        onChange={() => setAssocMode('manual_pending')}
                        className="mt-0.5 accent-[#0B66A8]"
                      />
                      <span>
                        <strong className="text-[#132238]">Pending Gateway Confirmation</strong>
                        <br />
                        Saves device record awaiting physical router or operator MAC confirmation.
                      </span>
                    </label>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E2E0DA] text-xs text-[#475569]">
                    <strong>Tip on Private/Randomized MACs:</strong> In your phone&apos;s Wi-Fi settings for VilloThar, set MAC Type to &ldquo;Phone MAC&rdquo; or keep Randomized MAC fixed for VilloThar so your device remains recognized.
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg min-h-[40px]"
                  >
                    Save Device Record
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {devices.map((dev) => {
                  const Icon =
                    dev.deviceType === 'Laptop'
                      ? Laptop
                      : dev.deviceType === 'Tablet'
                        ? Tablet
                        : Smartphone;

                  return (
                    <div
                      key={dev.id}
                      className="p-5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] space-y-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E2E0DA] flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-[#0B66A8]" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-[#132238]">{dev.deviceName}</h3>
                              <span className="text-xs text-[#64748B]">· {dev.deviceType}</span>
                            </div>
                            <p className="font-mono-data text-xs text-[#475569] mt-0.5">
                              MAC: {dev.macAddress} ({dev.macAssociationStatus})
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <StatusLabel status={dev.networkAuthorizationStatus} compact />
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMacDevice(dev.id);
                              setNewMacValue(dev.macAddress);
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-[#FFFFFF] border border-[#E2E0DA] rounded-lg min-h-[36px]"
                          >
                            Update MAC
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDevice(dev.id)}
                            className="p-2 text-[#B91C1C] bg-[#FFFFFF] border border-[#E2E0DA] rounded-lg hover:bg-[#B91C1C]/10 min-h-[36px] min-w-[36px]"
                            title="Remove device"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {editingMacDevice === dev.id && (
                        <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#E2E0DA] space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={newMacValue}
                              onChange={(e) => setNewMacValue(e.target.value)}
                              placeholder="New MAC (XX:XX:XX:XX:XX:XX)"
                              className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-xs font-mono-data"
                            />
                            <input
                              type="text"
                              value={macReason}
                              onChange={(e) => setMacReason(e.target.value)}
                              placeholder="Reason (e.g. turned off randomized MAC)"
                              className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateMac(dev.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg"
                            >
                              Save MAC Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMacDevice(null)}
                              className="px-3.5 py-1.5 text-xs border border-[#E2E0DA] rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#E2E0DA] flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
                        <span>
                          Subscription:{' '}
                          <strong className="text-[#132238]">
                            {dev.activeSubscription
                              ? `${dev.activeSubscription.packageName} · ${dev.activeSubscription.status}`
                              : 'No active package'}
                          </strong>
                          {dev.activeSubscription?.expiryDate &&
                            ` · ${formatTimeLeft(dev.activeSubscription.expiryDate)}`}
                        </span>
                        {!dev.networkEligibility.eligible && (
                          <span className="text-[#B45309]">
                            {dev.networkEligibility.reasons[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUY / RENEW PACKAGE */}
        {tab === 'buy' && (
          <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold">
                Purchase or Renew a Per-Device Package
              </h2>
              <p className="text-xs text-[#475569] mt-1">
                Packages activate on one selected device only (2 Mbps). Backend verifies payment before requesting network authorization.
              </p>
            </div>

            {devices.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[#E2E0DA] text-center space-y-3">
                <p className="text-sm text-[#475569]">
                  Please register at least one device before purchasing an internet package.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab('devices');
                    setShowAddDevice(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B66A8] rounded-lg"
                >
                  Register a Device
                </button>
              </div>
            ) : (
              <form onSubmit={handleInitiatePurchase} className="space-y-6">
                {/* Step 1: Device */}
                <div>
                  <label className="block text-sm font-semibold text-[#132238] mb-2">
                    1. Select Target Registered Device
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.deviceName} ({d.macMasked} · {d.macAssociationStatus})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const dev = devices.find((d) => d.id === selectedDeviceId);
                    if (dev && !dev.purchaseEligibility.eligible) {
                      return (
                        <div className="mt-2 p-3 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-xs text-[#B91C1C]">
                          {dev.purchaseEligibility.reasons.join(' ')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Step 2: Package */}
                <div>
                  <label className="block text-sm font-semibold text-[#132238] mb-2">
                    2. Select Package (2 Mbps · Single Device)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                          selectedPackageId === pkg.id
                            ? 'border-[#0B66A8] bg-[#0B66A8]/5'
                            : 'border-[#E2E0DA] bg-[#FAF9F6] hover:border-[#0B66A8]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#132238]">{pkg.name}</span>
                          <span className="font-mono-data text-xs text-[#64748B]">
                            {pkg.validityDays}d
                          </span>
                        </div>
                        <p className="mt-2 font-mono-data text-xl font-bold text-[#132238]">
                          Rs {pkg.pricePkr}
                        </p>
                        <p className="text-xs text-[#475569] mt-1">
                          {pkg.speedMbps} Mbps · 1 device
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-[#132238] mb-2">
                    3. Select Configured Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodId(m.id)}
                        className={`text-left p-4 rounded-xl border ${
                          selectedMethodId === m.id
                            ? 'border-[#0B66A8] bg-[#0B66A8]/5'
                            : 'border-[#E2E0DA] bg-[#FAF9F6]'
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#132238]">{m.name}</p>
                        <p className="text-xs text-[#475569] mt-1">{m.instructions}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg min-h-[44px]"
                >
                  Initiate Payment
                </button>
              </form>
            )}

            {/* Pending Sandbox Webhook Verification Box */}
            {pendingPayment && (
              <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#0B66A8]/35 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[#132238]">
                    Backend Payment Verification ({pendingPayment.transactionReference})
                  </h3>
                  <StatusLabel status={pendingPayment.status} compact />
                </div>
                <p className="text-xs text-[#475569]">
                  Test Payment Mode: A package never activates on frontend click alone. Trigger the backend gateway webhook callback below to confirm or decline this Rs {pendingPayment.amountPkr} transaction.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmPaymentCallback(pendingPayment.id, 'Successful')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] rounded-lg min-h-[40px]"
                  >
                    Simulate Verified Payment Callback
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPaymentCallback(pendingPayment.id, 'Failed')}
                    className="px-4 py-2 text-xs font-semibold text-[#B91C1C] border border-[#B91C1C]/30 bg-[#FFFFFF] rounded-lg min-h-[40px]"
                  >
                    Simulate Failed Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYMENTS & RECEIPTS */}
        {tab === 'payments' && (
          <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Payment History & Receipts</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-[#64748B] py-6">No payment transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E0DA] text-xs text-[#64748B]">
                      <th className="py-2.5 pr-4">Reference</th>
                      <th className="py-2.5 pr-4">Method</th>
                      <th className="py-2.5 pr-4">Amount</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0DA]">
                    {payments.map((p) => (
                      <tr key={p.id} className="h-11">
                        <td className="py-2.5 pr-4 font-mono-data text-xs">
                          {p.transactionReference}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-[#475569]">{p.methodName}</td>
                        <td className="py-2.5 pr-4 font-mono-data font-semibold">
                          Rs {p.amountPkr}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusLabel status={p.status} compact />
                        </td>
                        <td className="py-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReceiptModal(p)}
                            className="text-xs font-medium text-[#0B66A8] hover:underline"
                          >
                            Receipt
                          </button>
                          {p.status === 'Pending' && p.isSandbox && (
                            <button
                              type="button"
                              onClick={() => handleConfirmPaymentCallback(p.id, 'Successful')}
                              className="text-xs font-semibold text-[#15803D] hover:underline"
                            >
                              Verify Sandbox
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {receiptModal && (
              <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-[#132238]">
                    VilloThar Payment Receipt ({receiptModal.isSandbox ? 'SANDBOX TEST' : 'VERIFIED'})
                  </strong>
                  <button
                    type="button"
                    onClick={() => setReceiptModal(null)}
                    className="text-[#0B66A8] font-medium"
                  >
                    Close
                  </button>
                </div>
                <p>Transaction Ref: <span className="font-mono-data">{receiptModal.transactionReference}</span></p>
                <p>Amount: <span className="font-mono-data">Rs {receiptModal.amountPkr}</span></p>
                <p>Method: {receiptModal.methodName}</p>
                <p>Status: {receiptModal.status}</p>
                <p>Timestamp: <span className="font-mono-data">{new Date(receiptModal.timestamp).toLocaleString()}</span></p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SUPPORT TICKETS */}
        {tab === 'support' && (
          <div className="space-y-6">
            {(() => {
              const wa = resolveWhatsAppSupport(data.contact?.supportPhone);
              const email = resolveSupportEmail(data.contact?.supportEmail);
              return (
                <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-[#132238]">Direct Customer Support</p>
                    <p className="text-xs text-[#475569]">
                      WhatsApp:{' '}
                      <a
                        href={wa.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono-data text-[#0B66A8] font-medium hover:underline"
                      >
                        {wa.display}
                      </a>{' '}
                      · Email:{' '}
                      <a
                        href={`mailto:${email}`}
                        className="text-[#0B66A8] font-medium hover:underline"
                      >
                        {email}
                      </a>
                    </p>
                  </div>
                  <a
                    href={wa.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg whitespace-nowrap min-h-[40px]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              );
            })()}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">New Support Request</h2>
              <form onSubmit={handleCreateTicket} className="space-y-3">
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                >
                  <option value="Internet Connectivity">Internet Connectivity</option>
                  <option value="Payment Problem">Payment Problem</option>
                  <option value="Package Expiry">Package Expiry</option>
                  <option value="Device Registration">Device Registration</option>
                  <option value="Identity Verification">Identity Verification</option>
                  <option value="Login Problem">Login Problem</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
                <textarea
                  required
                  rows={4}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Describe your issue..."
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B66A8] rounded-lg min-h-[42px]"
                >
                  Submit Ticket
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">Your Support Tickets</h2>
              {tickets.length === 0 ? (
                <p className="text-sm text-[#64748B]">You have no open support tickets.</p>
              ) : (
                <div className="space-y-4">
                  {tickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-[#132238]">{t.subject}</span>
                        <StatusLabel status={t.status} compact />
                      </div>
                      <p className="text-xs text-[#64748B]">{t.category} · {new Date(t.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-[#475569]">{t.description}</p>
                      {t.replies
                        .filter((r) => !r.isInternalNote)
                        .map((r) => (
                          <div key={r.id} className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E2E0DA] text-xs">
                            <span className="font-semibold text-[#132238]">{r.authorName} ({r.authorRole}): </span>
                            <span className="text-[#475569]">{r.message}</span>
                          </div>
                        ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={replyText[t.id] || ''}
                          onChange={(e) => setReplyText((p) => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="Add a reply..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E0DA] bg-[#FFFFFF] text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleTicketReply(t.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#0B66A8] text-white rounded-lg"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* TAB 6: ACCOUNT SETTINGS */}
        {tab === 'settings' && (
          <div className="max-w-lg bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Account Settings</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
              </div>
              <div className="pt-2 border-t border-[#E2E0DA] space-y-3">
                <p className="text-xs font-semibold text-[#475569]">Change Password (Optional)</p>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B66A8] rounded-lg min-h-[42px]"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
