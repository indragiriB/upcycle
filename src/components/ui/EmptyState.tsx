import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-6' : 'gap-3 rounded-[22px] border border-dashed border-black/10 bg-[#fafbf8] px-6 py-10',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
