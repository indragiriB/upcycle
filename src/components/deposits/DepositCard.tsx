import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ChevronRight,
  MapPin,
  Recycle,
  Scale,
  Store,
  Truck,
} from 'lucide-react';
import { DepositStatusBadge } from '@/components/deposits/DepositStatusBadge';
import { depositWeight } from '@/lib/deposits';
import {
  formatCurrency,
  formatDateTime,
  formatWeight,
  timeAgo,
} from '@/lib/utils';
import type { DepositRecord } from '@/types/database';

export function DepositCard({
  deposit,
  href,
  contextLabel,
  showWarga = false,
  actions,
}: {
  deposit: DepositRecord;
  href: string;
  contextLabel?: string | null;
  showWarga?: boolean;
  actions?: ReactNode;
}) {
  const MethodIcon = deposit.metode === 'jemput' ? Truck : Store;

  return (
    <div className="rounded-[20px] border border-black/[0.04] bg-white p-3.5 shadow-[0_1px_2px_rgba(17,21,17,0.02)] transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card sm:p-4">
      <Link to={href} className="group flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Recycle className="h-[18px] w-[18px]" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-ink sm:text-sm">
                {showWarga && deposit.profiles?.nama
                  ? deposit.profiles.nama
                  : `Setoran ${deposit.estimasi_jenis}`}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-muted">
                {showWarga && (
                  <span className="inline-flex items-center gap-1">
                    <Recycle className="h-3 w-3 text-brand-600" />
                    {deposit.estimasi_jenis}
                  </span>
                )}
                {contextLabel && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-brand-600" />
                    {contextLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Scale className="h-3 w-3 text-brand-600" />
                  {formatWeight(depositWeight(deposit))}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MethodIcon className="h-3 w-3 text-brand-600" />
                  {deposit.metode === 'jemput' ? 'Dijemput' : 'Diantar'}
                </span>
                {deposit.jadwal && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3 text-brand-600" />
                    {formatDateTime(deposit.jadwal)}
                  </span>
                )}
              </span>
            </span>
            <DepositStatusBadge
              status={deposit.status}
              className="shrink-0 px-2 py-0.5 text-[9px]"
            />
          </span>

          <span className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.04] pt-2">
            <span className="text-[10px] text-muted">
              {timeAgo(deposit.created_at)} ·{' '}
              {formatDateTime(deposit.created_at)}
            </span>
            <span className="flex items-center gap-2">
              {deposit.total > 0 && (
                <span className="text-[11px] font-bold text-brand-800">
                  {formatCurrency(Number(deposit.total))}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-black/15 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </span>
          </span>
        </span>
      </Link>

      {actions && (
        <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.04] pt-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
