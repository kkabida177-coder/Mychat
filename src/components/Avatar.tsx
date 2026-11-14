import { useState } from 'react';
import { getInitials } from '../lib/formatters';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showOnlineDot?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

const DOT_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-2.5 w-2.5 border-[1.5px]',
  sm: 'h-3 w-3 border-2',
  md: 'h-3.5 w-3.5 border-2',
  lg: 'h-4 w-4 border-2',
  xl: 'h-5 w-5 border-2',
};

export function Avatar({
  src,
  name,
  size = 'md',
  isOnline = false,
  showOnlineDot = false,
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src && !imgError);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={src!}
          alt={`${name} avatar`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover bg-emerald-50 ring-1 ring-black/5`}
        />
      ) : (
        <div
          aria-label={`${name} avatar`}
          className={`${SIZE_CLASSES[size]} rounded-full bg-gradient-to-br from-[#00A884] to-[#008069] text-white font-display font-semibold flex items-center justify-center select-none ring-1 ring-black/5`}
        >
          {getInitials(name)}
        </div>
      )}

      {showOnlineDot && isOnline && (
        <span
          title="Online now"
          aria-label="Online"
          className={`absolute bottom-0 right-0 rounded-full bg-[#25D366] border-white shadow-xs ${DOT_CLASSES[size]}`}
        />
      )}
    </div>
  );
}
