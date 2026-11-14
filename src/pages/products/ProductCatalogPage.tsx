import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  PackageSearch,
  RefreshCw,
  Search,
  Store,
  Tags,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCatalogProducts } from '@/hooks/useProducts';
import { PRODUCT_CONDITION_LABELS, PRODUCT_CONDITIONS } from '@/lib/products';
import { PageHeader } from '@/components/ui/PageHeader';
import { MarketTabs } from '@/components/products/MarketTabs';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductOrderDialog } from '@/components/products/ProductOrderDialog';
import type {
  DashboardStat,
  ProductCondition,
  ProductOrderRecord,
  ProductRecord,
} from '@/types/database';

export function ProductCatalogPage({
  variant = 'marketplace',
}: {
  variant?: 'buyer' | 'marketplace';
}) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [kondisi, setKondisi] = useState<'semua' | ProductCondition>('semua');
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(
    null,
  );
  const [createdOrder, setCreatedOrder] = useState<ProductOrderRecord | null>(
    null,
  );

  usePageTitle(
    variant === 'marketplace' ? 'Marketplace guna ulang' : 'Katalog produk',
  );

  const productsQuery = useCatalogProducts();
  const products = useMemo(
    () => productsQuery.data?.pages.flat() ?? [],
    [productsQuery.data],
  );

  const categories = useMemo(() => {
    const unique = new Set(
      products
        .map((product) => product.kategori)
        .filter((value): value is string => Boolean(value)),
    );
    return ['semua', ...Array.from(unique).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter((product) => {
      if (kondisi !== 'semua' && product.kondisi !== kondisi) return false;
      if (kategori !== 'semua' && product.kategori !== kategori) return false;
      if (!keyword) return true;
      return `${product.nama} ${product.kategori ?? ''} ${
        PRODUCT_CONDITION_LABELS[product.kondisi]
      } ${product.org?.nama ?? product.penjual?.nama ?? ''} ${
        product.deskripsi ?? ''
      }`
        .toLowerCase()
        .includes(keyword);
    });
  }, [products, kategori, kondisi, search]);

  const sellers = new Set(
    products.map((product) => product.penjual_org_id ?? product.penjual_id),
  ).size;
  const totalStock = products.reduce(
    (total, product) => total + product.stok,
    0,
  );
  const inventoryValue = products.reduce(
    (total, product) => total + product.harga * product.stok,
    0,
  );

  const stats: DashboardStat[] = [
    {
      key: 'produk',
      label: 'Produk aktif',
      value: products.length,
      format: 'number',
      hint: 'Siap dipesan',
    },
    {
      key: 'penjual',
      label: 'Penjual',
      value: sellers,
      format: 'number',
      hint: 'Warga & industri',
    },
    {
      key: 'stok',
      label: 'Total stok',
      value: totalStock,
      format: 'number',
      hint: 'Unit tersedia',
    },
    {
      key: 'nilai',
      label: 'Nilai katalog',
      value: inventoryValue,
      format: 'currency',
      hint: 'Harga × stok',
    },
  ];

  if (!profile) return null;

  const isBuyer = profile.role === 'warga';
  const canBuy = isBuyer;
  const sellerPath =
    profile.role === 'industri'
      ? '/industri/produk'
      : profile.role === 'warga'
        ? '/warga/produk'
        : null;

  const isMarketplace = variant === 'marketplace';

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      <PageHeader
        eyebrow={isMarketplace ? 'Marketplace UPCYCLE' : 'Katalog produk'}
        title={
          isMarketplace ? 'Marketplace guna ulang' : 'Belanja produk daur ulang'
        }
        description={
          isMarketplace
            ? 'Temukan barang bekas dan produk upcycle dari warga serta industri terverifikasi. Pesanan, pembayaran, dan pengiriman tercatat dalam satu alur.'
            : 'Pilih barang bekas atau produk upcycle dari warga dan industri, lalu buat pesanan. Stok langsung dikunci untuk Anda.'
        }
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          isBuyer ? (
            <Link
              to="/warga/pesanan"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Pesanan saya
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : sellerPath ? (
            <Link
              to={sellerPath}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Kelola produk
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : undefined
        }
      />

      {isBuyer && <MarketTabs />}

      {createdOrder && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[11px] leading-5 text-brand-900">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Pesanan {createdOrder.nomor} berhasil dibuat. Stok sudah dikunci
            untuk Anda.{' '}
            <Link
              to="/warga/pesanan"
              className="font-bold underline underline-offset-2"
            >
              Bayar sekarang
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setCreatedOrder(null)}
            className="text-[10px] font-semibold underline-offset-2 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {productsQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari produk"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama produk, kategori, atau penjual"
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

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['semua', ...PRODUCT_CONDITIONS] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKondisi(item)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                kondisi === item
                  ? 'bg-ink text-white'
                  : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
              }`}
            >
              {item === 'semua' ? 'Semua kondisi' : PRODUCT_CONDITION_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {productsQuery.isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-[22px] border border-black/[0.04]"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {productsQuery.isError && (
            <EmptyState
              icon={Store}
              title="Katalog produk belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void productsQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!productsQuery.isLoading &&
            !productsQuery.isError &&
            products.length === 0 && (
              <EmptyState
                icon={PackageSearch}
                title="Belum ada produk aktif"
                description={
                  sellerPath
                    ? 'Tambahkan produk pertama Anda agar tampil di marketplace.'
                    : 'Produk dari warga dan industri akan muncul di sini setelah dipublikasikan.'
                }
                action={
                  sellerPath ? (
                    <Link
                      to={sellerPath}
                      className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                    >
                      <Tags className="h-3.5 w-3.5" />
                      Kelola produk
                    </Link>
                  ) : undefined
                }
              />
            )}

          {!productsQuery.isLoading &&
            !productsQuery.isError &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <EmptyState
                icon={PackageSearch}
                title="Tidak ada produk pada filter ini"
                description="Ubah kata kunci atau pilih kategori lain."
              />
            )}

          {filteredProducts.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  canBuy={canBuy}
                  isOwner={product.penjual_id === profile.id}
                  onBuy={setSelectedProduct}
                />
              ))}
            </div>
          )}

          {productsQuery.hasNextPage && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void productsQuery.fetchNextPage()}
                loading={productsQuery.isFetchingNextPage}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Muat lebih banyak
              </Button>
            </div>
          )}
        </div>
      </Card>

      {products.length > 0 && !productsQuery.isLoading && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filteredProducts.length} dari {products.length} produk
          aktif.
          {!canBuy && ' Masuk sebagai warga untuk membuat pesanan.'}
        </p>
      )}

      {selectedProduct && (
        <ProductOrderDialog
          open
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onCreated={(order) => {
            setCreatedOrder(order);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
