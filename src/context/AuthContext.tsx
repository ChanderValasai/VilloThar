import React, { createContext, useContext, useState } from 'react';
import { AdminUserPublic, CustomerPublic } from '../types/domain';
import {
  getAdminToken,
  getCustomerToken,
  setAdminToken,
  setCustomerToken,
} from '../services/api';

interface AuthContextValue {
  customerToken: string | null;
  customerUser: CustomerPublic | null;
  adminToken: string | null;
  adminUser: AdminUserPublic | null;
  setCustomerAuth: (token: string, user: CustomerPublic) => void;
  updateCustomerUser: (user: CustomerPublic) => void;
  logoutCustomer: () => void;
  setAdminAuth: (token: string, admin: AdminUserPublic) => void;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customerToken, setCustTokenState] = useState<string | null>(() =>
    getCustomerToken(),
  );
  const [customerUser, setCustomerUser] = useState<CustomerPublic | null>(() => {
    try {
      const raw = localStorage.getItem('villothar_customer_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [adminToken, setAdmTokenState] = useState<string | null>(() =>
    getAdminToken(),
  );
  const [adminUser, setAdminUser] = useState<AdminUserPublic | null>(() => {
    try {
      const raw = localStorage.getItem('villothar_admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setCustomerAuth = (token: string, user: CustomerPublic) => {
    setCustomerToken(token);
    setCustTokenState(token);
    setCustomerUser(user);
    localStorage.setItem('villothar_customer_user', JSON.stringify(user));
  };

  const updateCustomerUser = (user: CustomerPublic) => {
    setCustomerUser(user);
    localStorage.setItem('villothar_customer_user', JSON.stringify(user));
  };

  const logoutCustomer = () => {
    setCustomerToken(null);
    setCustTokenState(null);
    setCustomerUser(null);
    localStorage.removeItem('villothar_customer_user');
  };

  const setAdminAuth = (token: string, admin: AdminUserPublic) => {
    setAdminToken(token);
    setAdmTokenState(token);
    setAdminUser(admin);
    localStorage.setItem('villothar_admin_user', JSON.stringify(admin));
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdmTokenState(null);
    setAdminUser(null);
    localStorage.removeItem('villothar_admin_user');
  };

  return (
    <AuthContext.Provider
      value={{
        customerToken,
        customerUser,
        adminToken,
        adminUser,
        setCustomerAuth,
        updateCustomerUser,
        logoutCustomer,
        setAdminAuth,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
