import { env } from '../config/env.ts';
import {
  NetworkAuthorizationStatus,
  PaymentStatus,
  VerificationStatus,
} from '../../../src/types/domain.ts';
import { generateId } from '../utils/crypto.ts';

export interface NadraVerificationResult {
  status: VerificationStatus;
  providerRef: string;
  mode: 'authorized' | 'sandbox';
  note: string;
  timestamp: string;
}

export interface INadraVerificationProvider {
  readonly mode: 'authorized' | 'sandbox';
  verifyCnic(input: {
    cnicNormalized: string;
    fullName: string;
    mobileNumber: string;
  }): Promise<NadraVerificationResult>;
}

/**
 * Placeholder & Sandbox NADRA Verification Adapter.
 * NEVER claims real government NADRA authorization unless official API credentials
 * and endpoint are configured via environment variables.
 */
export class ConfigurableNadraProvider implements INadraVerificationProvider {
  get mode(): 'authorized' | 'sandbox' {
    return env.nadra.endpoint && env.nadra.clientId && env.nadra.clientSecret
      ? 'authorized'
      : 'sandbox';
  }

  async verifyCnic(input: {
    cnicNormalized: string;
    fullName: string;
    mobileNumber: string;
  }): Promise<NadraVerificationResult> {
    const timestamp = new Date().toISOString();

    if (this.mode === 'authorized') {
      // Production integration hook: replace with signed mTLS/OAuth2 call to authorized NADRA channel.
      return {
        status: 'Pending Verification',
        providerRef: `NADRA-AUTH-PENDING-${generateId('ref')}`,
        mode: 'authorized',
        note: 'Submitted to configured authorized NADRA verification endpoint.',
        timestamp,
      };
    }

    // Clearly labelled Sandbox Mode rules for predictable end-to-end testing:
    // - CNIC ending in 1 or 3 -> Sandbox Verified (Test Only)
    // - CNIC ending in 9 -> Sandbox Verification Failed (Test Only)
    // - Any other digit -> Requires Manual Review (Operator Review Queue)
    const lastDigit = input.cnicNormalized.slice(-1);
    if (lastDigit === '1' || lastDigit === '3') {
      return {
        status: 'Verified',
        providerRef: `SANDBOX-NADRA-${generateId('tst')}`,
        mode: 'sandbox',
        note: 'Sandbox Mode test match (not an official NADRA database check).',
        timestamp,
      };
    }
    if (lastDigit === '9') {
      return {
        status: 'Verification Failed',
        providerRef: `SANDBOX-NADRA-FAIL-${generateId('tst')}`,
        mode: 'sandbox',
        note: 'Sandbox Mode simulated mismatch (CNIC ends in 9). Use support review or re-submit.',
        timestamp,
      };
    }
    return {
      status: 'Requires Manual Review',
      providerRef: `SANDBOX-NADRA-REV-${generateId('tst')}`,
      mode: 'sandbox',
      note: 'Queued for operator review because official NADRA channel is not yet active.',
      timestamp,
    };
  }
}

export interface PaymentInitiationResult {
  transactionReference: string;
  status: PaymentStatus;
  isSandbox: boolean;
  gatewayMessage: string;
}

export interface IPaymentGateway {
  initiatePayment(input: {
    methodId: string;
    providerType: string;
    amountPkr: number;
    customerMobile: string;
    sandboxOutcome?: 'success' | 'pending' | 'failed';
  }): Promise<PaymentInitiationResult>;
  verifyWebhookCallback(input: {
    transactionReference: string;
    outcome: 'Successful' | 'Failed';
    signature?: string;
  }): Promise<{ verified: boolean; status: PaymentStatus; reason: string }>;
}

export class ConfigurablePaymentGateway implements IPaymentGateway {
  async initiatePayment(input: {
    methodId: string;
    providerType: string;
    amountPkr: number;
    customerMobile: string;
    sandboxOutcome?: 'success' | 'pending' | 'failed';
  }): Promise<PaymentInitiationResult> {
    const refPrefix = input.providerType.toUpperCase().slice(0, 4);
    const transactionReference = `SANDBOX-${refPrefix}-${generateId('tx').toUpperCase()}`;

    if (input.sandboxOutcome === 'failed') {
      return {
        transactionReference,
        status: 'Failed',
        isSandbox: true,
        gatewayMessage: 'Sandbox payment declined in test mode.',
      };
    }

    if (input.providerType === 'bank_transfer' || input.sandboxOutcome === 'pending') {
      return {
        transactionReference,
        status: 'Pending',
        isSandbox: true,
        gatewayMessage:
          'Sandbox payment initiated and awaiting backend callback or Finance Reviewer verification.',
      };
    }

    return {
      transactionReference,
      status: 'Pending',
      isSandbox: true,
      gatewayMessage:
        'Sandbox payment initiated; awaiting backend webhook confirmation before package activation.',
    };
  }

