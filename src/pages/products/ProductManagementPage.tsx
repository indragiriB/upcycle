import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Package,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Tags,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useProductOrders,
  useSellerProducts,
  useShipProductOrder,
  useUpdateProduct,
} from '@/hooks/useProducts';
import {
  formatCurrency,
  formatDateTime,
} from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { ProductOrderCard } from '@/components/products/ProductOrderCard';
import { CancelProductOrderDialog } from '@/components/products/CancelProductOrderDialog';
import { PRODUCT_CONDITION_LABELS } from '@/lib/products';
import type {
  DashboardStat,
  ProductOrderRecord,
  ProductOrderStatus,
  ProductRecord,
} from '@/types/database';

type TabKey = 'produk' | 'pesanan';
type OrderFilter = 'semua' | ProductOrderStatus;

const ORDER_FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu_pembayaran', label: 'Belum dibayar' },
  { key: 'dibayar', label: 'Perlu dikirim' },
  { key: 'dikirim', label: 'Dikirim' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'dibatalkan', label: 'Dibatalkan' },
];

export function ProductManagementPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: TabKey =
    searchParams.get('tab') === 'pesanan' ? 'pesanan' : 'produk';

  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('semua');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(
    null,
  );
  const [cancelOrder, setCancelOrder] = useState<ProductOrderRecord | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  usePageTitle('Produk & pesanan marketplace');

  if (!profile) return null;

  return (
    <ProductManagementContent
      profile={profile}
      tab={tab}
      setTab={(nextTab) => {
        setSearchParams(nextTab === 'produk' ? {} : { tab: nextTab });
        setNotice(null);
      }}
      search={search}
      setSearch={setSearch}
      orderFilter={orderFilter}
      setOrderFilter={setOrderFilter}
      formOpen={formOpen}
      setFormOpen={setFormOpen}
      editingProduct={editingProduct}
      setEditingProduct={setEditingProduct}
      cancelOrder={cancelOrder}
      setCancelOrder={setCancelOrder}
      pendingId={pendingId}
      setPendingId={setPendingId}
      pendingProductId={pendingProductId}
      setPendingProductId={setPendingProductId}
      notice={notice}
      setNotice={setNotice}
    />
  );
}

