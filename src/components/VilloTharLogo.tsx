import { useState } from 'react';

interface VilloTharLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VilloTharLogo({ size = 'md', className = '' }: VilloTharLogoProps) {
  const [imgError, setImgError] = useState(false);

  const dimensionClass =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';

  if (imgError) {
    return (
      <div
        className={`${dimensionClass} rounded-full bg-[#0B66A8]/10 border border-[#0B66A8]/30 flex items-center justify-center shrink-0 ${className}`}
        aria-label="VilloThar Logo"
      >
        <span className="text-xs font-bold text-[#0B66A8]">VT</span>
      </div>
    );
  }

  return (
    <img
      src="/assets/aistudio/Villothar_99475b17.jpg"
      alt="VilloThar official emblem"
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`${dimensionClass} rounded-full object-cover border border-[#E2E0DA] shrink-0 ${className}`}
    />
  );
}
