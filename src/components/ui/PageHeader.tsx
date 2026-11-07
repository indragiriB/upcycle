import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  eyebrow,
  title,
  description,
  backTo,
  backLabel = 'Kembali',
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="px-1 pt-2">
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:bg-white hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted sm:text-[13px]">
            {description}
          </p>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