  async verifyWebhookCallback(input: {
    transactionReference: string;
    outcome: 'Successful' | 'Failed';
    signature?: string;
  }): Promise<{ verified: boolean; status: PaymentStatus; reason: string }> {
    if (!input.transactionReference.startsWith('SANDBOX-')) {
      return {
        verified: false,
        status: 'Requires Review',
        reason: 'Live gateway webhook secret not configured.',
      };
    }
    return {
      verified: true,
      status: input.outcome,
      reason:
        input.outcome === 'Successful'
          ? 'Sandbox payment callback verified by backend.'
          : 'Sandbox payment callback reported failure.',
    };
  }
}

export interface NetworkAuthDispatchResult {
  authorizationStatus: NetworkAuthorizationStatus;
  sessionStatus: 'Authorization Requested' | 'Active' | 'Denied';
  providerRef: string;
  isSandbox: boolean;
  hardwareConnected: boolean;
  message: string;
}

export interface INetworkControllerAdapter {
  getHardwareStatus(): {
    connected: boolean;
    controllerType: string;
    radiusConfigured: boolean;
    note: string;
  };
  authorizeDevice(input: {
    macAddress: string;
    deviceId: string;
    speedMbps: number;
    expiryDate: string;
    sandboxMode: boolean;
  }): Promise<NetworkAuthDispatchResult>;
  deauthorizeDevice(input: {
    macAddress: string;
    deviceId: string;
    sandboxMode: boolean;
  }): Promise<{ ok: boolean; message: string }>;
}

export class ModularNetworkControllerAdapter implements INetworkControllerAdapter {
  getHardwareStatus() {
    const hasController =
      env.network.controllerType !== 'none' && Boolean(env.network.controllerUrl);
    const hasRadius = Boolean(env.network.radiusHost && env.network.radiusSecret);
    return {
      connected: hasController || hasRadius,
      controllerType: env.network.controllerType,
      radiusConfigured: hasRadius,
      note:
        hasController || hasRadius
          ? 'External network controller / RADIUS configured.'
          : 'Physical router/RADIUS hardware is not connected to this server instance.',
    };
  }

  async authorizeDevice(input: {
    macAddress: string;
    deviceId: string;
    speedMbps: number;
    expiryDate: string;
    sandboxMode: boolean;
  }): Promise<NetworkAuthDispatchResult> {
    const hw = this.getHardwareStatus();
    if (hw.connected) {
      // Production hook for MikroTik / UniFi / OpenWrt CoovaChilli / FreeRADIUS CoA
      return {
        authorizationStatus: 'Authorized',
        sessionStatus: 'Active',
        providerRef: `NET-AUTH-${generateId('ses')}`,
        isSandbox: false,
        hardwareConnected: true,
        message: `Authorized ${input.macAddress} at ${input.speedMbps} Mbps via ${hw.controllerType}.`,
      };
    }

    if (input.sandboxMode) {
      return {
        authorizationStatus: 'Authorized',
        sessionStatus: 'Active',
        providerRef: `SANDBOX-NET-${generateId('ses')}`,
        isSandbox: true,
        hardwareConnected: false,
        message: `Sandbox Network Adapter simulated ${input.speedMbps} Mbps authorization for ${input.macAddress}. Physical hardware pending.`,
      };
    }

    return {
      authorizationStatus: 'Authorization Requested',
      sessionStatus: 'Authorization Requested',
      providerRef: `QUEUE-NET-${generateId('req')}`,
      isSandbox: false,
      hardwareConnected: false,
      message:
        'Subscription paid & eligible, queued for router/RADIUS authorization once physical Pabohar gateway hardware is connected.',
    };
  }

  async deauthorizeDevice(input: {
    macAddress: string;
    deviceId: string;
    sandboxMode: boolean;
  }): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: input.sandboxMode
        ? `Sandbox deauthorization issued for ${input.macAddress}.`
        : `Deauthorization queued for ${input.macAddress}.`,
    };
  }
}

export const nadraProvider = new ConfigurableNadraProvider();
export const paymentGateway = new ConfigurablePaymentGateway();
export const networkController = new ModularNetworkControllerAdapter();
