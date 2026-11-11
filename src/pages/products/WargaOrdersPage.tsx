import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useCompleteProductOrder,
  useProductOrders,
} from '@/hooks/useProducts';
import { PRODUCT_ORDER_STATUS_LABELS } from '@/lib/status';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { ProductOrderCard } from '@/components/products/ProductOrderCard';
import { PayProductOrderDialog } from '@/components/products/PayProductOrderDialog';
import { CancelProductOrderDialog } from '@/components/products/CancelProductOrderDialog';
import type {
  DashboardStat,
  ProductOrderRecord,
  ProductOrderStatus,
} from '@/types/database';

type OrderFilter = 'semua' | ProductOrderStatus;

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu_pembayaran', label: 'Perlu dibayar' },
  { key: 'dibayar', label: 'Dibayar' },
  { key: 'dikirim', label: 'Dikirim' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'dibatalkan', label: 'Dibatalkan' },
];

export function WargaOrdersPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<OrderFilter>('semua');
  const [search, setSearch] = useState('');
  const [payOrder, setPayOrder] = useState<ProductOrderRecord | null>(null);
  const [cancelOrder, setCancelOrder] = useState<ProductOrderRecord | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  usePageTitle('Pesanan produk saya');

  const ordersQuery = useProductOrders({
    role: 'warga',
    userId: profile?.id ?? null,
    orgId: null,
  });
  const completeMutation = useCompleteProductOrder();

  const orders = ordersQuery.data ?? [];

  const stats: DashboardStat[] = useMemo(() => {
    const active = orders.filter((order) =>
      ['menunggu_pembayaran', 'dibayar', 'dikirim'].includes(order.status),
    );
    const unpaid = orders.filter(
      (order) => order.status === 'menunggu_pembayaran',
    );
    const completed = orders.filter((order) => order.status === 'selesai');
    const valid = orders.filter((order) => order.status !== 'dibatalkan');

    return [
      {
        key: 'aktif',
        label: 'Pesanan aktif',
        value: active.length,
        format: 'number',
        hint: 'Sedang diproses',
      },
      {
        key: 'bayar',
        label: 'Perlu dibayar',
        value: unpaid.length,
        format: 'number',
        hint: 'Menunggu pembayaran',
      },
      {
        key: 'belanja',
        label: 'Total belanja',
        value: valid.reduce((total, order) => total + order.total, 0),
        format: 'currency',
        hint: 'Tidak termasuk batal',
      },
      {
        key: 'selesai',
        label: 'Selesai',
        value: completed.length,
        format: 'number',
        hint: 'Barang diterima',
      },
    ];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== 'semua' && order.status !== filter) return false;
      if (!keyword) return true;
      const seller =
        order.penjual_org?.nama ?? order.penjual?.nama ?? '';
      const items = (order.product_order_items ?? [])
        .map((item) => item.nama_produk)
        .join(' ');
      return `${order.nomor} ${seller} ${items}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [orders, filter, search]);

  const handleComplete = async (order: ProductOrderRecord) => {
    setNotice(null);
    setPendingId(order.id);
    try {
      await completeMutation.mutateAsync(order.id);
      setNotice({
        tone: 'success',
        text: `Pesanan ${order.nomor} selesai. Terima kasih sudah berbelanja!`,
      });
    } catch (failure) {
      setNotice({
        tone: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Pesanan gagal diselesaikan.',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Pesanan marketplace"
        title="Pesanan saya"
        description="Pantau pembayaran, pengiriman, dan konfirmasi penerimaan produk daur ulang yang Anda beli."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/marketplace"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Jelajahi katalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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
        {ordersQuery.isLoading
          ? [0, 1, 2, 3].map((item) => <StatCardSkeleton key={item} />)
          : stats.map((stat) => <StatCard key={stat.key} stat={stat} />)}
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm">
            <Input
              label="Cari pesanan"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nomor pesanan, penjual, atau produk"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
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
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {ordersQuery.isLoading && (
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

          {ordersQuery.isError && (
            <EmptyState
              icon={ShoppingBag}
              title="Pesanan belum bisa dimuat"
              description="Periksa koneksi Supabase lalu coba lagi."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void ordersQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              }
            />
          )}

          {!ordersQuery.isLoading &&
            !ordersQuery.isError &&
            orders.length === 0 && (
              <EmptyState
                icon={Store}
                title="Belum ada pesanan"
                description="Pesanan produk yang Anda buat akan muncul di sini."
                action={
                  <Link
                    to="/marketplace"
                    className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Buka katalog
                  </Link>
                }
              />
            )}

          {!ordersQuery.isLoading &&
            !ordersQuery.isError &&
            orders.length > 0 &&
            filteredOrders.length === 0 && (
              <EmptyState
                icon={ShoppingBag}
                title="Tidak ada pesanan pada filter ini"
                description="Pilih status lain atau ubah kata kunci pencarian."
              />
            )}

          {filteredOrders.length > 0 && (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => (
                <ProductOrderCard
                  key={order.id}
                  order={order}
                  viewer="warga"
                  pending={pendingId === order.id}
                  onPay={setPayOrder}
                  onCancel={setCancelOrder}
                  onComplete={(item) => void handleComplete(item)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {orders.length > 0 && !ordersQuery.isLoading && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filteredOrders.length} dari {orders.length} pesanan.
          {filter !== 'semua' &&
            ` Filter: ${PRODUCT_ORDER_STATUS_LABELS[filter] ?? filter}.`}
        </p>
      )}

      {payOrder && (
        <PayProductOrderDialog
          open
          onClose={() => setPayOrder(null)}
          order={payOrder}
        />
      )}

      {cancelOrder && (
        <CancelProductOrderDialog
          open
          onClose={() => setCancelOrder(null)}
          order={cancelOrder}
          viewer="warga"
        />
      )}
    </div>
  );
}
