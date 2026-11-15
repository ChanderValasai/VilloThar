import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { VilloTharLogo } from './VilloTharLogo';
import { useAuth } from '../context/AuthContext';
import { LocaleCode, useLanguage } from '../context/LanguageContext';
import { resolveSupportEmail, resolveWhatsAppSupport } from '../utils/contactLinks';

interface PublicLayoutProps {
  children: React.ReactNode;
  contact?: {
    supportPhone: string;
    supportEmail: string;
    officeAddress: string;
    supportHours: string;
  };
}

export function PublicLayout({ children, contact }: PublicLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { customerToken } = useAuth();
  const { locale, setLocale, isRtl, t } = useLanguage();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-1 border-b-2 ${
      isActive
        ? 'text-[#0B66A8] border-[#0B66A8]'
        : 'text-[#475569] border-transparent hover:text-[#132238] hover:border-[#E2E0DA]'
    }`;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#132238]">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#E2E0DA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Lockup (Single line, no location badges or subtitles) */}
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0B66A8] rounded-md"
          >
            <VilloTharLogo size="sm" />
            <span className="font-display text-lg font-bold tracking-tight text-[#132238]">
              {t('brandName')}
            </span>
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            <NavLink to="/about" className={navLinkClass}>
              {t('navAbout')}
            </NavLink>
            <NavLink to="/packages" className={navLinkClass}>
              {t('navPackages')}
            </NavLink>
            <NavLink to="/coverage" className={navLinkClass}>
              {t('navCoverage')}
            </NavLink>
            <NavLink to="/how-it-works" className={navLinkClass}>
              {t('navHowItWorks')}
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              {t('navSupport')}
            </NavLink>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={customerToken ? '/portal' : '/portal/login'}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              {customerToken ? 'My Account' : t('navPortal')}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E2E0DA] text-[#132238] hover:bg-[#F3F1EC]"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E2E0DA] bg-[#FFFFFF] px-4 py-4 space-y-2">
            <nav className="flex flex-col space-y-1">
              {[
                { to: '/about', label: t('navAbout') },
                { to: '/packages', label: t('navPackages') },
                { to: '/coverage', label: t('navCoverage') },
                { to: '/how-it-works', label: t('navHowItWorks') },
                { to: '/contact', label: t('navSupport') },
                { to: '/captive', label: 'Captive Portal' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#132238] hover:bg-[#F3F1EC] min-h-[44px] flex items-center"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to={customerToken ? '/portal' : '/portal/login'}
                onClick={() => setMobileOpen(false)}
                className="mt-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#0B66A8] text-center min-h-[44px] flex items-center justify-center"
              >
                {customerToken ? 'Open Customer Dashboard' : t('navPortal')}
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet, Informative Footer */}
      <footer className="border-t border-[#E2E0DA] bg-[#FFFFFF] text-[#475569]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <VilloTharLogo size="sm" />
              <span className="font-display text-base font-bold text-[#132238]">VilloThar</span>
            </div>
            <p className="text-sm leading-relaxed">
              Community-owned rural internet service initiative for Tharparkar, Sindh, Pakistan.
            </p>
            <div className="pt-2">
              <span className="text-xs font-medium text-[#64748B] block mb-1.5">
                {t('captiveLanguageLabel')}
              </span>
              <div className="inline-flex items-center gap-1 p-1 bg-[#F3F1EC] rounded-lg border border-[#E2E0DA]">
                {(['en', 'ur', 'sd'] as LocaleCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      locale === code
                        ? 'bg-[#FFFFFF] text-[#132238] shadow-xs'
                        : 'text-[#475569] hover:text-[#132238]'
                    }`}
                  >
                    {code === 'en' ? 'English' : code === 'ur' ? 'اردو' : 'سنڌي'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#132238] mb-3">Public Information</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-[#0B66A8]">
                  About VilloThar
                </Link>
              </li>
              <li>
                <Link to="/packages" className="hover:text-[#0B66A8]">
                  Internet Packages (2 Mbps)
                </Link>
              </li>
              <li>
                <Link to="/coverage" className="hover:text-[#0B66A8]">
                  Coverage & Mithi NOC
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-[#0B66A8]">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#132238] mb-3">Portals & Operations</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/captive" className="hover:text-[#0B66A8]">
                  Wi-Fi Captive Portal (Mobile)
                </Link>
              </li>
              <li>
                <Link to="/portal/login" className="hover:text-[#0B66A8]">
                  Customer Login
                </Link>
              </li>
              <li>
                <Link to="/portal/register" className="hover:text-[#0B66A8]">
                  New Customer Registration
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-[#0B66A8]">
                  Admin & NOC Operations
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#132238] mb-3">Support & Network Hub</h3>
            {(() => {
              const wa = resolveWhatsAppSupport(contact?.supportPhone);
              const email = resolveSupportEmail(contact?.supportEmail);
              return (
                <ul className="space-y-2 text-sm">
                  <li>{contact?.officeAddress || 'Mithi NOC & Pabohar Community Desk, Tharparkar'}</li>
                  <li>
                    WhatsApp:{' '}
                    <a
                      href={wa.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0B66A8] font-medium font-mono-data hover:underline"
                    >
                      {wa.display}
                    </a>
                  </li>
                  <li>
                    Email:{' '}
                    <a href={`mailto:${email}`} className="text-[#0B66A8] font-medium hover:underline">
                      {email}
                    </a>
                  </li>
                  <li>
                    <Link to="/contact" className="text-[#0B66A8] font-medium hover:underline">
                      Submit Support Request
                    </Link>
                  </li>
                </ul>
              );
            })()}
          </div>
        </div>

        <div className="border-t border-[#E2E0DA] bg-[#FAF9F6]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <p>
              VilloThar Community Internet Initiative · Tharparkar, Sindh · Indicative pilot pricing subject to confirmation.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/how-it-works" className="hover:text-[#132238]">
                Acceptable Use & Device Policy
              </Link>
              <Link to="/contact" className="hover:text-[#132238]">
                CNIC Privacy Notice
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
