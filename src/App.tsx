import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AboutPage } from './pages/AboutPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CaptivePortalPage } from './pages/CaptivePortalPage';
import { ContactSupportPage } from './pages/ContactSupportPage';
import { CoveragePage } from './pages/CoveragePage';
import {
  CustomerLoginPage,
  CustomerRegisterPage,
  ForgotPasswordPage,
} from './pages/CustomerAuthPages';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { PackagesPage } from './pages/PackagesPage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Website */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/coverage" element={<CoveragePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/contact" element={<ContactSupportPage />} />

            {/* Customer Portal */}
            <Route path="/portal/login" element={<CustomerLoginPage />} />
            <Route path="/portal/register" element={<CustomerRegisterPage />} />
            <Route path="/portal/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/portal" element={<CustomerPortalPage />} />

            {/* Captive Portal (Mobile-First) */}
            <Route path="/captive" element={<CaptivePortalPage />} />

            {/* Admin & Mithi NOC Dashboard */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
