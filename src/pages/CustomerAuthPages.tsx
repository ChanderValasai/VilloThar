import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, Shield } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { BASELINE_VILLAGES } from '../data/publicBaseline';
import { api } from '../services/api';
import { Village } from '../types/domain';

function formatCnicInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageHint = searchParams.get('package');
  const { setCustomerAuth } = useAuth();

  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login({ mobileNumber, password });
      setCustomerAuth(res.token, res.user);
      navigate(packageHint ? `/portal?tab=buy&package=${packageHint}` : '/portal');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12 lg:py-16">
        <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-[#0B66A8]">Customer Portal</p>
            <h1 className="font-display text-2xl font-bold text-[#132238] mt-1">
              Sign in to your account
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Manage your devices, CNIC verification, and 2 Mbps internet packages.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-sm text-[#B91C1C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#132238] mb-1.5">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="03XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data focus:outline-none focus:border-[#0B66A8]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[#132238]">Password</label>
                <Link
                  to="/portal/forgot-password"
                  className="text-xs font-medium text-[#0B66A8] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] disabled:opacity-60 rounded-lg min-h-[44px]"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E2E0DA] text-sm text-[#475569] flex items-center justify-between">
            <span>New to VilloThar?</span>
            <Link
              to={packageHint ? `/portal/register?package=${packageHint}` : '/portal/register'}
              className="font-semibold text-[#0B66A8] hover:underline"
            >
              Create Customer Account
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageHint = searchParams.get('package');
  const { setCustomerAuth } = useAuth();

  const initialCoverageVillages = BASELINE_VILLAGES.filter((v) => v.role === 'Coverage');
  const [villages, setVillages] = useState<Village[]>(initialCoverageVillages);
  const [nadraMode, setNadraMode] = useState<'authorized' | 'sandbox'>('sandbox');
  const [fullName, setFullName] = useState('');
  const [cnicNumber, setCnicNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [villageId, setVillageId] = useState(initialCoverageVillages[0]?.id || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.public
      .getOverview()
      .then((data) => {
        const cov = (data.villages || []).filter((v: Village) => v.role === 'Coverage');
        if (cov.length > 0) {
          setVillages(cov);
          setVillageId(cov[0].id);
        }
        if (data.integrations?.nadraMode) setNadraMode(data.integrations.nadraMode);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{5}-\d{7}-\d{1}$/.test(cnicNumber)) {
      setError('CNIC must follow the 13-digit format XXXXX-XXXXXXX-X.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!consentAccepted) {
      setError('You must consent to identity verification and data processing to register.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register({
        fullName,
        cnicNumber,
        mobileNumber,
        villageId,
        password,
        confirmPassword,
        consentAccepted: true,
      });
      setCustomerAuth(res.token, res.user);
      navigate(packageHint ? `/portal?tab=buy&package=${packageHint}` : '/portal');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-4 py-10 lg:py-14">
        <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-[#0B66A8]">New Customer Onboarding</p>
            <h1 className="font-display text-2xl font-bold text-[#132238] mt-1">
              Register your VilloThar account
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Provide accurate personal and CNIC details. Your CNIC is encrypted at rest and masked on screen.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2E0DA] text-xs text-[#475569] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#0B66A8] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#132238]">
                NADRA Integration Status ({nadraMode === 'authorized' ? 'Authorized Channel' : 'Sandbox Placeholder Mode'}):
              </span>{' '}
              {nadraMode === 'sandbox'
                ? 'Official NADRA API authorization is pending. Submissions ending in 1 or 3 simulate Sandbox Match; 9 simulates Failure; others enter Manual Review.'
                : 'Submissions are routed to the authorized NADRA verification endpoint.'}
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-sm text-[#B91C1C]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#132238] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name as on CNIC"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  CNIC Number
                </label>
                <input
                  type="text"
                  required
                  value={cnicNumber}
                  onChange={(e) => setCnicNumber(formatCnicInput(e.target.value))}
                  placeholder="44301-1234567-1"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data focus:outline-none focus:border-[#0B66A8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="03XXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data focus:outline-none focus:border-[#0B66A8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#132238] mb-1.5">
                Coverage Village
              </label>
              <select
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.coverageStatus})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#64748B] mt-1">
                Only active or pilot customer coverage villages appear here (Mithi is NOC only).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#0B66A8]"
              />
              <span className="text-xs text-[#475569] leading-relaxed">
                I consent to identity verification through VilloThar&apos;s authorized verification channel and secure processing of my CNIC and device MAC data for internet access authorization.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] disabled:opacity-60 rounded-lg min-h-[44px]"
            >
              {loading ? 'Creating Account...' : 'Register & Check Verification'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E2E0DA] text-sm text-[#475569] flex items-center justify-between">
            <span>Already registered?</span>
            <Link to="/portal/login" className="font-semibold text-[#0B66A8] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function ForgotPasswordPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request');
  const [sandboxCodeNotice, setSandboxCodeNotice] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(mobileNumber);
      setMessage(res.message);
      setSandboxCodeNotice(res.sandboxResetCode || null);
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.resetPassword({ mobileNumber, resetCode, newPassword });
      setMessage(res.message);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12 lg:py-16">
        <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 text-[#0B66A8]">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-semibold">Account Recovery</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#132238]">Reset Password</h1>

          {error && (
            <div className="p-3 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-sm text-[#B91C1C]">
              {error}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="03XXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg min-h-[44px]"
              >
                {loading ? 'Generating Code...' : 'Request Reset Code'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-xs text-[#475569]">{message}</p>
              {sandboxCodeNotice && (
                <div className="p-3 rounded-lg bg-[#D97706]/10 border border-[#D97706]/30 text-xs text-[#92400E]">
                  Sandbox Reset Code (SMS gateway not connected):{' '}
                  <strong className="font-mono-data text-sm">{sandboxCodeNotice}</strong>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  6-Digit Reset Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#132238] mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg min-h-[44px]"
              >
                {loading ? 'Updating...' : 'Confirm Password Reset'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#15803D]/10 border border-[#15803D]/25 text-sm text-[#15803D] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{message}</span>
              </div>
              <Link
                to="/portal/login"
                className="block w-full py-3 text-center text-sm font-semibold text-white bg-[#0B66A8] rounded-lg"
              >
                Proceed to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
