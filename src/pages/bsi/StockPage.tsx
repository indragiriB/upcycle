import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  Info,
  Layers,
  RefreshCw,
  Scale,
  Search,
  Tags,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useBsiStockLots,
  useBsiStockSummary,
} from '@/hooks/useBsi';
import { useActivePrices, useWasteTypes } from '@/hooks/usePrices';
import {
  formatCurrency,
  formatDateShort,
  formatWeight,
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
import { PriceDialog } from '@/components/pricing/PriceDialog';
import {
  STOCK_STATUS_LABELS,
  statusLabel,
} from '@/lib/status';
import type {
  DashboardStat,
} from '@/types/database';

interface PriceTarget {
  wasteTypeId: string;
  currentPrice: number | null;
}

export function StockPage() {
  const { profile } = useAuth();
  const orgId = profile?.org_id ?? null;
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [priceTarget, setPriceTarget] = useState<PriceTarget | null>(null);

  usePageTitle('Stok & harga jual BSI');

  const summaryQuery = useBsiStockSummary(orgId);
  const lotsQuery = useBsiStockLots(orgId);
  const wasteQuery = useWasteTypes();
  const activeSellQuery = useActivePrices(orgId, 'jual');

  const rows = summaryQuery.data ?? [];
  const lots = lotsQuery.data ?? [];
  const wasteTypes = wasteQuery.data ?? [];
  const activeSellPrices = activeSellQuery.data ?? [];

  const wasteById = useMemo(
    () => new Map(wasteTypes.map((waste) => [waste.id, waste])),
    [wasteTypes],
  );

  const sellPriceByWaste = useMemo(() => {
    const map = new Map<string, number>();
    for (const price of activeSellPrices) {
      map.set(price.waste_type_id, toNumber(price.harga_per_kg));
    }
    for (const row of rows) {
      if (row.harga_jual_per_kg !== null) {
        map.set(row.waste_type_id, toNumber(row.harga_jual_per_kg));
      }
    }
    return map;
  }, [activeSellPrices, rows]);

  const unstockedWasteTypes = useMemo(() => {
    const stocked = new Set(rows.map((row) => row.waste_type_id));
    return wasteTypes.filter((waste) => !stocked.has(waste.id));
  }, [rows, wasteTypes]);

  const categories = useMemo(() => {
    const unique = new Set(
      rows
        .map((row) => row.kategori)
        .filter((value): value is string => Boolean(value)),
    );
    return ['semua', ...Array.from(unique).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (kategori !== 'semua' && row.kategori !== kategori) return false;
      if (!keyword) return true;
      return `${row.waste_nama} ${row.waste_kode ?? ''} ${
        row.kategori ?? ''
      }`
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, kategori, search]);

  const activeLots = lots.filter((lot) => lot.status === 'tersedia');
  const totalWeight = rows.reduce(
    (total, row) => total + toNumber(row.berat_tersedia_kg),
    0,
  );
  const pricedCount = rows.filter((row) =>
    Boolean(row.harga_jual_per_kg),
  ).length;
  const stockValue = rows.reduce(
    (total, row) =>
      total +
      toNumber(row.berat_tersedia_kg) *
        toNumber(row.harga_jual_per_kg ?? 0),
    0,
  );

  const stats: DashboardStat[] = [
    {
      key: 'berat',
      label: 'Stok tersedia',
      value: totalWeight,
      format: 'weight',
      hint: `${activeLots.length} lot aktif`,
    },
    {
      key: 'jenis',
      label: 'Jenis stok',
      value: rows.length,
      format: 'number',
      hint: 'Jenis sampah tersedia',
    },
    {
      key: 'harga',
      label: 'Harga jual aktif',
      value: pricedCount,
      format: 'number',
      hint: `Dari ${rows.length} jenis stok`,
      badge: pricedCount < rows.length ? 'Perlu harga' : undefined,
    },
    {
      key: 'nilai',
      label: 'Nilai stok',
      value: stockValue,
      format: 'currency',
      hint: 'Estimasi harga jual',
    },
  ];

  if (!profile) return null;

  const selectedWaste = priceTarget
    ? wasteById.get(priceTarget.wasteTypeId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Stok BSI"
        title="Stok gabungan & harga jual"
        description="Pantau lot stok dari seluruh BSU, atur harga jual per kilogram, dan pastikan stok siap dibeli pengepul."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/bsi/pesanan"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Pesanan masuk
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-[10px] leading-5 text-brand-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Harga jual wajib aktif untuk setiap jenis sampah sebelum setoran bisa
        dipublikasikan menjadi stok. Perubahan harga tidak menimpa riwayat harga
        lama.
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Warehouse className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Ringkasan stok per jenis
              </h2>
              <p className="text-[10px] text-muted">
                Stok gabungan dari semua BSU mitra.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Input
              label="Cari jenis stok"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Contoh: PET, kardus, atau kode"
              icon={Search}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKategori(item)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold capitalize transition-colors ${
                  kategori === item
                    ? 'bg-brand-600 text-white'
                    : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
                }`}
              >
                {item === 'semua' ? 'Semua kategori' : item}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {summaryQuery.isLoading && (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[18px] border border-black/[0.04] p-3.5"
                  >
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-44" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {summaryQuery.isError && (
              <EmptyState
                icon={Warehouse}
                title="Stok belum bisa dimuat"
                description="Periksa koneksi Supabase lalu coba lagi."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void summaryQuery.refetch()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Coba lagi
                  </Button>
                }
              />
            )}

            {!summaryQuery.isLoading &&
              !summaryQuery.isError &&
              rows.length === 0 && (
                <EmptyState
                  icon={Boxes}
                  title="Belum ada stok"
                  description="Publikasikan setoran dari BSU terlebih dahulu agar stok muncul di sini."
                  action={
                    <Link
                      to="/bsi/setoran"
                      className={buttonStyles({
                        variant: 'soft',
                        size: 'sm',
                      })}
                    >
                      Buka data masuk
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              )}

            {!summaryQuery.isLoading &&
              !summaryQuery.isError &&
              rows.length > 0 &&
              filtered.length === 0 && (
                <EmptyState
                  icon={Search}
                  title="Tidak ada stok pada filter ini"
                  description="Ubah kata kunci atau pilih kategori lain."
                />
              )}

            {filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((row) => (
                  <div
                    key={`${row.bsi_id}-${row.waste_type_id}`}
                    className="rounded-[18px] border border-black/[0.05] bg-[#fafbf8] p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: row.warna }}
                      >
                        <Scale className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[12px] font-bold text-ink">
                            {row.waste_nama}
                          </p>
                          {row.waste_kode && (
                            <Badge
                              tone="neutral"
                              className="px-1.5 py-0.5 text-[8px]"
                            >
                              {row.waste_kode}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {formatWeight(toNumber(row.berat_tersedia_kg))} ·{' '}
                          {toNumber(row.jumlah_bsu)} BSU asal
                        </p>
                      </div>
                      <div className="text-right">
                        {row.harga_jual_per_kg ? (
                          <>
                            <p className="text-[13px] font-extrabold text-brand-800">
                              {formatCurrency(
                                toNumber(row.harga_jual_per_kg),
                              )}
                              <span className="text-[9px] font-medium text-muted">
                                /kg
                              </span>
                            </p>
                            <p className="text-[9px] text-muted">
                              Harga jual aktif
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] font-semibold text-amber-700">
                            Harga jual belum diatur
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={row.harga_jual_per_kg ? 'secondary' : 'soft'}
                        disabled={!wasteById.has(row.waste_type_id)}
                        onClick={() =>
                          setPriceTarget({
                            wasteTypeId: row.waste_type_id,
                            currentPrice: row.harga_jual_per_kg ?? null,
                          })
                        }
                      >
                        {row.harga_jual_per_kg ? 'Ubah' : 'Atur harga'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Layers className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Lot stok terbaru</h2>
                <p className="text-[10px] text-muted">
                  Setiap lot berasal dari satu setoran BSU.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {lotsQuery.isLoading && (
                <div className="space-y-2">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-[#f8faf7] px-3.5 py-3"
                    >
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="mt-2 h-2.5 w-20" />
                    </div>
                  ))}
                </div>
              )}

              {lotsQuery.isError && (
                <EmptyState
                  icon={Layers}
                  title="Lot belum bisa dimuat"
                  description="Coba muat ulang halaman."
                  compact
                />
              )}

              {!lotsQuery.isLoading &&
                !lotsQuery.isError &&
                lots.length === 0 && (
                  <EmptyState
                    icon={Layers}
                    title="Belum ada lot stok"
                    description="Lot dibuat otomatis saat setoran dipublikasikan."
                    compact
                  />
                )}

              {lots.length > 0 && (
                <div className="space-y-1.5">
                  {lots.slice(0, 20).map((lot) => (
                    <div
                      key={lot.id}
                      className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-ink">
                            {lot.waste_types?.nama ?? 'Jenis sampah'}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted">
                            {lot.bsu?.nama ?? 'BSU asal'} · dipublikasikan{' '}
                            {formatDateShort(lot.published_at)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-extrabold text-ink">
                            {formatWeight(toNumber(lot.berat_tersedia_kg))}
                          </p>
                          <Badge
                            tone={lot.status === 'tersedia' ? 'green' : 'neutral'}
                            className="mt-0.5 px-1.5 py-0.5 text-[8px]"
                          >
                            {statusLabel(lot.status, STOCK_STATUS_LABELS)}
                          </Badge>
                        </div>
                      </div>
                      <Link
                        to={`/bsi/setoran/${lot.deposit_id}`}
                        className="mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Lihat setoran asal
                        <ChevronRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="border-brand-100 bg-brand-50/40 p-4 md:p-5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                <Tags className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Cara kerja harga jual
                </h2>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-muted">
                  <li>
                    Harga jual dipakai saat pengepul membuat pesanan stok.
                  </li>
                  <li>
                    Publikasi setoran gagal bila salah satu jenis sampah belum
                    punya harga jual aktif.
                  </li>
                  <li>
                    Harga baru berlaku sesuai waktu yang kamu tentukan dan
                    tidak mengubah pesanan yang sudah dibuat.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {unstockedWasteTypes.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Tags className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Harga jual jenis tanpa stok
              </h2>
              <p className="text-[10px] text-muted">
                Atur harga jual untuk jenis sampah yang belum punya lot stok.
                Harga ini dibutuhkan saat setoran masuk dipublikasikan.
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {unstockedWasteTypes.map((waste) => {
              const price = sellPriceByWaste.get(waste.id) ?? null;
              return (
                <div
                  key={waste.id}
                  className="flex items-center gap-2.5 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: waste.warna }}
                  >
                    <Scale className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-ink">
                      {waste.nama}
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted">
                      {price !== null
                        ? `${formatCurrency(price)}/kg`
                        : 'Harga jual belum diatur'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={price !== null ? 'secondary' : 'soft'}
                    onClick={() =>
                      setPriceTarget({
                        wasteTypeId: waste.id,
                        currentPrice: price,
                      })
                    }
                  >
                    {price !== null ? 'Ubah' : 'Atur harga'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {priceTarget && selectedWaste && (
        <PriceDialog
          open
          onClose={() => setPriceTarget(null)}
          wasteType={selectedWaste}
          currentPrice={priceTarget.currentPrice}
          orgId={orgId}
          userId={profile.id}
          kind="jual"
        />
      )}
    </div>
  );
}
