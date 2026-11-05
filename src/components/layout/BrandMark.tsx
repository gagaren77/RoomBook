'use client';

import { useState } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { BRAND } from '@/lib/branding';
import { cn } from '@/lib/utils';

/**
 * The college mark, with a plain calendar tile if the image cannot load.
 * `light` draws the fallback for a dark background.
 */
export function BrandMark({ className, light = false }: { className?: string; light?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={cn(
          'flex items-center justify-center rounded-xl text-white shadow-sm',
          light ? 'bg-white/15 ring-1 ring-white/25' : 'bg-indigo-700 shadow-indigo-700/30',
          className
        )}
      >
        <CalendarDaysIcon className="h-[60%] w-[60%]" />
      </span>
    );
  }
  return (
    <span className={cn('flex items-center justify-center overflow-hidden rounded-xl bg-white', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND.mark} alt="" aria-hidden="true" className="h-full w-full object-contain p-0.5" onError={() => setFailed(true)} />
    </span>
  );
}

/** The wide white college logo for the sign-in panel; the college name if it cannot load. */
export function BrandLogoWhite({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={cn('text-xl font-bold tracking-tight text-white', className)}>{BRAND.org}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={BRAND.logoWhite} alt={BRAND.org} className={cn('h-12 w-auto', className)} onError={() => setFailed(true)} />
  );
}
