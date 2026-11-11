import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Info,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCashBook } from '@/hooks/useCashBook';
import { ledgerCategoryLabel } from '@/lib/deposits';
import {
  formatCurrency,
  formatDateTime,
  toNumber,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { OperationalExpenseDialog } from '@/components/cash/OperationalExpenseDialog';
import { LedgerCorrectionDialog } from '@/components/cash/LedgerCorrectionDialog';
import type {
  DashboardStat,
  LedgerEntry,
} from '@/types/database';

export type CashBookVariant = 'bsu' | 'bsi' | 'industri';

type DirectionFilter = 'semua' | 'masuk' | 'keluar';

const DIRECTION_FILTERS: Array<{
  key: DirectionFilter;
  label: string;
}> = [
  { key: 'semua', label: 'Semua transaksi' },
  { key: 'masuk', label: 'Kas masuk' },
  { key: 'keluar', label: 'Kas keluar' },
];

const CASH_COPY: Record<
  CashBookVariant,
  {
    pageTitle: string;
    eyebrow: string;
    title: string;
    description: string;
    info: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    orgLabel: string;
    masukHint: string;
    keluarHint: string;
    secondaryLink: { to: string; label: string };
    orderLinkLabel: string;
  }
> = {
  bsu: {
    pageTitle: 'Buku kas BSU',
    eyebrow: 'Buku kas BSU',
    title: 'Kas & pengeluaran BSU',
    description:
      'Pantau pembayaran ke warga, biaya operasional, dan saldo kas BSU. Setiap entri bersifat append-only dan dapat dikoreksi dengan entri pembalik.',
    info: 'Pembayaran warga otomatis tercatat saat BSU menyimpan hasil timbang. Pendapatan penjualan setoran ke BSI juga masuk ke buku kas ini. Entri tidak dapat dihapus—gunakan tombol koreksi bila ada kesalahan.',
    emptyTitle: 'Belum ada transaksi kas',
    emptyDescription:
      'Pembayaran ke warga akan tercatat otomatis setelah penimbangan. Biaya operasional bisa kamu catat sekarang.',
    emptyAction: 'Catat biaya operasional',
    orgLabel: 'BSU',
    masukHint: 'Pembayaran & pemasukan',
    keluarHint: 'Pembayaran warga & operasional',
    secondaryLink: { to: '/bsu/setoran', label: 'Antrean setoran' },
    orderLinkLabel: 'Lihat pesanan',
  },
  bsi: {
    pageTitle: 'Buku kas BSI',
    eyebrow: 'Buku kas BSI',
    title: 'Kas & pengeluaran BSI',
    description:
      'Pantau kas masuk dari penjualan stok ke industri, biaya operasional, dan saldo kas BSI. Setiap entri bersifat append-only dan dapat dikoreksi dengan entri pembalik.',
    info: 'Pembayaran pesanan stok dari industri otomatis tercatat sebagai kas masuk BSI. Biaya operasional BSI dapat dicatat kapan saja. Entri tidak dapat dihapus—gunakan tombol koreksi bila ada kesalahan.',
    emptyTitle: 'Belum ada transaksi kas',
    emptyDescription:
      'Kas masuk akan tercatat otomatis saat industri membayar pesanan stok. Biaya operasional bisa kamu catat sekarang.',
    emptyAction: 'Catat biaya operasional',
    orgLabel: 'BSI',
    masukHint: 'Penjualan stok & pemasukan',
    keluarHint: 'Biaya operasional BSI',
    secondaryLink: { to: '/bsi/pesanan', label: 'Pesanan stok' },
    orderLinkLabel: 'Lihat pesanan',
  },
  industri: {
    pageTitle: 'Buku kas industri',
    eyebrow: 'Buku kas industri',
    title: 'Kas & pengeluaran industri',
    description:
      'Pantau kas keluar untuk pembelian stok BSI, biaya operasional, dan saldo kas industri. Setiap entri bersifat append-only dan dapat dikoreksi dengan entri pembalik.',
    info: 'Pembayaran pesanan stok ke BSI otomatis tercatat sebagai kas keluar industri. Pendapatan penjualan produk pada tahap berikutnya juga akan masuk ke buku kas ini. Entri tidak dapat dihapus—gunakan tombol koreksi bila ada kesalahan.',
    emptyTitle: 'Belum ada transaksi kas',
    emptyDescription:
      'Kas keluar akan tercatat otomatis saat kamu membayar pesanan stok BSI. Biaya operasional bisa kamu catat sekarang.',
    emptyAction: 'Catat biaya operasional',
    orgLabel: 'industri',
    masukHint: 'Penjualan produk & pemasukan',
    keluarHint: 'Pembelian stok & operasional',
    secondaryLink: { to: '/industri/pesanan', label: 'Pesanan saya' },
    orderLinkLabel: 'Lihat pesanan',
  },
};

export function CashBookPage({
  variant = 'bsu',
}: {
  variant?: CashBookVariant;
}) {
  const { profile } = useAuth();
  const orgId = profile?.org_id ?? null;
  const [filter, setFilter] = useState<DirectionFilter>('semua');
  const [kategori, setKategori] = useState('semua');
  const [search, setSearch] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [correctionEntry, setCorrectionEntry] =
    useState<LedgerEntry | null>(null);

  const copy = CASH_COPY[variant];

  usePageTitle(copy.pageTitle);

  const cashQuery = useCashBook(orgId);
  const balance = cashQuery.data?.balance ?? null;
  const entries = cashQuery.data?.entries ?? [];

  const correctedIds = useMemo(() => {
    const corrected = new Set<string>();
    for (const entry of entries) {
      if (
        entry.kategori === 'koreksi' &&
        entry.ref_type === 'ledger_entry' &&
        entry.ref_id
      ) {
        corrected.add(entry.ref_id);
      }
    }
    return corrected;
  }, [entries]);

  const categories = useMemo(() => {
    const unique = new Set(entries.map((entry) => entry.kategori));
    return ['semua', ...Array.from(unique).sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== 'semua' && entry.arah !== filter) return false;
      if (kategori !== 'semua' && entry.kategori !== kategori) return false;
      if (!keyword) return true;
      return `${entry.keterangan ?? ''} ${ledgerCategoryLabel(
        entry.kategori,
      )} ${entry.profiles?.nama ?? ''}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [entries, filter, kategori, search]);

  const filteredMasuk = filtered
    .filter((entry) => entry.arah === 'masuk')
    .reduce((total, entry) => total + toNumber(entry.jumlah), 0);
  const filteredKeluar = filtered
    .filter((entry) => entry.arah === 'keluar')
    .reduce((total, entry) => total + toNumber(entry.jumlah), 0);

  const stats: DashboardStat[] = [
    {
      key: 'pendapatan',
      label: 'Saldo kas',
      value: balance?.saldo ?? 0,
      format: 'currency',
      hint: 'Kas masuk dikurangi keluar',
    },
    {
      key: 'kas_masuk',
      label: 'Total masuk',
      value: balance?.total_masuk ?? 0,
      format: 'currency',
      hint: copy.masukHint,
    },
    {
      key: 'kas_keluar',
      label: 'Total keluar',
      value: balance?.total_keluar ?? 0,
      format: 'currency',
      hint: copy.keluarHint,
    },
    {
      key: 'total',
      label: 'Entri kas',
      value: entries.length,
      format: 'number',
      hint: 'Hingga 400 entri terbaru',
    },
  ];

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <>
            <Link
              to={copy.secondaryLink.to}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              {copy.secondaryLink.label}
            </Link>
            <Button size="sm" onClick={() => setExpenseOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Catat biaya
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-[10px] leading-5 text-brand-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {copy.info}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cashQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari transaksi"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Keterangan, kategori, atau pencatat"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIRECTION_FILTERS.map((item) => {
              const count =
                item.key === 'semua'
                  ? entries.length
                  : entries.filter((entry) => entry.arah === item.key).length;
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

        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKategori(item)}
              className={`rounded-full px-2.5 py-1 text-[9px] font-semibold transition-colors ${
                kategori === item
                  ? 'bg-ink text-white'
                  : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
              }`}
            >
              {item === 'semua' ? 'Semua kategori' : ledgerCategoryLabel(item)}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {cashQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[18px] border border-black/[0.04] p-3.5"
                >
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          )}

          {cashQuery.isError && (
            <EmptyState
              icon={Wallet}
              title="Buku kas belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void cashQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!cashQuery.isLoading &&
            !cashQuery.isError &&
            entries.length === 0 && (
              <EmptyState
                icon={ReceiptText}
                title={copy.emptyTitle}
                description={copy.emptyDescription}
                action={
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => setExpenseOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {copy.emptyAction}
                  </Button>
                }
              />
            )}

          {!cashQuery.isLoading &&
            !cashQuery.isError &&
            entries.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={ReceiptText}
                title="Tidak ada transaksi pada filter ini"
                description="Pilih arah, kategori, atau kata kunci lain."
              />
            )}

          {filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((entry) => {
                const incoming = entry.arah === 'masuk';
                const canCorrect =
                  entry.kategori !== 'koreksi' &&
                  !correctedIds.has(entry.id);
                const refLink =
                  entry.ref_type === 'deposit' && entry.ref_id
                    ? variant === 'bsu'
                      ? `/bsu/setoran/${entry.ref_id}`
                      : null
                    : entry.ref_type === 'order' && entry.ref_id
                      ? copy.secondaryLink.to
                      : null;
                const refLabel =
                  entry.ref_type === 'order'
                    ? copy.orderLinkLabel
                    : 'Lihat setoran';

                return (
                  <div
                    key={entry.id}
                    className="rounded-[18px] border border-black/[0.04] bg-white p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          incoming
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {incoming ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-[12px] font-bold leading-4 text-ink">
                              {entry.keterangan ||
                                ledgerCategoryLabel(entry.kategori)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-muted">
                              <span>{formatDateTime(entry.tanggal)}</span>
                              <span aria-hidden="true">·</span>
                              <Badge
                                tone={incoming ? 'green' : 'neutral'}
                                className="px-2 py-0.5 text-[8px]"
                              >
                                {ledgerCategoryLabel(entry.kategori)}
                              </Badge>
                              {entry.profiles?.nama && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Dicatat {entry.profiles.nama}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className={`text-[13px] font-extrabold ${
                                incoming
                                  ? 'text-brand-800'
                                  : 'text-red-600'
                              }`}
                            >
                              {incoming ? '+' : '−'}
                              {formatCurrency(toNumber(entry.jumlah))}
                            </p>
                            {refLink && (
                              <Link
                                to={refLink}
                                className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-brand-700 hover:text-brand-800"
                              >
                                {refLabel}
                                <ChevronRight className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {canCorrect && (
                          <div className="mt-2 flex justify-end border-t border-black/[0.04] pt-2">
                            <button
                              type="button"
                              onClick={() => setCorrectionEntry(entry)}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold text-muted transition-colors hover:bg-[#f2f5f1] hover:text-ink"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
                              Koreksi entri
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {entries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-muted">
          <p>
            Menampilkan {filtered.length} dari {entries.length} entri kas.
          </p>
          <p>
            Filter aktif: masuk {formatCurrency(filteredMasuk)} · keluar{' '}
            {formatCurrency(filteredKeluar)}
          </p>
        </div>
      )}

      <OperationalExpenseDialog
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        orgId={orgId}
        userId={profile.id}
        orgLabel={copy.orgLabel}
      />
      <LedgerCorrectionDialog
        open={Boolean(correctionEntry)}
        onClose={() => setCorrectionEntry(null)}
        entry={correctionEntry}
        orgId={orgId}
      />
    </div>
  );
}