function ProductManagementContent({
  profile,
  tab,
  setTab,
  search,
  setSearch,
  orderFilter,
  setOrderFilter,
  formOpen,
  setFormOpen,
  editingProduct,
  setEditingProduct,
  cancelOrder,
  setCancelOrder,
  pendingId,
  setPendingId,
  pendingProductId,
  setPendingProductId,
  notice,
  setNotice,
}: {
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>;
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  search: string;
  setSearch: (value: string) => void;
  orderFilter: OrderFilter;
  setOrderFilter: (filter: OrderFilter) => void;
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
  editingProduct: ProductRecord | null;
  setEditingProduct: (product: ProductRecord | null) => void;
  cancelOrder: ProductOrderRecord | null;
  setCancelOrder: (order: ProductOrderRecord | null) => void;
  pendingId: string | null;
  setPendingId: (id: string | null) => void;
  pendingProductId: string | null;
  setPendingProductId: (id: string | null) => void;
  notice: { tone: 'success' | 'error'; text: string } | null;
  setNotice: (
    notice: { tone: 'success' | 'error'; text: string } | null,
  ) => void;
}) {
  const orgId = profile.role === 'industri' ? profile.org_id : null;
  const productsQuery = useSellerProducts({
    userId: profile.id,
    orgId,
    role: profile.role,
  });
  const ordersQuery = useProductOrders({
    role: 'penjual',
    userId: profile.id,
    orgId,
  });
  const updateMutation = useUpdateProduct();
  const shipMutation = useShipProductOrder();

  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice, setNotice]);

  const incomingOrders = orders.filter(
    (order) =>
      order.status === 'menunggu_pembayaran' || order.status === 'dibayar',
  );
  const paidOrders = orders.filter((order) => order.status === 'dibayar');
  const completedOrders = orders.filter((order) => order.status === 'selesai');
  const validOrders = orders.filter((order) => order.status !== 'dibatalkan');
  const revenue = validOrders
    .filter((order) => order.status !== 'menunggu_pembayaran')
    .reduce((total, order) => total + order.total, 0);

  const totalStock = products.reduce(
    (total, product) => total + product.stok,
    0,
  );
  const inventoryValue = products.reduce(
    (total, product) => total + product.harga * product.stok,
    0,
  );
  const activeProducts = products.filter((product) => product.status === 'aktif');

  const stats: DashboardStat[] = [
    {
      key: 'produk',
      label: 'Produk aktif',
      value: activeProducts.length,
      format: 'number',
      hint: `${products.length} produk tersimpan`,
    },
    {
      key: 'stok',
      label: 'Total stok',
      value: totalStock,
      format: 'number',
      hint: 'Unit siap dijual',
    },
    {
      key: 'pesanan',
      label: 'Pesanan masuk',
      value: incomingOrders.length,
      format: 'number',
      hint: 'Belum dibayar / perlu dikirim',
      badge: incomingOrders.length > 0 ? 'Perlu aksi' : undefined,
    },
    {
      key: 'pendapatan',
      label: 'Nilai penjualan',
      value: revenue,
      format: 'currency',
      hint: 'Tidak termasuk batal',
    },
  ];

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      `${product.nama} ${product.kategori ?? ''} ${product.deskripsi ?? ''}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [products, search]);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (orderFilter !== 'semua' && order.status !== orderFilter) return false;
      if (!keyword) return true;
      const buyer = order.pembeli?.nama ?? '';
      const items = (order.product_order_items ?? [])
        .map((item) => item.nama_produk)
        .join(' ');
      return `${order.nomor} ${buyer} ${items}`.toLowerCase().includes(keyword);
    });
  }, [orders, orderFilter, search]);

  const handleToggleStatus = async (product: ProductRecord) => {
    setNotice(null);
    setPendingProductId(product.id);
    try {
      const nextStatus = product.status === 'aktif' ? 'nonaktif' : 'aktif';
      await updateMutation.mutateAsync({
        id: product.id,
        nama: product.nama,
        deskripsi: product.deskripsi ?? '',
        kategori: product.kategori ?? '',
        kondisi: product.kondisi,
        harga: product.harga,
        stok: product.stok,
        satuan: product.satuan,
        fotoUrls: product.foto_urls,
        status: nextStatus,
      });
      setNotice({
        tone: 'success',
        text:
          nextStatus === 'aktif'
            ? `${product.nama} kembali tampil di marketplace.`
            : `${product.nama} disembunyikan dari marketplace.`,
      });
    } catch (failure) {
      setNotice({
        tone: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Status produk gagal diubah.',
      });
    } finally {
      setPendingProductId(null);
    }
  };

  const handleShip = async (order: ProductOrderRecord) => {
    setNotice(null);
    setPendingId(order.id);
    try {
      await shipMutation.mutateAsync(order.id);
      setNotice({
        tone: 'success',
        text: `Pesanan ${order.nomor} ditandai dikirim. Warga akan menerima notifikasi.`,
      });
    } catch (failure) {
      setNotice({
        tone: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Pesanan gagal ditandai dikirim.',
      });
    } finally {
      setPendingId(null);
    }
  };

  const isOrderTab = tab === 'pesanan';
  const isLoading = isOrderTab
    ? ordersQuery.isLoading
    : productsQuery.isLoading;
  const isError = isOrderTab ? ordersQuery.isError : productsQuery.isError;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Toko marketplace"
        title={profile.role === 'industri' ? 'Produk industri' : 'Produk saya'}
        description="Kelola barang bekas dan produk upcycle yang Anda jual serta proses pesanan masuk dari warga."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <>
            <Link
              to="/marketplace"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <Store className="h-3.5 w-3.5" />
              Lihat katalog
            </Link>
            <Button
              size="sm"
              onClick={() => {
                setEditingProduct(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah produk
            </Button>
          </>
        }
      />

      {notice && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[11px] leading-5 ${
            notice.tone === 'success'
              ? 'border-brand-100 bg-brand-50 text-brand-900'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {notice.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {productsQuery.isLoading || ordersQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTab('produk')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold transition-colors ${
            !isOrderTab
              ? 'bg-brand-600 text-white'
              : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
          }`}
        >
          <Tags className="h-3.5 w-3.5" />
          Produk ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('pesanan')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold transition-colors ${
            isOrderTab
              ? 'bg-brand-600 text-white'
              : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Pesanan masuk ({incomingOrders.length})
        </button>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label={isOrderTab ? 'Cari pesanan' : 'Cari produk'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isOrderTab
                  ? 'Nomor pesanan, warga, atau produk'
                  : 'Nama produk atau kategori'
              }
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {isOrderTab ? (
              ORDER_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setOrderFilter(item.key)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                    orderFilter === item.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-[#f2f5f1] text-muted hover:bg-[#e9eee6] hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              ))
            ) : (
              <p className="text-[10px] leading-5 text-muted">
                {paidOrders.length > 0
                  ? `${paidOrders.length} pesanan sudah dibayar menunggu dikirim.`
                  : `${completedOrders.length} pesanan selesai.`}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/[0.04] p-4"
                >
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="mt-2 h-2.5 w-60" />
                  <Skeleton className="mt-4 h-16 w-full" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <EmptyState
              icon={isOrderTab ? ShoppingBag : Package}
              title={
                isOrderTab
                  ? 'Pesanan belum bisa dimuat'
                  : 'Produk belum bisa dimuat'
              }
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void (isOrderTab
                      ? ordersQuery.refetch()
                      : productsQuery.refetch())
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!isLoading && !isError && isOrderTab && orders.length === 0 && (
            <EmptyState
              icon={ShoppingBag}
              title="Belum ada pesanan masuk"
              description="Pesanan warga akan muncul di sini setelah produk Anda dipesan."
              action={
                <Link
                  to="/marketplace"
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  <Store className="h-3.5 w-3.5" />
                  Lihat marketplace
                </Link>
              }
            />
          )}

          {!isLoading &&
            !isError &&
            isOrderTab &&
            orders.length > 0 &&
            filteredOrders.length === 0 && (
              <EmptyState
                icon={PackageSearch}
                title="Tidak ada pesanan pada filter ini"
                description="Pilih status lain atau ubah kata kunci pencarian."
              />
            )}

          {!isLoading && !isError && isOrderTab && filteredOrders.length > 0 && (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => (
                <ProductOrderCard
                  key={order.id}
                  order={order}
                  viewer="penjual"
                  pending={pendingId === order.id}
                  onCancel={setCancelOrder}
                  onShip={(item) => void handleShip(item)}
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && !isOrderTab && products.length === 0 && (
            <EmptyState
              icon={Package}
              title="Belum ada produk"
              description="Publikasikan barang bekas atau produk upcycle pertama Anda agar tampil di marketplace."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingProduct(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah produk
                </Button>
              }
            />
          )}

          {!isLoading &&
            !isError &&
            !isOrderTab &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <EmptyState
                icon={PackageSearch}
                title="Produk tidak ditemukan"
                description="Ubah kata kunci pencarian."
              />
            )}

          {!isLoading &&
            !isError &&
            !isOrderTab &&
            filteredProducts.length > 0 && (
              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const isToggling = pendingProductId === product.id;
                  return (
                    <article
                      key={product.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-black/[0.05] bg-white p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef3ec]">
                          {product.foto_urls[0] ? (
                            <img
                              src={product.foto_urls[0]}
                              alt={product.nama}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[13px] font-bold text-ink">
                              {product.nama}
                            </p>
                            <Badge
                              tone={
                                product.status === 'aktif' ? 'green' : 'neutral'
                              }
                              className="px-2 py-0.5 text-[9px]"
                            >
                              {product.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {product.kategori || 'Lainnya'} ·{' '}
                            {PRODUCT_CONDITION_LABELS[product.kondisi]} · stok{' '}
                            {product.stok} {product.satuan} ·{' '}
                            {formatDateTime(product.created_at)}
                          </p>
                          <p className="mt-0.5 text-[12px] font-extrabold text-brand-800">
                            {formatCurrency(product.harga)}
                            <span className="text-[9px] font-medium text-muted">
                              /{product.satuan}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isToggling}
                          onClick={() => void handleToggleStatus(product)}
                        >
                          {product.status === 'aktif'
                            ? 'Sembunyikan'
                            : 'Tampilkan'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product);
                            setFormOpen(true);
                          }}
                        >
                          Ubah
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </div>
      </Card>

      {!isLoading && !isError && (
        <p className="px-1 text-[10px] text-muted">
          {isOrderTab
            ? `Menampilkan ${filteredOrders.length} dari ${orders.length} pesanan.`
            : `Menampilkan ${filteredProducts.length} dari ${products.length} produk · stok ${totalStock} unit · nilai ${formatCurrency(inventoryValue)}.`}
        </p>
      )}

      <ProductFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        profile={profile}
      />

      {cancelOrder && (
        <CancelProductOrderDialog
          open
          onClose={() => setCancelOrder(null)}
          order={cancelOrder}
          viewer="penjual"
        />
      )}
    </div>
  );
}
