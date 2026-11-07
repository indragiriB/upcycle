import {
  BadgeCheck,
  Clock3,
  Inbox,
  ListChecks,
  Package,
  Recycle,
  Scale,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn, formatMetricValue } from '@/lib/utils';
import type { DashboardStat } from '@/types/database';

const STAT_ICONS: Record<string, LucideIcon> = {
  pendapatan: Wallet,
  berat: Scale,
  aktif: Clock3,
  total: Recycle,
  antrean: Inbox,
  kas_keluar: Wallet,
  kas_masuk: TrendingUp,
  stok: Warehouse,
  pesanan: ListChecks,
  pembelian: ShoppingBag,
  belanja: ShoppingBag,
  produk: Package,
  selesai: BadgeCheck,
  pending: BadgeCheck,
  verified: BadgeCheck,
  jenis: Recycle,
  pengguna: Users,
};

export function StatCard({
  stat,
  className,
}: {
  stat: DashboardStat;
  className?: string;
}) {
  const Icon = STAT_ICONS[stat.key] ?? TrendingUp;
  const value = formatMetricValue(stat.value, stat.format);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-card transition-shadow hover:shadow-float md:p-[18px]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold leading-4 text-muted md:text-xs">
          {stat.label}
        </p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>
      </div>
      <p
        className="mt-2.5 truncate text-[23px] font-extrabold leading-none tracking-tight text-ink md:text-[26px]"
        title={value}
      >
        {value}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {stat.badge && (
          <Badge tone="green" dot className="px-2 py-0.5 text-[9px]">
            {stat.badge}
          </Badge>
        )}
        <p className="line-clamp-1 text-[10px] leading-4 text-muted">
          {stat.hint}
        </p>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-card md:p-[18px]">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 animate-pulse rounded-full bg-black/[0.055]" />
        <div className="h-8 w-8 animate-pulse rounded-xl bg-black/[0.055]" />
      </div>
      <div className="mt-3 h-6 w-20 animate-pulse rounded-lg bg-black/[0.055]" />
      <div className="mt-3 h-2.5 w-28 animate-pulse rounded-full bg-black/[0.04]" />
    </div>
  );
}
