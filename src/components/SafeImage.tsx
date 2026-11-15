import { useState } from 'react';
import { Radio } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function SafeImage({ src, alt, fallbackTitle, className = '' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F3F1EC] border border-[#E2E0DA] text-[#475569] p-6 text-center ${className}`}
      >
        <Radio className="w-8 h-8 text-[#0B66A8] mb-2" aria-hidden="true" />
        <p className="text-sm font-medium text-[#132238]">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
