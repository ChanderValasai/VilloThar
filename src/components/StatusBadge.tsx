import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface StatusLabelProps {
  status: string;
  compact?: boolean;
}

export function StatusLabel({ status, compact = false }: StatusLabelProps) {
  const normalized = status.toLowerCase();

  let tone = 'text-[#475569]';
  let Icon = Clock;

  if (
    normalized === 'verified' ||
    normalized === 'active' ||
    normalized === 'authorized' ||
    normalized === 'successful' ||
    normalized === 'gateway associated' ||
    normalized === 'connected' ||
    normalized === 'resolved'
  ) {
    tone = 'text-[#15803D]';
    Icon = normalized === 'authorized' ? Wifi : CheckCircle2;
  } else if (
    normalized.includes('failed') ||
    normalized === 'suspended' ||
    normalized === 'expired' ||
    normalized === 'cancelled' ||
    normalized === 'removed' ||
    normalized === 'denied' ||
    normalized === 'unauthorized'
  ) {
    tone = 'text-[#B91C1C]';
    Icon = normalized === 'unauthorized' ? WifiOff : AlertCircle;
  } else if (
    normalized.includes('review') ||
    normalized.includes('pending') ||
    normalized === 'pilot' ||
    normalized.includes('disconnected') ||
    normalized.includes('requested')
  ) {
    tone = 'text-[#B45309]';
    Icon = ShieldAlert;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
        compact ? 'text-xs' : 'text-[13px]'
      } ${tone}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
