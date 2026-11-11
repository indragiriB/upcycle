import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOrganizations } from '@/hooks/useOrganizations';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DashboardMap } from '@/components/dashboard/DashboardMap';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { ActivityChartCard } from '@/components/dashboard/ActivityChartCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { RoleOverviewCard } from '@/components/dashboard/RoleOverviewCard';
import { PartnerListCard } from '@/components/dashboard/PartnerListCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PRIMARY_ACTIONS } from '@/config/navigation';
import { ROLE_LABELS } from '@/lib/roles';
import { DEFAULT_CENTER } from '@/lib/geo';
import { firstName } from '@/lib/utils';
import type { AppRole, ChartRange } from '@/types/database';

const ROLE_SUBTITLES: Record<AppRole, string> = {
  warga:
    'Pantau setoran, pendapatan, jualan, dan dampak daur ulangmu dalam satu tampilan.',
  bsu: 'Kelola antrean setoran, penimbangan, dan kas BSU dari satu tempat.',
  bsi: 'Pantau data masuk, stok gabungan, dan pesanan industri.',
  industri: 'Cek stok BSI, pembelian, dan perkembangan pesananmu.',
  admin: 'Pantau jaringan mitra, verifikasi, dan master data UPCYCLE.',
};

function greetingForHour(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [range, setRange] = useState<ChartRange>(30);

  usePageTitle('Dashboard');

  const dashboardQuery = useDashboardData(profile);
  const organizationsQuery = useOrganizations(profile);

  const center = useMemo<[number, number]>(() => {
    const organization = profile?.organizations;
    if (
      organization?.lat !== null &&
      organization?.lat !== undefined &&
      organization?.lng !== null &&
      organization?.lng !== undefined
    ) {
      return [organization.lat, organization.lng];
    }
    return DEFAULT_CENTER;
  }, [profile?.organizations]);

  if (!profile) return null;

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  const snapshot = dashboardQuery.data;
  const primaryAction = PRIMARY_ACTIONS[profile.role];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            {greeting}
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
            Halo, {firstName(profile.nama)}{' '}
            <span aria-hidden="true" className="inline-block">
              👋
            </span>
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted sm:text-[13px]">
            {ROLE_SUBTITLES[profile.role]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.05] bg-white px-3.5 text-[10px] font-semibold text-muted shadow-sm sm:text-[11px]">
            <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
            {dateLabel}
          </span>
          <Badge tone="green" dot>
            {ROLE_LABELS[profile.role]}
          </Badge>
        </div>
      </header>

      <DashboardMap
        organizations={organizationsQuery.data ?? []}
        loading={organizationsQuery.isLoading}
        error={organizationsQuery.isError}
        onRetry={() => void organizationsQuery.refetch()}
        center={center}
      />

      <section aria-label="Ringkasan angka">
        {dashboardQuery.isError ? (
          <Card className="p-5">
            <EmptyState
              icon={AlertTriangle}
              title="Ringkasan belum bisa dimuat"
              description="Data dashboard gagal diambil. Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void dashboardQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {dashboardQuery.isLoading || !snapshot
              ? [0, 1, 2, 3].map((item) => (
                  <StatCardSkeleton key={item} />
                ))
              : snapshot.stats.map((stat) => (
                  <StatCard key={stat.key} stat={stat} />
                ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          {dashboardQuery.isError ? (
            <Card className="p-5">
              <EmptyState
                icon={AlertTriangle}
                title="Grafik aktivitas tidak tersedia"
                description="Grafik akan muncul kembali setelah data berhasil dimuat."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void dashboardQuery.refetch()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Muat ulang
                  </Button>
                }
              />
            </Card>
          ) : (
            <ActivityChartCard
              source={snapshot?.chart}
              range={range}
              onRangeChange={setRange}
              loading={dashboardQuery.isLoading}
            />
          )}

          <RecentActivityCard
            items={snapshot?.recent ?? []}
            primaryAction={primaryAction}
            loading={dashboardQuery.isLoading}
            error={dashboardQuery.isError}
            onRetry={() => void dashboardQuery.refetch()}
          />
        </div>

        <div className="space-y-4 xl:col-span-5">
          <RoleOverviewCard profile={profile} />
          <PartnerListCard
            organizations={organizationsQuery.data ?? []}
            center={center}
            loading={organizationsQuery.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
