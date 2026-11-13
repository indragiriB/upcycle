import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Inbox,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useBsiIncomingDeposits,
  usePublishDepositToStock,
} from '@/hooks/useBsi';
import {
  formatCurrency,
  formatDateTime,
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
import { DepositStatusBadge } from '@/components/deposits/DepositStatusBadge';
import type {
  BsiIncomingDeposit,
  DashboardStat,
} from '@/types/database';

type IncomingFilter = 'perlu_aksi' | 'dipublikasikan' | 'diambil' | 'semua';

const FILTERS: Array<{ key: IncomingFilter; label: string }> = [
  { key: 'perlu_aksi', label: 'Perlu publikasi' },
  { key: 'dipublikasikan', label: 'Stok tersedia' },
  { key: 'diambil', label: 'Sudah diambil' },
  { key: 'semua', label: 'Semua' },
];

function matchesFilter(deposit: BsiIncomingDeposit, filter: IncomingFilter) {
  if (filter === 'semua') return true;
  if (filter === 'perlu_aksi') return deposit.status === 'dikirim_ke_bsi';
  if (filter === 'dipublikasikan') return deposit.status === 'dipublikasikan';
  return (
    deposit.status === 'dibeli_industri' ||
    deposit.status === 'diambil_bsi' ||
    deposit.status === 'diambil_industri'
  );
}

export function IncomingDepositsPage() {
  const { profile } = useAuth();
  const orgId = profile?.org_id ?? null;
  const [filter, setFilter] = useState<IncomingFilter>('perlu_aksi');
  const [search, setSearch] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  usePageTitle('Data masuk BSI');

  const incomingQuery = useBsiIncomingDeposits(orgId);
  const publishMutation = usePublishDepositToStock();
  const rows = incomingQuery.data ?? [];

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!keyword) return true;
      return `${row.warga_nama} ${row.bsu_nama} ${row.estimasi_jenis}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, filter, search]);

  const waiting = rows.filter((row) => row.status === 'dikirim_ke_bsi');
  const published = rows.filter((row) => row.status === 'dipublikasikan');
  const waitingWeight = waiting.reduce(
    (total, row) => total + toNumber(row.berat_final_kg),
    0,
  );
  const publishedValue = published.reduce(
    (total, row) => total + toNumber(row.total),
    0,
  );

  const stats: DashboardStat[] = [
    {
      key: 'antrean',
      label: 'Perlu publikasi',
      value: waiting.length,
      format: 'number',
      hint: 'Setoran baru dari BSU',
      badge: waiting.length > 0 ? 'Perlu aksi' : undefined,
    },
    {
      key: 'berat',
      label: 'Berat menunggu',
      value: waitingWeight,
      format: 'weight',
      hint: 'Belum menjadi stok',
    },
    {
      key: 'stok',
      label: 'Setoran tersedia',
      value: published.length,
      format: 'number',
      hint: 'Sudah dipublikasikan',
    },
    {
      key: 'pendapatan',
      label: 'Nilai setoran',
      value: publishedValue,
      format: 'currency',
      hint: 'Total setoran tersedia',
    },
  ];

  const handlePublish = async (deposit: BsiIncomingDeposit) => {
    setMessage(null);
    setPublishingId(deposit.id);
    try {
      await publishMutation.mutateAsync(deposit.id);
      setMessage({
        type: 'success',
        text: `Setoran ${deposit.estimasi_jenis} dari ${deposit.bsu_nama} berhasil dipublikasikan menjadi stok.`,
      });
    } catch (failure) {
      setMessage({
        type: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Stok gagal dipublikasikan.',
      });
    } finally {
      setPublishingId(null);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Data masuk BSI"
        title="Setoran dari BSU"
        description="Periksa data setoran yang dikirim BSU lalu publikasikan menjadi stok gabungan BSI. Kontak dan lokasi warga tetap privat."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/bsi/stok"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <Warehouse className="h-3.5 w-3.5" />
            Lihat stok
          </Link>
        }
      />

      <div className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-[10px] leading-5 text-brand-900">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        BSI hanya menerima nama warga, BSU asal, jenis sampah, berat, dan
        nominal. Nomor WhatsApp, alamat, koordinat, dan foto tidak pernah
        diteruskan ke BSI.
      </div>

      {message && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-[11px] leading-5 ${
            message.type === 'success'
              ? 'border-brand-100 bg-brand-50 text-brand-900'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          <p className="flex items-start gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Inbox className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {message.text}
          </p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-[10px] font-semibold underline-offset-2 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {incomingQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari data masuk"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Warga, BSU, atau jenis sampah"
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
          {incomingQuery.isLoading && (
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

          {incomingQuery.isError && (
            <EmptyState
              icon={Inbox}
              title="Data masuk belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void incomingQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!incomingQuery.isLoading &&
            !incomingQuery.isError &&
            rows.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="Belum ada data masuk"
                description="Setoran yang dikirim BSU akan muncul di sini untuk dipublikasikan menjadi stok."
              />
            )}

          {!incomingQuery.isLoading &&
            !incomingQuery.isError &&
            rows.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={Search}
                title="Tidak ada data pada filter ini"
                description="Pilih filter lain atau ubah kata kunci pencarian."
              />
            )}

          {filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((deposit) => {
                const isPublishing = publishingId === deposit.id;

                return (
                  <div
                    key={deposit.id}
                    className="rounded-[20px] border border-black/[0.04] bg-white p-3.5 sm:p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                          <Scale className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-ink sm:text-sm">
                            {deposit.estimasi_jenis}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {deposit.warga_nama} · dari {deposit.bsu_nama}
                          </p>
                          <p className="mt-1 text-[10px] text-muted">
                            {formatDateTime(deposit.created_at)} · ID{' '}
                            {deposit.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <DepositStatusBadge status={deposit.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                          Berat final
                        </p>
                        <p className="mt-0.5 text-[12px] font-bold text-ink">
                          {formatWeight(toNumber(deposit.berat_final_kg))}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                          Dibayar BSU
                        </p>
                        <p className="mt-0.5 text-[12px] font-bold text-ink">
                          {formatCurrency(toNumber(deposit.total))}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5 sm:col-span-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                          Dikirim ke BSI
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-ink">
                          {deposit.dikirim_ke_bsi_at
                            ? formatDateTime(deposit.dikirim_ke_bsi_at)
                            : 'Belum dikirim'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.04] pt-2.5">
                      <Link
                        to={`/bsi/setoran/${deposit.id}`}
                        className={buttonStyles({
                          variant: 'secondary',
                          size: 'sm',
                        })}
                      >
                        Detail
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      {deposit.status === 'dikirim_ke_bsi' && (
                        <Button
                          size="sm"
                          loading={isPublishing}
                          disabled={Boolean(publishingId) && !isPublishing}
                          onClick={() => void handlePublish(deposit)}
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                          Publikasikan stok
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {rows.length > 0 && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {rows.length} setoran yang diterima
          BSI.
        </p>
      )}
    </div>
  );
}
