# VilloThar — Community Internet Website, Customer Portal, Captive Portal & NOC System

A community-owned rural internet service platform for **Tharparkar, Sindh, Pakistan**, connecting **Mithi (Network Operations Centre)** with **Pabohar (First Pilot Village, ~12 km)** and future villages managed by administrators.

## Key Modules

1. **Official Public Website** (`/`, `/about`, `/packages`, `/coverage`, `/how-it-works`, `/contact`)
   - Transparent launch pricing (`2 Mbps` per device): Daily `Rs 50` (1d), Weekly `Rs 200` (7d), Biweekly `Rs 350` (14d), Monthly `Rs 600` (30d).
   - Clear separation between **Mithi (NOC Hub Only)** and **Pabohar (First Pilot Village)**.
   - Editable support contact placeholders and public support ticket submission.
2. **Customer Portal** (`/portal/login`, `/portal/register`, `/portal/forgot-password`, `/portal`)
   - CNIC format validation (`XXXXX-XXXXXXX-X`), AES-256-GCM encryption at rest, masked display (`44301-*******-1`), and consent timestamping.
   - Per-device registration & MAC address audit history (with private/randomized MAC guidance).
   - Per-device package purchase (`1 device = 1 package`) with idempotent transaction keys and backend webhook verification.
3. **Captive Portal** (`/captive`)
   - Mobile-first onboarding flow with interactive **English / Urdu / Sindhi** (`EN / اردو / سنڌي`) switching and automatic RTL layout adaptation.
   - Handles gateway `?mac=...&ap=...` parameters (with a preview Gateway Redirect Simulator) without claiming browser JavaScript can read hardware MAC addresses.
4. **Admin & Mithi NOC Dashboard** (`/admin/login`, `/admin`)
   - Role-based access (`Super Admin`, `Network Operator`, `Support Agent`, `Finance Reviewer`).
   - Clean baseline by default plus a toggleable **Sandbox Demo Mode** (`Load Sandbox Demo Data`).
   - Audited full-CNIC reveal (`Super Admin` only), manual verification review, device/MAC controls, package & village management, auditable payment reconciliation, NOC equipment maintenance logs, support tickets, and security audit logs.

## External Integrations & Production Configuration

Configure environment variables via `.env` (see `.env.example`):

- **Security**: Set strong random values for `JWT_SECRET`, `CNIC_ENCRYPTION_KEY`, and `ADMIN_BOOTSTRAP_PASSWORD`.
- **Database**: Uses atomic local persistence (`.data/villothar-db.json`) by default with repository abstractions ready for MongoDB Atlas (`MONGODB_URI`).
- **NADRA Identity Verification**: Runs in clearly labelled Sandbox/Manual Review mode until `NADRA_API_ENDPOINT`, `NADRA_CLIENT_ID`, and `NADRA_CLIENT_SECRET` are configured for an officially authorized channel.
- **Payment Gateways**: Runs in configurable Test/Sandbox mode (`Easypaisa Sandbox`, `JazzCash Sandbox`, `Bank Transfer Sandbox`, `Generic Test Simulator`) until live merchant credentials and signed webhook handlers are connected.
- **Network Controller / RADIUS**: Runs in Disconnected / Sandbox Adapter mode until `NETWORK_CONTROLLER_TYPE`, `NETWORK_CONTROLLER_URL`, `RADIUS_HOST`, and `RADIUS_SECRET` are configured for physical MikroTik/UniFi/OpenWrt/FreeRADIUS equipment.

## Running Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm start
```
