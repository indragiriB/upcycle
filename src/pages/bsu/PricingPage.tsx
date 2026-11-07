import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  History,
  Info,
  RefreshCw,
  Search,
  Tag,
  Tags,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useActiveBuyPrices,
  useBsuPriceHistory,
  useWasteTypes,
} from '@/hooks/usePrices';
import {
  formatCurrency,
  formatDateShort,
  toNumber,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceDialog } from '@/components/pricing/PriceDialog';
import type { WasteType } from '@/types/database';

export function PricingPage() {
  const { profile } = useAuth();
  const orgId = profile?.org_id ?? null;
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [selectedWaste, setSelectedWaste] = useState<WasteType | null>(null);

  usePageTitle('Harga BSU');

  const wasteQuery = useWasteTypes();
  const activeQuery = useActiveBuyPrices(orgId);
  const historyQuery = useBsuPriceHistory(orgId);

  const wasteTypes = wasteQuery.data ?? [];
  const activePrices = orgId ? activeQuery.data ?? [] : [];
  const history = historyQuery.data ?? [];

  const currentByWaste = useMemo(
    () =>
      new Map(
        activePrices.map((price) => [price.waste_type_id, price]),
      ),
    [activePrices],
  );

  const categories = useMemo(() => {
    const unique = new Set(
      wasteTypes
        .map((waste) => waste.kategori)
        .filter((value): value is string => Boolean(value)),
    );
    return ['semua', ...Array.from(unique).sort()];
  }, [wasteTypes]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return wasteTypes.filter((waste) => {
      if (kategori !== 'semua' && waste.kategori !== kategori) return false;
      if (!keyword) return true;
      return `${waste.nama} ${waste.kode ?? ''} ${waste.kategori ?? ''}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [wasteTypes, search, kategori]);

  const averagePrice = activePrices.length
    ? Math.round(
        activePrices.reduce(
          (total, price) => total + toNumber(price.harga_per_kg),
          0,
        ) / activePrices.length,
      )
    : 0;

  const stats = [
    {
      label: 'Harga aktif',
      value: String(activePrices.length),
      hint: `Dari ${wasteTypes.length} jenis sampah`,
      icon: Tags,
    },
    {
      label: 'Rata-rata harga beli',
      value: averagePrice ? formatCurrency(averagePrice) : '—',
      hint: 'Per kg untuk jenis aktif',
      icon: TrendingUp,
    },
    {
      label: 'Riwayat perubahan',
      value: String(history.length),
      hint: 'Baris harga tersimpan',
      icon: History,
    },
  ];

  if (!profile) return null;

  const currentForSelected = selectedWaste
    ? currentByWaste.get(selectedWaste.id) ?? null
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Harga BSU"
        title="Atur harga beli sampah"
        description="Tetapkan harga beli per kilogram untuk setiap jenis sampah. Harga lama tetap tersimpan untuk kebutuhan audit dan penimbangan."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/bsu/setoran"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Buka antrean
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted">
                  {stat.label}
                </p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-ink">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] text-muted">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Tags className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Daftar harga beli</h2>
              <p className="text-[10px] text-muted">
                Pilih jenis sampah untuk menetapkan harga baru.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Input
              label="Cari jenis sampah"
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
            {wasteQuery.isLoading && (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[18px] border border-black/[0.04] p-3.5"
                  >
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {wasteQuery.isError && (
              <EmptyState
                icon={Tags}
                title="Jenis sampah belum bisa dimuat"
                description="Periksa koneksi Supabase lalu coba lagi."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void wasteQuery.refetch()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Coba lagi
                  </Button>
                }
              />
            )}

            {!wasteQuery.isLoading &&
              !wasteQuery.isError &&
              filtered.length === 0 && (
                <EmptyState
                  icon={Tag}
                  title="Tidak ada jenis sampah yang cocok"
                  description="Ubah kata kunci atau pilih kategori lain."
                />
              )}

            {filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map((waste) => {
                  const active = currentByWaste.get(waste.id) ?? null;
                  return (
                    <div
                      key={waste.id}
                      className="flex flex-wrap items-center gap-3 rounded-[18px] border border-black/[0.05] bg-[#fafbf8] p-3.5"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: waste.warna }}
                      >
                        <Tag className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[12px] font-bold text-ink">
                            {waste.nama}
                          </p>
                          {waste.kode && (
                            <Badge
                              tone="neutral"
                              className="px-1.5 py-0.5 text-[8px]"
                            >
                              {waste.kode}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {waste.kategori ?? 'Lainnya'}
                          {active
                            ? ` · berlaku ${formatDateShort(
                                active.berlaku_mulai,
                              )}`
                            : ' · harga belum diatur'}
                        </p>
                      </div>

                      <div className="text-right">
                        {active ? (
                          <>
                            <p className="text-[13px] font-extrabold text-brand-800">
                              {formatCurrency(
                                toNumber(active.harga_per_kg),
                              )}
                              <span className="text-[9px] font-medium text-muted">
                                /kg
                              </span>
                            </p>
                            <p className="text-[9px] text-muted">
                              Harga aktif
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] font-semibold text-amber-700">
                            Belum diatur
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant={active ? 'secondary' : 'soft'}
                        onClick={() => setSelectedWaste(waste)}
                      >
                        {active ? 'Ubah' : 'Atur'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 md:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <History className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Riwayat harga terbaru
                </h2>
                <p className="text-[10px] text-muted">
                  Perubahan tidak menimpa harga lama.
                </p>
              </div>
            </div>

            <div className="mt-3">
              {historyQuery.isLoading && (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((item) => (
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

              {historyQuery.isError && (
                <EmptyState
                  icon={History}
                  title="Riwayat belum bisa dimuat"
                  description="Coba muat ulang halaman."
                  compact
                />
              )}

              {!historyQuery.isLoading &&
                !historyQuery.isError &&
                history.length === 0 && (
                  <EmptyState
                    icon={History}
                    title="Belum ada riwayat harga"
                    description="Harga yang kamu simpan akan tercatat di sini."
                    compact
                  />
                )}

              {history.length > 0 && (
                <div className="space-y-1.5">
                  {history.slice(0, 12).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-ink">
                            {entry.waste_types?.nama ?? 'Jenis sampah'}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted">
                            Berlaku {formatDateShort(entry.berlaku_mulai)}
                            {entry.profiles?.nama
                              ? ` · ${entry.profiles.nama}`
                              : ''}
                          </p>
                        </div>
                        <p className="shrink-0 text-[11px] font-extrabold text-brand-800">
                          {formatCurrency(
                            toNumber(entry.harga_per_kg),
                          )}
                          <span className="text-[8px] font-medium text-muted">
                            /kg
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="border-brand-100 bg-brand-50/40 p-4 md:p-5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                <Info className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Cara kerja harga BSU
                </h2>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-muted">
                  <li>
                    Harga baru dipakai pada penimbangan setelah waktu berlaku.
                  </li>
                  <li>
                    Petugas tetap bisa menyesuaikan harga saat menimbang, tetapi
                    wajib mengisi alasan penyesuaian.
                  </li>
                  <li>
                    Harga acuan ikut disimpan pada item setoran agar riwayat
                    pembayaran tetap dapat diaudit.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <PriceDialog
        open={Boolean(selectedWaste)}
        onClose={() => setSelectedWaste(null)}
        wasteType={selectedWaste}
        currentPrice={
          currentForSelected
            ? toNumber(currentForSelected.harga_per_kg)
            : null
        }
        orgId={orgId}
        userId={profile.id}
      />
    </div>
  );
}
