import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  PackageSearch,
  RefreshCw,
  Scale,
  Search,
  ShoppingBag,
  Store,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBsiStockCatalog } from '@/hooks/useBsi';
import {
  formatCurrency,
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
import { CreateStockOrderDialog } from '@/components/orders/CreateStockOrderDialog';
import type {
  BsiStockSummary,
  DashboardStat,
} from '@/types/database';

interface StockGroup {
  bsiId: string;
  bsiNama: string;
  rows: BsiStockSummary[];
  weight: number;
  pricedRows: number;
}

export function IndustriStockPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [orderGroup, setOrderGroup] = useState<StockGroup | null>(null);
  const [created, setCreated] = useState<{ id: string; nomor: string } | null>(
    null,
  );

  usePageTitle('Stok BSI');

  const catalogQuery = useBsiStockCatalog();
  const rows = catalogQuery.data ?? [];

  const categories = useMemo(() => {
    const unique = new Set(
      rows
        .map((row) => row.kategori)
        .filter((value): value is string => Boolean(value)),
    );
    return ['semua', ...Array.from(unique).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (kategori !== 'semua' && row.kategori !== kategori) return false;
      if (!keyword) return true;
      return `${row.bsi_nama} ${row.waste_nama} ${row.waste_kode ?? ''} ${
        row.kategori ?? ''
      }`
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, kategori, search]);

  const groups = useMemo(() => {
    const map = new Map<string, StockGroup>();
    for (const row of filteredRows) {
      const existing = map.get(row.bsi_id);
      if (existing) {
        existing.rows.push(row);
        existing.weight += toNumber(row.berat_tersedia_kg);
        if (row.harga_jual_per_kg) existing.pricedRows += 1;
      } else {
        map.set(row.bsi_id, {
          bsiId: row.bsi_id,
          bsiNama: row.bsi_nama,
          rows: [row],
          weight: toNumber(row.berat_tersedia_kg),
          pricedRows: row.harga_jual_per_kg ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.bsiNama.localeCompare(b.bsiNama),
    );
  }, [filteredRows]);

  const totalWeight = rows.reduce(
    (total, row) => total + toNumber(row.berat_tersedia_kg),
    0,
  );
  const bsiCount = new Set(rows.map((row) => row.bsi_id)).size;
  const estimatedValue = rows.reduce(
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
      hint: 'Siap dibeli dari BSI',
    },
    {
      key: 'jenis',
      label: 'Jenis stok',
      value: rows.length,
      format: 'number',
      hint: 'Gabungan semua BSI',
    },
    {
      key: 'bsi',
      label: 'BSI mitra',
      value: bsiCount,
      format: 'number',
      hint: 'Penyedia stok aktif',
    },
    {
      key: 'nilai',
      label: 'Estimasi nilai',
      value: estimatedValue,
      format: 'currency',
      hint: 'Sesuai harga jual BSI',
    },
  ];

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Katalog stok BSI"
        title="Belanja stok dari BSI"
        description="Temukan stok gabungan dari BSI mitra, bandingkan harga jual, lalu buat pesanan. Stok langsung dikunci untuk pesananmu."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/industri/pesanan"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Pesanan saya
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {created && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[11px] leading-5 text-brand-900">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Pesanan {created.nomor} berhasil dibuat. Stok sudah dikunci untukmu.
            <Link
              to="/industri/pesanan"
              className="font-bold underline underline-offset-2"
            >
              Bayar sekarang
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="text-[10px] font-semibold underline-offset-2 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {catalogQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari stok"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama BSI, jenis sampah, atau kode"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
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
        </div>

        <div className="mt-4">
          {catalogQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-2.5 w-60" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {catalogQuery.isError && (
            <EmptyState
              icon={Warehouse}
              title="Katalog stok belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void catalogQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!catalogQuery.isLoading &&
            !catalogQuery.isError &&
            rows.length === 0 && (
              <EmptyState
                icon={Warehouse}
                title="Belum ada stok tersedia"
                description="Stok akan muncul setelah BSI mempublikasikan setoran dari BSU dan mengatur harga jual."
              />
            )}

          {!catalogQuery.isLoading &&
            !catalogQuery.isError &&
            rows.length > 0 &&
            groups.length === 0 && (
              <EmptyState
                icon={PackageSearch}
                title="Tidak ada stok pada filter ini"
                description="Ubah kata kunci atau pilih kategori lain."
              />
            )}

          {groups.length > 0 && (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.bsiId}
                  className="rounded-[22px] border border-black/[0.05] bg-white p-3.5 sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                        <Store className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-ink sm:text-sm">
                          {group.bsiNama}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {formatWeight(group.weight)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{group.rows.length} jenis stok</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Harga jual BSI
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={group.pricedRows === 0}
                      onClick={() => setOrderGroup(group)}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Buat pesanan
                    </Button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {group.rows.map((row) => (
                      <div
                        key={row.waste_type_id}
                        className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: row.warna }}
                        >
                          <Scale className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-ink">
                            {row.waste_nama}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted">
                            Tersedia{' '}
                            {formatWeight(toNumber(row.berat_tersedia_kg))} ·{' '}
                            {toNumber(row.jumlah_bsu)} BSU asal
                          </p>
                        </div>
                        <div className="text-right">
                          {row.harga_jual_per_kg ? (
                            <p className="text-[11px] font-extrabold text-brand-800">
                              {formatCurrency(
                                toNumber(row.harga_jual_per_kg),
                              )}
                              <span className="text-[8px] font-medium text-muted">
                                /kg
                              </span>
                            </p>
                          ) : (
                            <Badge
                              tone="amber"
                              className="px-1.5 py-0.5 text-[8px]"
                            >
                              Harga belum diatur
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {group.pricedRows < group.rows.length && (
                    <p className="mt-2 text-[9px] leading-4 text-amber-700">
                      Sebagian stok belum memiliki harga jual dan tidak dapat
                      dipesan sampai BSI mengaturnya.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {rows.length > 0 && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {groups.length} BSI dengan {filteredRows.length} jenis
          stok pada filter aktif.
        </p>
      )}

      {orderGroup && (
        <CreateStockOrderDialog
          open
          onClose={() => setOrderGroup(null)}
          bsiId={orderGroup.bsiId}
          bsiNama={orderGroup.bsiNama}
          rows={orderGroup.rows}
          onCreated={(order) => {
            setOrderGroup(null);
            setCreated(order);
          }}
        />
      )}
    </div>
  );
}
