import crypto from 'node:crypto';
import { env } from '../config/env.ts';

function deriveAesKey(): Buffer {
  return crypto.createHash('sha256').update(env.cnicEncryptionKey).digest();
}

export function normalizeCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  }
  return raw.trim();
}

export function isValidCnicFormat(cnic: string): boolean {
  return /^\d{5}-\d{7}-\d{1}$/.test(normalizeCnic(cnic));
}

export function maskCnic(cnic: string): string {
  const normalized = normalizeCnic(cnic);
  if (!isValidCnicFormat(normalized)) {
    return '*****-*******-*';
  }
  const parts = normalized.split('-');
  return `${parts[0]}-*******-${parts[2]}`;
}

export function hashCnicForLookup(cnic: string): string {
  const normalized = normalizeCnic(cnic);
  return crypto
    .createHmac('sha256', deriveAesKey())
    .update(normalized)
    .digest('hex');
}

export function encryptCnic(cnic: string): string {
  const normalized = normalizeCnic(cnic);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveAesKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCnic(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted CNIC payload');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveAesKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function normalizeMacAddress(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
  if (cleaned.length !== 12) {
    return raw.trim().toUpperCase();
  }
  return cleaned.match(/.{1,2}/g)!.join(':');
}

export function isValidMacAddress(mac: string): boolean {
  const normalized = normalizeMacAddress(mac);
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(normalized);
}

export function maskMacAddress(mac: string): string {
  const normalized = normalizeMacAddress(mac);
  if (!isValidMacAddress(normalized)) {
    return 'XX:XX:XX:XX:XX:XX';
  }
  const parts = normalized.split(':');
  return `${parts[0]}:${parts[1]}:**:**:${parts[4]}:${parts[5]}`;
}

export function normalizeMobileNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function isValidPakistanMobile(mobile: string): boolean {
  const normalized = normalizeMobileNumber(mobile);
  return /^03\d{9}$/.test(normalized);
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}
