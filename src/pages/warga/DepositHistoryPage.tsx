import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CloudOff,
  CloudUpload,
  History,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWargaDeposits } from '@/hooks/useDeposits';
import { useOfflineDeposits } from '@/hooks/useOfflineDeposits';
import { removeOfflineDeposit } from '@/lib/offline-deposits';
import { useVerifiedBsuOrganizations } from '@/hooks/useOrganizations';
import {
  depositWeight,
} from '@/lib/deposits';
import { DEPOSIT_STAGE_LABELS, depositStage } from '@/lib/status';
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

type DepositFilter = 'semua' | 'diajukan' | 'ditimbang' | 'selesai';

const FILTERS: Array<{ key: DepositFilter; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'diajukan', label: DEPOSIT_STAGE_LABELS.diajukan },
  { key: 'ditimbang', label: DEPOSIT_STAGE_LABELS.ditimbang },
  { key: 'selesai', label: DEPOSIT_STAGE_LABELS.selesai },
];

function matchesFilter(status: DepositStatus, filter: DepositFilter) {
  return filter === 'semua' || depositStage(status) === filter;
}

export function DepositHistoryPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const [filter, setFilter] = useState<DepositFilter>('semua');
  const [search, setSearch] = useState('');
  const [queuedNotice, setQueuedNotice] = useState(
    Boolean((location.state as { queued?: boolean } | null)?.queued),
  );
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  usePageTitle('Riwayat setoran');

  const depositsQuery = useWargaDeposits(profile?.id);
  const bsuQuery = useVerifiedBsuOrganizations();
  const offlineQueue = useOfflineDeposits(profile?.id);

  const rows = useMemo(
    () => depositsQuery.data?.pages.flat() ?? [],
    [depositsQuery.data],
  );
  const bsuById = useMemo(
    () => new Map((bsuQuery.data ?? []).map((org) => [org.id, org])),
    [bsuQuery.data],
  );

  const handleDiscard = async (id: string) => {
    setDiscardingId(id);
    try {
      await removeOfflineDeposit(id);
      await offlineQueue.refresh();
    } catch {
      // Bila gagal, item tetap tampil agar pengguna dapat mencoba lagi.
    } finally {
      setDiscardingId(null);
    }
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row.status, filter)) return false;
      if (!keyword) return true;
      const bsuName = bsuById.get(row.bsu_id)?.nama ?? '';
      const stageLabel = DEPOSIT_STAGE_LABELS[depositStage(row.status)];
      return `${row.estimasi_jenis} ${bsuName} ${row.status} ${stageLabel} ${row.id}`
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
  const activeCount = rows.filter(
    (row) => depositStage(row.status) !== 'selesai',
  ).length;

  const stats: DashboardStat[] = [
    {
      key: 'total',
      label: 'Total setoran',
      value: rows.length,
      format: 'number',
      hint: 'Dari data termuat',
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
      label: 'Belum selesai',
      value: activeCount,
      format: 'number',
      hint: 'Tahap diajukan/ditimbang',
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

      {queuedNotice && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-900">
          <p className="flex items-start gap-2">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
            Setoran disimpan di perangkat ini karena koneksi terputus. Setoran
            akan dikirim otomatis saat internet kembali, atau lewat tombol
            &ldquo;Kirim sekarang&rdquo; di bawah.
          </p>
          <button
            type="button"
            onClick={() => setQueuedNotice(false)}
            aria-label="Tutup pemberitahuan"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-amber-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {offlineQueue.count > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <CloudOff className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Menunggu koneksi ({offlineQueue.count})
                </h2>
                <p className="mt-0.5 text-[10px] leading-4 text-muted">
                  Setoran berikut belum terkirim ke server. Jangan hapus data
                  browser sebelum pengiriman selesai.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void offlineQueue.flush()}
              loading={offlineQueue.isFlushing}
            >
              <CloudUpload className="h-3.5 w-3.5" />
              Kirim sekarang
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {offlineQueue.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-ink">
                    {item.estimasiJenis}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatWeight(item.estimasiBeratKg)} ·{' '}
                    {item.metode === 'jemput' ? 'Dijemput BSU' : 'Antar sendiri'}{' '}
                    · {new Date(item.createdAt).toLocaleDateString('id-ID')}
                  </p>
                  {item.lastError && (
                    <p className="mt-1 text-[9px] leading-4 text-amber-800">
                      Percobaan {item.attempts}x: {item.lastError}
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Belum terkirim
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDiscard(item.id)}
                    disabled={discardingId === item.id}
                    aria-label={`Hapus setoran ${item.estimasiJenis} dari antrean`}
                    title="Hapus dari antrean"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>

          {offlineQueue.message && (
            <p className="mt-2 text-[10px] leading-4 text-amber-800">
              {offlineQueue.message}
            </p>
          )}
        </Card>
      )}

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
                    simplifiedStatus
                  />
                );
              })}
            </div>
          )}

          {depositsQuery.hasNextPage && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void depositsQuery.fetchNextPage()}
                loading={depositsQuery.isFetchingNextPage}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Muat lebih banyak
              </Button>
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
