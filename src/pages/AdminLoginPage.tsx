import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { VilloTharLogo } from '../components/VilloTharLogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAdminAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.adminLogin({ email, password });
      setAdminAuth(res.token, res.admin);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Operator sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto bg-[#FFFFFF] border border-[#E2E0DA] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <VilloTharLogo size="sm" />
            <span className="font-display font-bold text-lg text-[#132238]">VilloThar</span>
          </Link>
          <span className="text-xs font-medium text-[#64748B] flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#0B66A8]" />
            NOC & Admin
          </span>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-[#132238]">
            Operator Console Sign In
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Role-based access for Mithi NOC, Support Agents, and Finance Reviewers.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#132238] mb-1">
              Operator Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@villothar.local"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#132238] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Operator password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#0B66A8] hover:bg-[#085186] text-white text-sm font-semibold min-h-[44px]"
          >
            {loading ? 'Authenticating...' : 'Sign In to NOC Dashboard'}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E2E0DA] space-y-2 text-xs text-[#64748B]">
          <p>
            Local Preview Bootstrap Accounts (password:{' '}
            <code className="font-mono-data text-[#132238]">VilloThar@NOC2026!</code>):
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Super Admin', email: 'operator@villothar.local' },
              { label: 'Network Operator', email: 'network@villothar.local' },
              { label: 'Support Agent', email: 'support@villothar.local' },
            ].map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => {
                  setEmail(acct.email);
                  setPassword('VilloThar@NOC2026!');
                }}
                className="px-2.5 py-1.5 rounded-md border border-[#E2E0DA] bg-[#FAF9F6] text-[#132238] hover:bg-[#F3F1EC]"
              >
                Fill {acct.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
