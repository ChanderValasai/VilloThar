import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { StatusLabel } from '../components/StatusBadge';
import { VilloTharLogo } from '../components/VilloTharLogo';
import { useAuth } from '../context/AuthContext';
import { LocaleCode, useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import {
  DeviceType,
  PackagePlan,
  PaymentMethodConfig,
  PaymentRecord,
  RegisteredDevice,
  Village,
} from '../types/domain';

type CaptiveScreen =
  | 'welcome'
  | 'login'
  | 'register'
  | 'verification'
  | 'device'
  | 'packages'
  | 'payment'
  | 'activation'
  | 'returning'
  | 'expired';

function formatCnicInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function CaptivePortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const gatewayMacParam = searchParams.get('mac');
  const gatewayApParam = searchParams.get('ap') || 'PABOHAR-AP-01';

  const { customerToken, customerUser, setCustomerAuth, updateCustomerUser, logoutCustomer } =
    useAuth();
  const { locale, setLocale, isRtl, t } = useLanguage();

  const [screen, setScreen] = useState<CaptiveScreen>('welcome');
  const [ctx, setCtx] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Gateway Simulation helper (for previewing router redirect without hardware)
  const [simMacInput, setSimMacInput] = useState(gatewayMacParam || 'A4:5E:60:C1:88:12');

  // Auth inputs
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regCnic, setRegCnic] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regVillageId, setRegVillageId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regConsent, setRegConsent] = useState(false);

  // Device + Package + Payment flow state
  const [deviceName, setDeviceName] = useState('My Smartphone');
  const [deviceType, setDeviceType] = useState<DeviceType>('Mobile');
  const [manualMac, setManualMac] = useState(gatewayMacParam || '');
  const [activeDevice, setActiveDevice] = useState<RegisteredDevice | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackagePlan | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [currentPayment, setCurrentPayment] = useState<PaymentRecord | null>(null);
  const [activationOutcome, setActivationOutcome] = useState<any>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.captive.getContext(gatewayMacParam, gatewayApParam);
      setCtx(data);
      const villages: Village[] = data.coverageVillages || [];
      if (villages.length > 0 && !regVillageId) {
        setRegVillageId(villages[0].id);
      }
      const methods: PaymentMethodConfig[] = data.paymentMethods || [];
      if (methods.length > 0 && !selectedMethodId) {
        setSelectedMethodId(methods[0].id);
      }
      if (data.gateway?.gatewayMacNormalized) {
        setManualMac(data.gateway.gatewayMacNormalized);
      }

      if (data.recognizedDevice) {
        if (data.recognizedDevice.subscription?.status === 'Expired') {
          setScreen('expired');
        } else {
          setScreen('returning');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gatewayApParam, gatewayMacParam, regVillageId, selectedMethodId]);

  const loadCustomerDashboard = useCallback(async () => {
    if (!customerToken) return;
    try {
      const dash = await api.customer.getDashboard();
      setDashboard(dash);
      updateCustomerUser(dash.user);
      if (dash.devices?.length > 0 && !activeDevice) {
        const matched = gatewayMacParam
          ? dash.devices.find(
              (d: RegisteredDevice) =>
                d.macAddress.toUpperCase() === gatewayMacParam.toUpperCase(),
            )
          : null;
        setActiveDevice(matched || dash.devices[0]);
      }
    } catch {
      logoutCustomer();
    }
  }, [activeDevice, customerToken, gatewayMacParam, logoutCustomer, updateCustomerUser]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (customerToken) {
      loadCustomerDashboard();
    }
  }, [customerToken, loadCustomerDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.auth.login({ mobileNumber: loginMobile, password: loginPassword });
      setCustomerAuth(res.token, res.user);
      const dash = await api.customer.getDashboard();
      setDashboard(dash);
      if (res.user.verificationStatus !== 'Verified') {
        setScreen('verification');
      } else if (!dash.devices || dash.devices.length === 0) {
        setScreen('device');
      } else {
        setActiveDevice(dash.devices[0]);
        setScreen('packages');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.auth.register({
        fullName: regName,
        cnicNumber: regCnic,
        mobileNumber: regMobile,
        villageId: regVillageId,
        password: regPassword,
        confirmPassword: regConfirm,
        consentAccepted: regConsent,
      });
      setCustomerAuth(res.token, res.user);
      setScreen('verification');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.customer.registerDevice({
        deviceName,
        deviceType,
        macAddress: manualMac,
        associationSource: ctx?.gateway?.macProvidedByGateway
          ? 'gateway_redirect'
          : 'gateway_simulation',
      });
      setActiveDevice(res.device);
      await loadCustomerDashboard();
      setScreen('packages');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleStartPayment = async () => {
    if (!activeDevice || !selectedPkg || !selectedMethodId) return;
    setError('');
    setBusy(true);
    try {
      const res = await api.customer.initiatePurchase({
        deviceId: activeDevice.id,
        packageId: selectedPkg.id,
        methodId: selectedMethodId,
        idempotencyKey: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });
      setCurrentPayment(res.payment);
      setScreen('payment');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPayment = async (outcome: 'Successful' | 'Failed') => {
    if (!currentPayment) return;
    setError('');
    setBusy(true);
    try {
      const res = await api.customer.simulatePaymentWebhook(currentPayment.id, outcome);
      setCurrentPayment(res.payment);
      setActivationOutcome(res.activation);
      await loadCustomerDashboard();
      await loadContext();
      if (outcome === 'Successful') {
        setScreen('activation');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const packages: PackagePlan[] = ctx?.packages || [];
  const coverageVillages: Village[] = ctx?.coverageVillages || [];
  const paymentMethods: PaymentMethodConfig[] = ctx?.paymentMethods || [];

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FAF9F6] text-[#132238] flex flex-col justify-between"
    >
      {/* Compact Lightweight Mobile Top Bar (<=15% viewport height) */}
      <header className="sticky top-0 z-30 h-14 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#E2E0DA] px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <VilloTharLogo size="sm" />
          <span className="font-display font-bold text-base text-[#132238] truncate">
            VilloThar Wi-Fi
          </span>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-[#F3F1EC] rounded-lg border border-[#E2E0DA] shrink-0">
          {(['en', 'ur', 'sd'] as LocaleCode[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md min-h-[30px] ${
                locale === code ? 'bg-[#FFFFFF] text-[#132238] shadow-xs' : 'text-[#475569]'
              }`}
            >
              {code === 'en' ? 'EN' : code === 'ur' ? 'اردو' : 'سنڌي'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Mobile-First Captive Card Container (expands cleanly on desktop) */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Gateway Context Strip */}
        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2E0DA] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#475569]">
            <Wifi className="w-4 h-4 text-[#0B66A8] shrink-0" />
            <span>
              Gateway MAC:{' '}
              <strong className="font-mono-data text-[#132238]">
                {ctx?.gateway?.macProvidedByGateway
                  ? ctx.gateway.gatewayMacMasked
                  : 'Not passed in URL'}
              </strong>
            </span>
          </div>
          <span className="font-mono-data text-[11px] text-[#64748B]">{gatewayApParam}</span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-sm text-[#B91C1C] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#E2E0DA] text-center text-sm text-[#64748B]">
            Checking captive gateway status...
          </div>
        ) : (
          <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-2xl p-5 sm:p-6 space-y-5">
            {/* SCREEN 1: WELCOME */}
            {screen === 'welcome' && (
              <div className="space-y-5 text-center">
                <div className="flex justify-center">
                  <VilloTharLogo size="lg" />
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-2xl font-bold text-[#132238]">
                    {t('captiveWelcomeTitle')}
                  </h1>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    {t('captiveWelcomeDesc')}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setScreen('login')}
                    className="w-full py-3 px-4 rounded-xl bg-[#0B66A8] hover:bg-[#085186] text-white text-sm font-semibold min-h-[48px]"
                  >
                    {t('captiveLogin')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('register')}
                    className="w-full py-3 px-4 rounded-xl bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-[#E2E0DA] text-[#132238] text-sm font-semibold min-h-[48px]"
                  >
                    {t('captiveRegister')}
                  </button>
                </div>

                {customerUser && (
                  <div className="pt-3 border-t border-[#E2E0DA] text-xs text-[#475569] flex items-center justify-between">
                    <span>Signed in as {customerUser.fullName}</span>
                    <button
                      type="button"
                      onClick={() => setScreen('device')}
                      className="font-semibold text-[#0B66A8] hover:underline"
                    >
                      Continue Session
                    </button>
                  </div>
                )}

                {/* Honest Preview Helper: Gateway Redirect Simulator */}
                <div className="pt-4 border-t border-[#E2E0DA] text-left space-y-2">
                  <p className="text-xs font-semibold text-[#132238]">
                    Test Gateway Redirect (Preview Without Physical Router)
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Browsers cannot read hardware MAC addresses directly. In production, the village router redirects here with <code>?mac=...</code>. Simulate a gateway handoff:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={simMacInput}
                      onChange={(e) => setSimMacInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-xs font-mono-data"
                    />
                    <button
                      type="button"
                      onClick={() => setSearchParams({ mac: simMacInput, ap: gatewayApParam })}
                      className="px-3 py-2 rounded-lg border border-[#E2E0DA] text-xs font-semibold hover:bg-[#FAF9F6] min-h-[40px]"
                    >
                      Simulate Gateway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2A: LOGIN */}
            {screen === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setScreen('welcome')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] min-h-[36px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <h2 className="font-display text-xl font-bold">{t('captiveLogin')}</h2>
                <div>
                  <label className="block text-xs font-medium mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={loginMobile}
                    onChange={(e) => setLoginMobile(e.target.value)}
                    placeholder="03XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                >
                  {busy ? 'Checking...' : 'Login & Continue'}
                </button>
              </form>
            )}

            {/* SCREEN 2B: REGISTRATION */}
            {screen === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => setScreen('welcome')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] min-h-[36px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <h2 className="font-display text-xl font-bold">{t('captiveRegister')}</h2>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
                <input
                  type="text"
                  required
                  value={regCnic}
                  onChange={(e) => setRegCnic(formatCnicInput(e.target.value))}
                  placeholder="CNIC (44301-1234567-1)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data"
                />
                <input
                  type="tel"
                  required
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="Mobile (03XXXXXXXXX)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data"
                />
                <select
                  value={regVillageId}
                  onChange={(e) => setRegVillageId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                >
                  {coverageVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.coverageStatus})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Password (8+)"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Confirm"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  />
                </div>
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] text-xs text-[#475569]">
                  <input
                    type="checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-0.5 accent-[#0B66A8]"
                  />
                  <span>I consent to CNIC identity verification and device data processing.</span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                >
                  {busy ? 'Registering...' : 'Submit & Verify Identity'}
                </button>
              </form>
            )}

            {/* SCREEN 3: IDENTITY VERIFICATION */}
            {screen === 'verification' && customerUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#0B66A8]">
                  <ShieldCheck className="w-5 h-5" />
                  <h2 className="font-display text-xl font-bold text-[#132238]">
                    Identity Verification Status
                  </h2>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">CNIC ({customerUser.cnicMasked})</span>
                    <StatusLabel status={customerUser.verificationStatus} compact />
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {customerUser.verificationNote ||
                      'Verification status comes from our configurable NADRA integration channel.'}
                  </p>
                  {customerUser.verificationProviderRef && (
                    <p className="font-mono-data text-[11px] text-[#64748B]">
                      Ref: {customerUser.verificationProviderRef}
                    </p>
                  )}
                </div>

                {customerUser.verificationStatus === 'Verified' ? (
                  <button
                    type="button"
                    onClick={() => setScreen('device')}
                    className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                  >
                    Continue to Device Registration
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await api.customer.resubmitVerification(false);
                          updateCustomerUser(res.user);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                    >
                      Refresh / Re-check Verification
                    </button>
                    <Link
                      to="/contact"
                      className="block w-full py-3 text-center rounded-xl border border-[#E2E0DA] text-sm font-semibold text-[#132238] min-h-[48px]"
                    >
                      Contact Support for Manual Review
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 4: DEVICE REGISTRATION */}
            {screen === 'device' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#0B66A8]">
                  <Smartphone className="w-5 h-5" />
                  <h2 className="font-display text-xl font-bold text-[#132238]">
                    Device Registration & MAC Binding
                  </h2>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Your Wi-Fi MAC address identifies this specific phone or laptop to village routers. Keep &ldquo;Use Device MAC&rdquo; enabled for VilloThar Wi-Fi so your package stays bound correctly.
                </p>

                {dashboard?.devices?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#132238]">
                      Or pick an already registered device:
                    </p>
                    {dashboard.devices.map((d: RegisteredDevice) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setActiveDevice(d);
                          setScreen('packages');
                        }}
                        className="w-full p-3 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-left flex items-center justify-between min-h-[48px]"
                      >
                        <div>
                          <p className="text-sm font-semibold">{d.deviceName}</p>
                          <p className="font-mono-data text-xs text-[#64748B]">{d.macMasked}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#0B66A8]">Select</span>
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleRegisterDevice} className="space-y-3 pt-2 border-t border-[#E2E0DA]">
                  <input
                    type="text"
                    required
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Device Name (e.g. My Android Phone)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                      className="px-3 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                    >
                      <option value="Mobile">Mobile</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={manualMac}
                      onChange={(e) => setManualMac(e.target.value)}
                      placeholder="A4:5E:60:C1:88:12"
                      className="px-3 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-xs font-mono-data"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                  >
                    {busy ? 'Registering Device...' : 'Associate Device & Continue'}
                  </button>
                </form>
              </div>
            )}

            {/* SCREEN 5: PACKAGE SELECTION */}
            {screen === 'packages' && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">{t('captiveSelectPackage')}</h2>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] text-xs text-[#475569] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#0B66A8] shrink-0 mt-0.5" />
                  <span>
                    {t('captivePerDeviceRule')} Target device:{' '}
                    <strong className="text-[#132238]">{activeDevice?.deviceName}</strong>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPkg(pkg)}
                      className={`w-full p-4 rounded-xl border text-left flex items-center justify-between min-h-[56px] ${
                        selectedPkg?.id === pkg.id
                          ? 'border-[#0B66A8] bg-[#0B66A8]/5'
                          : 'border-[#E2E0DA] bg-[#FAF9F6]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-[#132238]">{pkg.name}</p>
                        <p className="font-mono-data text-xs text-[#64748B]">
                          {pkg.speedMbps} Mbps · {pkg.validityDays}{' '}
                          {pkg.validityDays === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                      <span className="font-mono-data text-lg font-bold text-[#132238]">
                        Rs {pkg.pricePkr}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold text-[#132238]">
                    Payment Method (Sandbox Test Mode)
                  </label>
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!selectedPkg || busy}
                  onClick={handleStartPayment}
                  className="w-full py-3 rounded-xl bg-[#0B66A8] disabled:opacity-50 text-white text-sm font-semibold min-h-[48px]"
                >
                  {busy ? 'Creating Order...' : t('captivePayNow')}
                </button>
              </div>
            )}

            {/* SCREEN 6: PAYMENT */}
            {screen === 'payment' && currentPayment && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Payment Confirmation</h2>
                  <StatusLabel status={currentPayment.status} compact />
                </div>

                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Device</span>
                    <span className="font-medium">{activeDevice?.deviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Package</span>
                    <span className="font-medium">{selectedPkg?.name} (2 Mbps)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Method</span>
                    <span className="font-medium text-right">{currentPayment.methodName}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E2E0DA]">
                    <span className="font-semibold">Total Amount</span>
                    <span className="font-mono-data font-bold text-lg">
                      Rs {currentPayment.amountPkr}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#475569]">
                  Sandbox Test Payment Mode: Internet access activates only after the backend verifies the gateway callback.
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleConfirmPayment('Successful')}
                    className="w-full py-3 rounded-xl bg-[#15803D] text-white text-sm font-semibold min-h-[48px]"
                  >
                    {busy ? 'Verifying...' : 'Confirm Sandbox Payment Callback'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleConfirmPayment('Failed')}
                    className="w-full py-3 rounded-xl border border-[#B91C1C]/35 text-[#B91C1C] text-sm font-semibold min-h-[48px]"
                  >
                    Simulate Payment Failure
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 7: ACTIVATION */}
            {screen === 'activation' && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">Network Activation Progress</h2>

                <div className="space-y-2.5">
                  {[
                    { label: 'Payment Confirmed by Backend', done: true },
                    {
                      label: 'Subscription Active for Device',
                      done: Boolean(activationOutcome?.activated),
                    },
                    {
                      label: activationOutcome?.hardwareConnected
                        ? 'Router / RADIUS Authorization Confirmed'
                        : activationOutcome?.isSandboxNetwork
                          ? 'Sandbox Network Adapter Authorized (Hardware Pending)'
                          : 'Authorization Queued (Physical Hardware Disconnected)',
                      done: Boolean(activationOutcome?.authorized),
                    },
                  ].map((step) => (
                    <div
                      key={step.label}
                      className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] flex items-center gap-3 text-sm"
                    >
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#B45309] shrink-0" />
                      )}
                      <span className="font-medium text-[#132238]">{step.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#475569] leading-relaxed">
                  {activationOutcome?.message}
                </p>

                <Link
                  to="/portal"
                  className="block w-full py-3 text-center rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                >
                  Open Customer Dashboard
                </Link>
              </div>
            )}

            {/* SCREEN 8: RETURNING CUSTOMER */}
            {screen === 'returning' && ctx?.recognizedDevice && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Device Recognized</h2>
                  <StatusLabel status={ctx.recognizedDevice.networkAuthorizationStatus} compact />
                </div>

                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E0DA] space-y-2 text-sm">
                  <p>
                    <span className="text-[#64748B]">Device:</span>{' '}
                    <strong>{ctx.recognizedDevice.deviceName}</strong> ({ctx.recognizedDevice.macMasked})
                  </p>
                  <p>
                    <span className="text-[#64748B]">Owner:</span> {ctx.recognizedDevice.ownerName}
                  </p>
                  <p>
                    <span className="text-[#64748B]">Package:</span>{' '}
                    {ctx.recognizedDevice.subscription
                      ? `${ctx.recognizedDevice.subscription.packageName} (${ctx.recognizedDevice.subscription.status})`
                      : 'No active subscription'}
                  </p>
                  {ctx.recognizedDevice.subscription?.expiryDate && (
                    <p className="font-mono-data text-xs text-[#475569]">
                      Expires: {new Date(ctx.recognizedDevice.subscription.expiryDate).toLocaleString()}
                    </p>
                  )}
                </div>

                {ctx.recognizedDevice.eligibilityReasons?.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 text-xs text-[#92400E]">
                    {ctx.recognizedDevice.eligibilityReasons.join(' ')}
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setScreen(customerToken ? 'packages' : 'login')}
                    className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                  >
                    Buy or Renew Package for This Device
                  </button>
                  <Link
                    to="/contact"
                    className="block w-full py-3 text-center rounded-xl border border-[#E2E0DA] text-sm font-semibold text-[#132238] min-h-[48px]"
                  >
                    Connection Trouble? Get Support
                  </Link>
                </div>
              </div>
            )}

            {/* SCREEN 9: EXPIRED PACKAGE */}
            {screen === 'expired' && ctx?.recognizedDevice && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center mx-auto">
                  <WifiOff className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold">Your Package Has Expired</h2>
                <p className="text-sm text-[#475569]">
                  Internet access for <strong>{ctx.recognizedDevice.deviceName}</strong> ({ctx.recognizedDevice.macMasked}) is paused until you renew a 2 Mbps package.
                </p>
                <button
                  type="button"
                  onClick={() => setScreen(customerToken ? 'packages' : 'login')}
                  className="w-full py-3 rounded-xl bg-[#0B66A8] text-white text-sm font-semibold min-h-[48px]"
                >
                  Renew Package Now
                </button>
                <Link
                  to="/contact"
                  className="block w-full py-2.5 text-xs font-medium text-[#475569] hover:underline"
                >
                  Need help? Contact VilloThar Support
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-4 px-4 text-center text-xs text-[#64748B] border-t border-[#E2E0DA] bg-[#FFFFFF]">
        <div className="max-w-xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>VilloThar Captive Portal</span>
          <Link to="/" className="text-[#0B66A8] hover:underline">
            Return to Official Website
          </Link>
        </div>
      </footer>
    </div>
  );
}
