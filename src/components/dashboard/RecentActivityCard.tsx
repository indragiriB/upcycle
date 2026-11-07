import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { buttonStyles } from '@/components/ui/Button';
import { timeAgo } from '@/lib/utils';
import type { DashboardRecentItem } from '@/hooks/useDashboardData';
import type { PrimaryAction } from '@/config/navigation';

export function RecentActivityCard({
  items,
  primaryAction,
  loading,
  error,
  onRetry,
}: {
  items: DashboardRecentItem[];
  primaryAction: PrimaryAction;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const viewAllHref = items[0]?.href ?? primaryAction.to;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f1] text-ink">
            <Activity className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Aktivitas terbaru</h2>
            <p className="text-[11px] text-muted">
              Perkembangan terkini di akunmu
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <Link
            to={viewAllHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Lihat semua
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-3">
        {loading && (
          <div className="space-y-4 py-1">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-semibold text-ink">
              Aktivitas belum bisa dimuat
            </p>
            <button
              type="button"
              onClick={onRetry}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={Activity}
            title="Belum ada aktivitas"
            description="Aktivitas pertamamu akan muncul di sini setelah mulai bertransaksi."
            compact
            action={
              <Link
                to={primaryAction.to}
                className={buttonStyles({ variant: 'soft', size: 'sm' })}
              >
                {primaryAction.label}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        )}

        {!loading && !error && items.length > 0 && (
          <div className="-mx-1">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group flex items-center gap-3 rounded-2xl px-1 py-2.5 transition-colors hover:bg-[#fafcf9]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Activity className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {timeAgo(item.date)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-muted">
                      {item.description}
                    </span>
                    <Badge
                      tone={item.tone}
                      className="hidden shrink-0 px-2 py-0.5 text-[9px] sm:inline-flex"
                    >
                      {item.status}
                    </Badge>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-black/15 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
