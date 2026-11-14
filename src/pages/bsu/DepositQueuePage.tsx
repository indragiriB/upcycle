import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ChevronRight,
  Inbox,
  RefreshCw,
  Scale,
  Search,
  Send,
  Truck,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBsuDeposits } from '@/hooks/useDeposits';
import {
  COMPLETED_DEPOSIT_STATUSES,
  bsuDepositAction,
  depositWeight,
} from '@/lib/deposits';
import { formatWeight, toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { DepositCard } from '@/components/deposits/DepositCard';
import { SchedulePickupDialog } from '@/components/deposits/SchedulePickupDialog';
import { WeighingDialog } from '@/components/deposits/WeighingDialog';
import type {
  DashboardStat,
  DepositRecord,
  DepositStatus,
} from '@/types/database';

type QueueFilter = 'tindakan' | 'menunggu' | 'diproses' | 'selesai' | 'semua';

const FILTERS: Array<{ key: QueueFilter; label: string }> = [
  { key: 'tindakan', label: 'Perlu tindakan' },
  { key: 'menunggu', label: 'Menunggu warga' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'semua', label: 'Semua' },
];

function matchesFilter(deposit: DepositRecord, filter: QueueFilter) {
  if (filter === 'semua') return true;
  if (filter === 'tindakan') return bsuDepositAction(deposit) !== null;
  if (filter === 'menunggu') return deposit.status === 'dicek_dibayar';
  if (filter === 'diproses') {
    return (
      deposit.status === 'dikonfirmasi' ||
      deposit.status === 'dikirim_ke_bsi'
    );
  }
  return COMPLETED_DEPOSIT_STATUSES.includes(deposit.status);
}

export function DepositQueuePage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<QueueFilter>('tindakan');
  const [search, setSearch] = useState('');
  const [scheduleDeposit, setScheduleDeposit] =
    useState<DepositRecord | null>(null);
  const [weighDeposit, setWeighDeposit] = useState<DepositRecord | null>(null);

  usePageTitle('Antrean setoran');

  const depositsQuery = useBsuDeposits(profile?.org_id ?? null);
  const rows = useMemo(
    () => depositsQuery.data?.pages.flat() ?? [],
    [depositsQuery.data],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!keyword) return true;
      return `${row.profiles?.nama ?? ''} ${row.estimasi_jenis} ${
        row.alamat ?? ''
      } ${row.status} ${row.id}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, filter, search]);

  const actionRows = rows.filter(
    (row) => bsuDepositAction(row) !== null,
  );
  const scheduleCount = rows.filter(
    (row) => bsuDepositAction(row) === 'schedule',
  ).length;
  const weighCount = rows.filter(
    (row) => bsuDepositAction(row) === 'weigh',
  ).length;
  const sendCount = rows.filter(
    (row) => bsuDepositAction(row) === 'send',
  ).length;
  const waitingConfirmation = rows.filter(
    (row) => row.status === 'dicek_dibayar',
  ).length;
  const receivedWeight = rows
    .filter((row) =>
      [
        'dicek_dibayar',
        'dikonfirmasi',
        'dikirim_ke_bsi',
        ...COMPLETED_DEPOSIT_STATUSES,
      ].includes(row.status as DepositStatus),
    )
    .reduce((total, row) => total + depositWeight(row), 0);

  const stats: DashboardStat[] = [
    {
      key: 'antrean',
      label: 'Perlu tindakan',
      value: actionRows.length,
      format: 'number',
      hint: `${scheduleCount} jadwal · ${weighCount} timbang · ${sendCount} kirim`,
      badge: actionRows.length > 0 ? 'Perlu aksi' : undefined,
    },
    {
      key: 'aktif',
      label: 'Menunggu warga',
      value: waitingConfirmation,
      format: 'number',
      hint: 'Sudah ditimbang & dibayar',
    },
    {
      key: 'berat',
      label: 'Berat diproses',
      value: receivedWeight,
      format: 'weight',
      hint: 'Dari setoran terverifikasi',
    },
    {
      key: 'total',
      label: 'Total setoran',
      value: rows.length,
      format: 'number',
      hint: 'Dari data termuat',
    },
  ];

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Antrean setoran"
        title="Kelola setoran warga"
        description="Jadwalkan penjemputan, proses timbang, dan pantau setoran yang menunggu konfirmasi warga."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/bsu/jemput"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <Truck className="h-3.5 w-3.5" />
            Jadwal jemput
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
              label="Cari setoran"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama warga, jenis sampah, atau ID"
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
              icon={Inbox}
              title="Antrean belum bisa dimuat"
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
                icon={Inbox}
                title="Belum ada setoran masuk"
                description="Setoran dari warga akan muncul di antrean ini beserta aksi yang diperlukan."
              />
            )}

          {!depositsQuery.isLoading &&
            !depositsQuery.isError &&
            rows.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="Tidak ada setoran pada filter ini"
                description="Pilih filter lain atau ubah kata kunci pencarian."
              />
            )}

          {filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((deposit) => {
                const action = bsuDepositAction(deposit);
                return (
                  <DepositCard
                    key={deposit.id}
                    deposit={deposit}
                    href={`/bsu/setoran/${deposit.id}`}
                    showWarga
                    contextLabel={
                      deposit.alamat
                        ? deposit.alamat.split(',')[0]
                        : deposit.metode === 'antar'
                          ? 'Antar ke BSU'
                          : null
                    }
                    actions={
                      <>
                        {action === 'schedule' && (
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() => setScheduleDeposit(deposit)}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Jadwalkan
                          </Button>
                        )}
                        {action === 'weigh' && (
                          <Button
                            size="sm"
                            onClick={() => setWeighDeposit(deposit)}
                          >
                            <Scale className="h-3.5 w-3.5" />
                            Timbang
                          </Button>
                        )}
                        {action === 'send' && (
                          <Link
                            to={`/bsu/setoran/${deposit.id}`}
                            className={buttonStyles({
                              variant: 'soft',
                              size: 'sm',
                            })}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Kirim ke BSI
                          </Link>
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
                      </>
                    }
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
          Menampilkan {filtered.length} dari {rows.length} setoran ·{' '}
          {formatWeight(
            filtered.reduce(
              (total, row) => total + toNumber(depositWeight(row)),
              0,
            ),
          )}{' '}
          pada filter aktif.
        </p>
      )}

      {scheduleDeposit && (
        <SchedulePickupDialog
          open
          onClose={() => setScheduleDeposit(null)}
          deposit={scheduleDeposit}
        />
      )}
      {weighDeposit && (
        <WeighingDialog
          open
          onClose={() => setWeighDeposit(null)}
          deposit={weighDeposit}
          orgId={profile.org_id}
        />
      )}
    </div>
  );
}
