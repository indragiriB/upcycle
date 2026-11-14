import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Info,
  MapPin,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBsuDeposits } from '@/hooks/useDeposits';
import {
  useBsuStockPickups,
  useUpdatePickupStatus,
} from '@/hooks/useOrders';
import {
  COMPLETED_DEPOSIT_STATUSES,
  depositWeight,
} from '@/lib/deposits';
import {
  formatDateTime,
  formatWeight,
  mapsUrl,
  toNumber,
  whatsappUrl,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { DepositStatusBadge } from '@/components/deposits/DepositStatusBadge';
import { SchedulePickupDialog } from '@/components/deposits/SchedulePickupDialog';
import { PickupList } from '@/components/orders/PickupList';
import type {
  DashboardStat,
  DepositRecord,
  DepositStatus,
} from '@/types/database';

type PickupFilter =
  | 'aktif'
  | 'perlu_jadwal'
  | 'terjadwal'
  | 'selesai'
  | 'semua';

const FILTERS: Array<{ key: PickupFilter; label: string }> = [
  { key: 'aktif', label: 'Rute aktif' },
  { key: 'perlu_jadwal', label: 'Perlu jadwal' },
  { key: 'terjadwal', label: 'Terjadwal' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'semua', label: 'Semua' },
];

const PROCESSED_STATUSES: DepositStatus[] = [
  'dicek_dibayar',
  'dikonfirmasi',
  'dikirim_ke_bsi',
  ...COMPLETED_DEPOSIT_STATUSES,
];

function matchesFilter(deposit: DepositRecord, filter: PickupFilter) {
  if (filter === 'semua') return true;
  if (filter === 'aktif') {
    return deposit.status === 'diajukan' || deposit.status === 'dijadwalkan';
  }
  if (filter === 'perlu_jadwal') return deposit.status === 'diajukan';
  if (filter === 'terjadwal') return deposit.status === 'dijadwalkan';
  return PROCESSED_STATUSES.includes(deposit.status);
}

function sameLocalDay(value: string, reference: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

const STATUS_ORDER: Record<string, number> = {
  diajukan: 0,
  dijadwalkan: 1,
};

export function PickupSchedulePage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<PickupFilter>('aktif');
  const [search, setSearch] = useState('');
  const [scheduleDeposit, setScheduleDeposit] =
    useState<DepositRecord | null>(null);
  const [pickupPendingId, setPickupPendingId] = useState<string | null>(null);
  const [pickupMessage, setPickupMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  usePageTitle('Jadwal penjemputan');

  const depositsQuery = useBsuDeposits(profile?.org_id ?? null);
  const stockPickupsQuery = useBsuStockPickups(profile?.org_id ?? null);
  const pickupMutation = useUpdatePickupStatus();
  const rows = useMemo(
    () =>
      (depositsQuery.data?.pages.flat() ?? []).filter(
        (row) => row.metode === 'jemput',
      ),
    [depositsQuery.data],
  );
  const stockPickups = useMemo(() => {
    const rank = (status: string) => {
      if (status === 'dijadwalkan' || status === 'dalam_perjalanan') return 0;
      if (status === 'selesai') return 1;
      return 2;
    };
    return [...(stockPickupsQuery.data ?? [])].sort((a, b) => {
      const rankDiff = rank(a.status) - rank(b.status);
      if (rankDiff !== 0) return rankDiff;
      const timeDiff =
        new Date(a.jadwal).getTime() - new Date(b.jadwal).getTime();
      return rank(a.status) === 0 ? timeDiff : -timeDiff;
    });
  }, [stockPickupsQuery.data]);
  const activeStockPickups = stockPickups.filter(
    (pickup) =>
      pickup.status === 'dijadwalkan' ||
      pickup.status === 'dalam_perjalanan',
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!matchesFilter(row, filter)) return false;
        if (!keyword) return true;
        return `${row.profiles?.nama ?? ''} ${row.estimasi_jenis} ${
          row.alamat ?? ''
        } ${row.nomor_wa}`
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => {
        const orderA = STATUS_ORDER[a.status] ?? 2;
        const orderB = STATUS_ORDER[b.status] ?? 2;
        if (orderA !== orderB) return orderA - orderB;

        if (a.status === 'dijadwalkan' && b.status === 'dijadwalkan') {
          return (
            new Date(a.jadwal ?? 0).getTime() -
            new Date(b.jadwal ?? 0).getTime()
          );
        }
        if (a.status === 'diajukan' && b.status === 'diajukan') {
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );
        }
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });
  }, [rows, filter, search]);

  const needSchedule = rows.filter(
    (row) => row.status === 'diajukan',
  ).length;
  const scheduled = rows.filter(
    (row) => row.status === 'dijadwalkan',
  ).length;
  const today = new Date();
  const todayCount = rows.filter(
    (row) => row.jadwal && sameLocalDay(row.jadwal, today),
  ).length;
  const processedWeight = rows
    .filter((row) => PROCESSED_STATUSES.includes(row.status))
    .reduce((total, row) => total + depositWeight(row), 0);

  const stats: DashboardStat[] = [
    {
      key: 'antrean',
      label: 'Perlu dijadwal',
      value: needSchedule,
      format: 'number',
      hint: 'Setoran jemput baru',
      badge: needSchedule > 0 ? 'Perlu aksi' : undefined,
    },
    {
      key: 'aktif',
      label: 'Jadwal aktif',
      value: scheduled,
      format: 'number',
      hint: 'Menunggu penimbangan',
    },
    {
      key: 'total',
      label: 'Jemput hari ini',
      value: todayCount,
      format: 'number',
      hint: 'Sesuai jadwal tersimpan',
    },
    {
      key: 'berat',
      label: 'Sudah diproses',
      value: processedWeight,
      format: 'weight',
      hint: 'Berat setoran jemput',
    },
  ];

  const handleCompleteStockPickup = async (pickupId: string) => {
    setPickupMessage(null);
    setPickupPendingId(pickupId);
    try {
      await pickupMutation.mutateAsync({
        pickupId,
        status: 'selesai',
      });
      setPickupMessage({
        type: 'success',
        text: 'Pengambilan stok oleh BSI ditandai selesai.',
      });
    } catch (failure) {
      setPickupMessage({
        type: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Status pengambilan gagal diperbarui.',
      });
    } finally {
      setPickupPendingId(null);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Jadwal penjemputan"
        title="Kelola rute jemput"
        description="Atur waktu penjemputan, hubungi warga lewat WhatsApp, dan buka titik lokasi dalam satu halaman."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/bsu/setoran"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <Truck className="h-3.5 w-3.5" />
            Antrean setoran
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {depositsQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari jadwal"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama warga, alamat, atau nomor WA"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => {
              const count = rows.filter((row) =>
                matchesFilter(row, item.key),
              ).length;
              return (
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
                  <span
                    className={`ml-1.5 ${
                      filter === item.key ? 'text-white/65' : 'text-muted/70'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          {depositsQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-black/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-2.5 w-64" />
                      <Skeleton className="h-2.5 w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {depositsQuery.isError && (
            <EmptyState
              icon={Truck}
              title="Jadwal belum bisa dimuat"
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
                icon={Truck}
                title="Belum ada setoran jemput"
                description="Setoran warga dengan metode dijemput akan muncul di sini untuk dijadwalkan."
              />
            )}

          {!depositsQuery.isLoading &&
            !depositsQuery.isError &&
            rows.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={CalendarDays}
                title="Tidak ada jadwal pada filter ini"
                description="Pilih filter lain atau ubah kata kunci pencarian."
              />
            )}

          {filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((deposit) => {
                const wa = whatsappUrl(
                  deposit.nomor_wa,
                  `Halo ${
                    deposit.profiles?.nama ?? 'warga'
                  }, saya petugas BSU terkait penjemputan sampah ${
                    deposit.estimasi_jenis
                  }.`,
                );
                const map =
                  deposit.lokasi_url ??
                  mapsUrl(deposit.lat, deposit.lng, deposit.alamat);
                const isToday = deposit.jadwal
                  ? sameLocalDay(deposit.jadwal, today)
                  : false;

                return (
                  <div
                    key={deposit.id}
                    className={`rounded-[20px] border p-3.5 shadow-[0_1px_2px_rgba(17,21,17,0.02)] sm:p-4 ${
                      isToday
                        ? 'border-brand-200 bg-brand-50/20'
                        : 'border-black/[0.04] bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                          <Truck className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-bold text-ink sm:text-sm">
                              {deposit.profiles?.nama ?? 'Warga UPCYCLE'}
                            </p>
                            {isToday && (
                              <Badge
                                tone="green"
                                dot
                                className="px-2 py-0.5 text-[9px]"
                              >
                                Hari ini
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-muted">
                            <span>{deposit.estimasi_jenis}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatWeight(depositWeight(deposit))}</span>
                            <span aria-hidden="true">·</span>
                            <span>ID {deposit.id.slice(0, 8)}</span>
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                            <CalendarClock className="h-3 w-3 text-brand-600" />
                            {deposit.jadwal
                              ? formatDateTime(deposit.jadwal)
                              : 'Belum dijadwalkan'}
                          </p>
                        </div>
                      </div>
                      <DepositStatusBadge status={deposit.status} />
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="flex items-start gap-2 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                            Alamat penjemputan
                          </p>
                          <p className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-ink">
                            {deposit.alamat ?? 'Alamat belum dicantumkan'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
                        <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                            Kontak
                          </p>
                          <p className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-ink">
                            {deposit.nomor_wa}
                          </p>
                        </div>
                      </div>
                    </div>

                    {deposit.catatan && (
                      <p className="mt-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[10px] leading-4 text-amber-800">
                        Catatan warga: {deposit.catatan}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.04] pt-2.5">
                      {deposit.status === 'diajukan' && (
                        <Button
                          size="sm"
                          onClick={() => setScheduleDeposit(deposit)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          Jadwalkan
                        </Button>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonStyles({
                            variant: 'soft',
                            size: 'sm',
                          })}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      {map && (
                        <a
                          href={map}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonStyles({
                            variant: 'secondary',
                            size: 'sm',
                          })}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Buka peta
                        </a>
                      )}
                      <Link
                        to={`/bsu/setoran/${deposit.id}`}
                        className={buttonStyles({
                          variant: 'secondary',
                          size: 'sm',
                        })}
                      >
                        Detail
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
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

      <Card className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <PackageCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Pengambilan stok oleh BSI
              </h2>
              <p className="text-[10px] text-muted">
                Rute jemput stok pesanan industri dari BSU Anda.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f5f1] px-3 py-1.5 text-[10px] font-semibold text-muted">
            {activeStockPickups.length} rute aktif
          </span>
        </div>

        {pickupMessage && (
          <div
            className={`mt-3 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-[11px] leading-5 ${
              pickupMessage.type === 'success'
                ? 'border-brand-100 bg-brand-50 text-brand-900'
                : 'border-red-100 bg-red-50 text-red-700'
            }`}
          >
            <p className="flex items-start gap-2">
              {pickupMessage.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {pickupMessage.text}
            </p>
            <button
              type="button"
              onClick={() => setPickupMessage(null)}
              className="text-[10px] font-semibold underline-offset-2 hover:underline"
            >
              Tutup
            </button>
          </div>
        )}

        <div className="mt-3">
          {stockPickupsQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-[#f8faf7] px-3.5 py-3"
                >
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="mt-2 h-2.5 w-56" />
                </div>
              ))}
            </div>
          )}

          {stockPickupsQuery.isError && (
            <EmptyState
              icon={PackageCheck}
              title="Jadwal stok belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void stockPickupsQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!stockPickupsQuery.isLoading &&
            !stockPickupsQuery.isError &&
            stockPickups.length === 0 && (
              <EmptyState
                icon={PackageCheck}
                title="Belum ada rute stok"
                description="BSI akan menjadwalkan pengambilan stok pesanan industri dari BSU Anda."
                compact
              />
            )}

          {stockPickups.length > 0 && (
            <>
              <PickupList
                pickups={stockPickups}
                viewer="bsu"
                onComplete={(pickup) =>
                  void handleCompleteStockPickup(pickup.id)
                }
                pendingId={pickupPendingId}
              />
              <p className="mt-2 flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[10px] leading-5 text-brand-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Tandai selesai setelah stok diserahkan ke BSI. Status setoran
                asal otomatis menjadi “diambil BSI”.
              </p>
            </>
          )}
        </div>
      </Card>

      {rows.length > 0 && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {rows.length} setoran jemput ·{' '}
          {formatWeight(
            filtered.reduce(
              (total, row) => total + toNumber(depositWeight(row)),
              0,
            ),
          )}{' '}
          pada filter aktif.
        </p>
      )}

      <div className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-[10px] leading-5 text-brand-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Nomor WhatsApp, alamat, dan titik lokasi hanya terlihat oleh BSU
        tujuan. BSI hanya menerima data berat dan jenis sampah setelah warga
        mengonfirmasi hasil timbang.
      </div>

      {scheduleDeposit && (
        <SchedulePickupDialog
          open
          onClose={() => setScheduleDeposit(null)}
          deposit={scheduleDeposit}
        />
      )}
    </div>
  );
}
