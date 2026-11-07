import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Search,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useVerifiedBsuOrganizations } from '@/hooks/useOrganizations';
import { useActiveBuyPrices } from '@/hooks/usePrices';
import { formatCurrency, toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { buttonStyles } from '@/components/ui/Button';

export function WastePricesPage() {
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('semua');
  const pricesQuery = useActiveBuyPrices();
  const bsuQuery = useVerifiedBsuOrganizations();

  usePageTitle('Harga BSU');

  const prices = pricesQuery.data ?? [];
  const bsuList = bsuQuery.data ?? [];
  const bsuById = useMemo(
    () => new Map(bsuList.map((org) => [org.id, org])),
    [bsuList],
  );

  const categories = useMemo(() => {
    const unique = new Set(
      prices
        .map((price) => price.kategori)
        .filter((value): value is string => Boolean(value)),
    );
    return ['semua', ...Array.from(unique).sort()];
  }, [prices]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        wasteTypeId: string;
        nama: string;
        kategori: string | null;
        warna: string;
        offers: typeof prices;
      }
    >();

    const keyword = search.trim().toLowerCase();
    for (const price of prices) {
      if (kategori !== 'semua' && price.kategori !== kategori) continue;
      if (
        keyword &&
        !`${price.waste_nama} ${price.kategori ?? ''} ${price.org_nama}`
          .toLowerCase()
          .includes(keyword)
      ) {
        continue;
      }

      const existing = map.get(price.waste_type_id);
      if (existing) {
        existing.offers.push(price);
      } else {
        map.set(price.waste_type_id, {
          wasteTypeId: price.waste_type_id,
          nama: price.waste_nama,
          kategori: price.kategori,
          warna: price.warna,
          offers: [price],
        });
      }
    }

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        offers: [...group.offers].sort(
          (a, b) => toNumber(b.harga_per_kg) - toNumber(a.harga_per_kg),
        ),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [prices, search, kategori]);

  const bestPrice = prices.reduce(
    (best, price) => Math.max(best, toNumber(price.harga_per_kg)),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Harga BSU"
        title="Bandingkan harga beli BSU"
        description="Harga di bawah adalah harga aktif per kilogram. Nilai final tetap mengikuti hasil penimbangan BSU."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/warga/setor"
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            Buat setoran
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'BSU terverifikasi',
            value: String(bsuList.length),
            hint: 'Mitra aktif di jaringan',
          },
          {
            label: 'Jenis sampah',
            value: String(groups.length),
            hint: 'Memiliki harga beli aktif',
          },
          {
            label: 'Harga tertinggi',
            value: bestPrice ? formatCurrency(bestPrice) : '—',
            hint: 'Per kg saat ini',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-card"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-muted">
                {stat.label}
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-extrabold tracking-tight text-ink">
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] text-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari jenis sampah atau BSU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Contoh: PET atau Melati"
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
          {pricesQuery.isLoading && (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-black/[0.04] p-4"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-20" />
                  <Skeleton className="mt-4 h-10 w-full" />
                </div>
              ))}
            </div>
          )}

          {pricesQuery.isError && (
            <EmptyState
              icon={Tag}
              title="Harga belum bisa dimuat"
              description="Periksa koneksi Supabase lalu muat ulang halaman."
            />
          )}

          {!pricesQuery.isLoading &&
            !pricesQuery.isError &&
            groups.length === 0 && (
              <EmptyState
                icon={Tag}
                title="Belum ada harga yang cocok"
                description="Coba ubah kata kunci atau pilih kategori lain."
              />
            )}

          {!pricesQuery.isLoading && groups.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {groups.map((group) => {
                const best = group.offers[0];
                return (
                  <div
                    key={group.wasteTypeId}
                    className="rounded-[22px] border border-black/[0.05] bg-[#fafbf8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: group.warna }}
                        >
                          <Tag className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink">
                            {group.nama}
                          </p>
                          <p className="text-[10px] text-muted">
                            {group.kategori ?? 'Lainnya'} ·{' '}
                            {group.offers.length} BSU
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
                          Tertinggi
                        </p>
                        <p className="text-sm font-extrabold text-brand-800">
                          {formatCurrency(toNumber(best.harga_per_kg))}
                          <span className="text-[9px] font-medium text-muted">
                            /kg
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 divide-y divide-black/[0.05] rounded-2xl bg-white px-3">
                      {group.offers.map((offer) => {
                        const bsu = bsuById.get(offer.org_id);
                        return (
                          <div
                            key={offer.id}
                            className="flex items-center justify-between gap-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-ink">
                                {offer.org_nama}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-muted">
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-brand-600" />
                                {bsu?.kota ?? bsu?.alamat ?? 'Lokasi BSU'}
                              </p>
                            </div>
                            <Badge
                              tone={
                                offer.id === best.id ? 'green' : 'neutral'
                              }
                              className="shrink-0 px-2 py-0.5 text-[9px]"
                            >
                              {formatCurrency(toNumber(offer.harga_per_kg))}
                              /kg
                            </Badge>
                          </div>
                        );
                      })}
                    </div>

                    <Link
                      to="/warga/setor"
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                    >
                      Setor jenis ini
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
