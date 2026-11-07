import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'green' | 'neutral' | 'amber' | 'red' | 'dark' | 'white';

const tones: Record<BadgeTone, string> = {
  green: 'bg-brand-50 text-brand-800 ring-brand-600/10',
  neutral: 'bg-[#f2f5f1] text-[#5d665e] ring-black/[0.04]',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/10',
  red: 'bg-red-50 text-red-700 ring-red-600/10',
  dark: 'bg-ink text-white ring-transparent',
  white: 'bg-white/95 text-ink ring-black/[0.04] shadow-sm',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'dark' || tone === 'white' ? 'bg-brand-500' : 'bg-current opacity-60',
          )}
        />
      )}
      {children}
    </span>
  );
}
