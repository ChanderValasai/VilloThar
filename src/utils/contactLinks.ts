export const DEFAULT_WHATSAPP_URL = 'https://wa.me/923212472380';
export const DEFAULT_SUPPORT_DISPLAY_PHONE = '+92 321 2472380';
export const DEFAULT_SUPPORT_EMAIL = 'admin@villothar.com';

export function resolveWhatsAppSupport(rawPhone?: string | null): {
  href: string;
  display: string;
} {
  const value = (rawPhone || '').trim();
  if (!value || value.includes('[Placeholder')) {
    return {
      href: DEFAULT_WHATSAPP_URL,
      display: DEFAULT_SUPPORT_DISPLAY_PHONE,
    };
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return {
      href: DEFAULT_WHATSAPP_URL,
      display: value,
    };
  }

  let intlDigits = digits;
  if (digits.startsWith('03') && digits.length === 11) {
    intlDigits = `92${digits.slice(1)}`;
  }

  const display =
    intlDigits === '923212472380'
      ? DEFAULT_SUPPORT_DISPLAY_PHONE
      : value.startsWith('http')
        ? `+${intlDigits}`
        : value;

  return {
    href: `https://wa.me/${intlDigits}`,
    display,
  };
}

export function resolveSupportEmail(rawEmail?: string | null): string {
  const value = (rawEmail || '').trim();
  if (!value || value.includes('[Placeholder')) {
    return DEFAULT_SUPPORT_EMAIL;
  }
  return value;
}
