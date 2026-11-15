const CUSTOMER_TOKEN_KEY = 'villothar_customer_token';
const ADMIN_TOKEN_KEY = 'villothar_admin_token';

export function getCustomerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string | null) {
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  tokenKind: 'none' | 'customer' | 'admin' = 'none',
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokenKind === 'customer') {
    const token = getCustomerToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } else if (tokenKind === 'admin') {
    const token = getAdminToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  public: {
    getOverview: () => request<any>('/api/public/overview'),
    submitSupport: (body: any) =>
      request<any>('/api/public/support', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  auth: {
    register: (body: any) =>
      request<any>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: any) =>
      request<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    forgotPassword: (mobileNumber: string) =>
      request<any>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ mobileNumber }),
      }),
    resetPassword: (body: any) =>
      request<any>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminLogin: (body: any) =>
      request<any>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  customer: {
    getDashboard: () => request<any>('/api/customer/dashboard', {}, 'customer'),
    resubmitVerification: (requestManualReview = false) =>
      request<any>(
        '/api/customer/verification/resubmit',
        { method: 'POST', body: JSON.stringify({ requestManualReview }) },
        'customer',
      ),
    registerDevice: (body: any) =>
      request<any>(
        '/api/customer/devices',
        { method: 'POST', body: JSON.stringify(body) },
        'customer',
      ),
    updateDeviceMac: (deviceId: string, body: any) =>
      request<any>(
        `/api/customer/devices/${deviceId}/mac`,
        { method: 'PATCH', body: JSON.stringify(body) },
        'customer',
      ),
    removeDevice: (deviceId: string) =>
      request<any>(
        `/api/customer/devices/${deviceId}`,
        { method: 'DELETE' },
        'customer',
      ),
    initiatePurchase: (body: any) =>
      request<any>(
        '/api/customer/purchases',
        { method: 'POST', body: JSON.stringify(body) },
        'customer',
      ),
    simulatePaymentWebhook: (paymentId: string, outcome: 'Successful' | 'Failed') =>
      request<any>(
        `/api/customer/payments/${paymentId}/webhook-simulate`,
        { method: 'POST', body: JSON.stringify({ outcome }) },
        'customer',
      ),
    createTicket: (body: any) =>
      request<any>(
        '/api/customer/tickets',
        { method: 'POST', body: JSON.stringify(body) },
        'customer',
      ),
    replyTicket: (ticketId: string, message: string) =>
      request<any>(
        `/api/customer/tickets/${ticketId}/reply`,
        { method: 'POST', body: JSON.stringify({ message }) },
        'customer',
      ),
    updateProfile: (body: any) =>
      request<any>(
        '/api/customer/profile',
        { method: 'PATCH', body: JSON.stringify(body) },
        'customer',
      ),
  },
  captive: {
    getContext: (mac?: string | null, ap?: string | null) => {
      const params = new URLSearchParams();
      if (mac) params.set('mac', mac);
      if (ap) params.set('ap', ap);
      const q = params.toString();
      return request<any>(`/api/captive/session-context${q ? `?${q}` : ''}`);
    },
    associateGatewayMac: (body: {
      deviceId: string;
      macAddress: string;
      source: 'gateway_redirect' | 'gateway_simulation';
    }) =>
      request<any>(
        '/api/captive/associate-gateway-mac',
        { method: 'POST', body: JSON.stringify(body) },
        'customer',
      ),
  },
  admin: {
    getOverview: () => request<any>('/api/admin/overview', {}, 'admin'),
    toggleSandboxDemo: (enable: boolean) =>
      request<any>(
        '/api/admin/sandbox-demo',
        { method: 'POST', body: JSON.stringify({ enable }) },
        'admin',
      ),
    getCustomers: () => request<any>('/api/admin/customers', {}, 'admin'),
    revealCustomerCnic: (id: string) =>
      request<any>(`/api/admin/customers/${id}/cnic`, {}, 'admin'),
    updateCustomerVerification: (id: string, status: string, note: string) =>
      request<any>(
        `/api/admin/customers/${id}/verification`,
        { method: 'PATCH', body: JSON.stringify({ status, note }) },
        'admin',
      ),
    updateCustomerStatus: (id: string, accountStatus: 'Active' | 'Suspended') =>
      request<any>(
        `/api/admin/customers/${id}/status`,
        { method: 'PATCH', body: JSON.stringify({ accountStatus }) },
        'admin',
      ),
    getDevices: () => request<any>('/api/admin/devices', {}, 'admin'),
    updateDeviceStatus: (id: string, body: any) =>
      request<any>(
        `/api/admin/devices/${id}/status`,
        { method: 'PATCH', body: JSON.stringify(body) },
        'admin',
      ),
    evaluateDeviceAuth: (id: string) =>
      request<any>(
        `/api/admin/devices/${id}/evaluate-auth`,
        { method: 'POST' },
        'admin',
      ),
    getPackages: () => request<any>('/api/admin/packages', {}, 'admin'),
    createPackage: (body: any) =>
      request<any>(
        '/api/admin/packages',
        { method: 'POST', body: JSON.stringify(body) },
        'admin',
      ),
    updatePackage: (id: string, body: any) =>
      request<any>(
        `/api/admin/packages/${id}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        'admin',
      ),
    getPayments: () => request<any>('/api/admin/payments', {}, 'admin'),
    reconcilePayment: (id: string, status: string, note: string) =>
      request<any>(
        `/api/admin/payments/${id}/reconcile`,
        { method: 'PATCH', body: JSON.stringify({ status, note }) },
        'admin',
      ),
    getVillages: () => request<any>('/api/admin/villages', {}, 'admin'),
    addVillage: (body: any) =>
      request<any>(
        '/api/admin/villages',
        { method: 'POST', body: JSON.stringify(body) },
        'admin',
      ),
    updateVillage: (id: string, body: any) =>
      request<any>(
        `/api/admin/villages/${id}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        'admin',
      ),
    getNetwork: () => request<any>('/api/admin/network', {}, 'admin'),
    addMaintenanceLog: (equipmentId: string, summary: string) =>
      request<any>(
        `/api/admin/network/equipment/${equipmentId}/maintenance`,
        { method: 'POST', body: JSON.stringify({ summary }) },
        'admin',
      ),
    terminateSession: (sessionId: string) =>
      request<any>(
        `/api/admin/network/sessions/${sessionId}/terminate`,
        { method: 'POST' },
        'admin',
      ),
    getTickets: () => request<any>('/api/admin/tickets', {}, 'admin'),
    updateTicket: (id: string, body: any) =>
      request<any>(
        `/api/admin/tickets/${id}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        'admin',
      ),
    getSiteConfig: () => request<any>('/api/admin/site-config', {}, 'admin'),
    updateSiteConfig: (body: any) =>
      request<any>(
        '/api/admin/site-config',
        { method: 'PATCH', body: JSON.stringify(body) },
        'admin',
      ),
    getAuditLogs: () => request<any>('/api/admin/audit-logs', {}, 'admin'),
  },
};
