import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  History,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWargaDeposits } from '@/hooks/useDeposits';
import { useVerifiedBsuOrganizations } from '@/hooks/useOrganizations';
import {
  ACTIVE_DEPOSIT_STATUSES,
  COMPLETED_DEPOSIT_STATUSES,
  depositWeight,
} from '@/lib/deposits';
import {
  formatCurrency,
  formatWeight,
  toNumber,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { DepositCard } from '@/components/deposits/DepositCard';
import { SetorTabs } from '@/components/deposits/SetorTabs';
import type { DashboardStat, DepositStatus } from '@/types/database';

type HistoryFilter = 'semua' | 'aktif' | 'selesai';
type DepositFilter = HistoryFilter | 'menunggu';

const FILTERS: Array<{ key: DepositFilter; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu', label: 'Menunggu BSU' },
  { key: 'aktif', label: 'Dalam proses' },
  { key: 'selesai', label: 'Selesai' },
];

function matchesFilter(status: DepositStatus, filter: DepositFilter) {
  if (filter === 'semua') return true;
  if (filter === 'menunggu') return status === 'diajukan';
  if (filter === 'aktif') {
    return (
      ACTIVE_DEPOSIT_STATUSES.includes(status) &&
      status !== 'diajukan'
    );
  }
  return COMPLETED_DEPOSIT_STATUSES.includes(status);
}

export function DepositHistoryPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<DepositFilter>('semua');
  const [search, setSearch] = useState('');

  usePageTitle('Riwayat setoran');

  const depositsQuery = useWargaDeposits(profile?.id);
  const bsuQuery = useVerifiedBsuOrganizations();

  const rows = depositsQuery.data ?? [];
  const bsuById = useMemo(
    () => new Map((bsuQuery.data ?? []).map((org) => [org.id, org])),
    [bsuQuery.data],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row.status, filter)) return false;
      if (!keyword) return true;
      const bsuName = bsuById.get(row.bsu_id)?.nama ?? '';
      return `${row.estimasi_jenis} ${bsuName} ${row.status} ${row.id}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, filter, search, bsuById]);

  const totalIncome = rows.reduce(
    (total, row) => total + toNumber(row.total),
    0,
  );
  const totalWeight = rows.reduce(
    (total, row) => total + depositWeight(row),
    0,
  );
  const activeCount = rows.filter((row) =>
    ACTIVE_DEPOSIT_STATUSES.includes(row.status),
  ).length;

  const stats: DashboardStat[] = [
    {
      key: 'total',
      label: 'Total setoran',
      value: rows.length,
      format: 'number',
      hint: 'Sepanjang waktu',
    },
    {
      key: 'berat',
      label: 'Total berat',
      value: totalWeight,
      format: 'weight',
      hint: 'Estimasi & hasil timbang',
    },
    {
      key: 'pendapatan',
      label: 'Pendapatan',
      value: totalIncome,
      format: 'currency',
      hint: 'Dari setoran terbayar',
    },
    {
      key: 'aktif',
      label: 'Setoran aktif',
      value: activeCount,
      format: 'number',
      hint: 'Masih diproses',
      badge: activeCount > 0 ? 'Berjalan' : undefined,
    },
  ];

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Riwayat setoran"
        title="Perjalanan setoranmu"
        description="Pantau status, hasil timbang, pembayaran, dan konfirmasi setiap setoran."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/warga/setor"
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            Setor sampah
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <SetorTabs />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {depositsQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari setoran"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Jenis sampah, BSU, atau ID setoran"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  filter === item.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {depositsQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-[20px] border border-black/[0.04] p-3.5"
                >
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-60" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {depositsQuery.isError && (
            <EmptyState
              icon={History}
              title="Riwayat belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void depositsQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!depositsQuery.isLoading &&
            !depositsQuery.isError &&
            rows.length === 0 && (
              <EmptyState
                icon={History}
                title="Belum ada setoran"
                description="Mulai setor sampah pertamamu dan pantau prosesnya dari halaman ini."
                action={
                  <Link
                    to="/warga/setor"
                    className={buttonStyles({ variant: 'soft', size: 'sm' })}
                  >
                    Buat setoran
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            )}

          {!depositsQuery.isLoading &&
            !depositsQuery.isError &&
            rows.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={Activity}
                title="Tidak ada setoran pada filter ini"
                description="Coba pilih filter lain atau ubah kata kunci pencarian."
              />
            )}

          {filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((deposit) => {
                const bsu = bsuById.get(deposit.bsu_id);
                return (
                  <DepositCard
                    key={deposit.id}
                    deposit={deposit}
                    href={`/warga/setoran/${deposit.id}`}
                    contextLabel={bsu?.nama ?? null}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {rows.length > 0 && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {rows.length} setoran.{' '}
          {activeCount > 0
            ? `${activeCount} setoran masih aktif.`
            : 'Semua setoran sudah selesai.'}{' '}
          Total berat {formatWeight(totalWeight)} ·{' '}
          {formatCurrency(totalIncome)} diterima.
        </p>
      )}
    </div>
  );
}
