import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useStockOrders,
  useUpdatePickupStatus,
} from '@/hooks/useOrders';
import { formatCurrency, toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { PayOrderDialog } from '@/components/orders/PayOrderDialog';
import { CancelOrderDialog } from '@/components/orders/CancelOrderDialog';
import { ScheduleOrderPickupDialog } from '@/components/orders/ScheduleOrderPickupDialog';
import type {
  DashboardStat,
  StockOrder,
} from '@/types/database';

type OrderFilter =
  | 'aktif'
  | 'menunggu_pembayaran'
  | 'diproses'
  | 'selesai'
  | 'semua';

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'aktif', label: 'Aktif' },
  { key: 'menunggu_pembayaran', label: 'Belum dibayar' },
  { key: 'diproses', label: 'Siap diambil' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'semua', label: 'Semua' },
];

const ACTIVE_STATUSES = ['menunggu_pembayaran', 'dibayar', 'diproses'];

function matchesFilter(order: StockOrder, filter: OrderFilter) {
  if (filter === 'semua') return true;
  if (filter === 'aktif') return ACTIVE_STATUSES.includes(order.status);
  return order.status === filter;
}

export function PengepulOrdersPage() {
  const { profile } = useAuth();
  const orgId = profile?.org_id ?? null;
  const [filter, setFilter] = useState<OrderFilter>('aktif');
  const [search, setSearch] = useState('');
  const [payOrder, setPayOrder] = useState<StockOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<StockOrder | null>(null);
  const [scheduleOrder, setScheduleOrder] = useState<StockOrder | null>(null);
  const [pickupPendingId, setPickupPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  usePageTitle('Pesanan saya');

  const ordersQuery = useStockOrders(orgId, 'pengepul');
  const pickupMutation = useUpdatePickupStatus();
  const orders = ordersQuery.data ?? [];

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, filter)) return false;
      if (!keyword) return true;
      const items = (order.order_items ?? [])
        .map((item) => item.waste_types?.nama ?? '')
        .join(' ');
      return `${order.nomor} ${order.bsi?.nama ?? ''} ${items}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [orders, filter, search]);

  const unpaid = orders.filter(
    (order) => order.status === 'menunggu_pembayaran',
  );
  const inProgress = orders.filter((order) => order.status === 'diproses');
  const completed = orders.filter((order) => order.status === 'selesai');
  const validOrders = orders.filter((order) => order.status !== 'dibatalkan');
  const totalSpend = validOrders.reduce(
    (total, order) => total + toNumber(order.total),
    0,
  );

  const stats: DashboardStat[] = [
    {
      key: 'belum_bayar',
      label: 'Belum dibayar',
      value: unpaid.length,
      format: 'number',
      hint: 'Stok sudah dikunci',
      badge: unpaid.length > 0 ? 'Perlu aksi' : undefined,
    },
    {
      key: 'diambil',
      label: 'Siap diambil',
      value: inProgress.length,
      format: 'number',
      hint: 'Jadwalkan setelah tiba di BSI',
    },
    {
      key: 'selesai',
      label: 'Pesanan selesai',
      value: completed.length,
      format: 'number',
      hint: 'Stok sudah diterima',
    },
    {
      key: 'belanja',
      label: 'Total pembelian',
      value: totalSpend,
      format: 'currency',
      hint: 'Tidak termasuk yang batal',
    },
  ];

  const handleCompletePickup = async (pickupId: string) => {
    setMessage(null);
    setPickupPendingId(pickupId);
    try {
      await pickupMutation.mutateAsync({
        pickupId,
        status: 'selesai',
      });
      setMessage({
        type: 'success',
        text: 'Pengambilan stok selesai. Pesanan sudah ditutup.',
      });
    } catch (failure) {
      setMessage({
        type: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Status pengambilan gagal diperbarui.',
      });
    } finally {
      setPickupPendingId(null);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-4">
      <PageHeader
        eyebrow="Pesanan pengepul"
        title="Pembelian stok saya"
        description="Bayar pesanan, atur jadwal pengambilan di BSI, dan pantau status serah terima stok."
        backTo="/dashboard"
        backLabel="Kembali ke dashboard"
        actions={
          <Link
            to="/pengepul/stok"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <Warehouse className="h-3.5 w-3.5" />
            Belanja stok
          </Link>
        }
      />

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
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
              placeholder="Nomor pesanan, BSI, atau jenis sampah"
              icon={Search}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => {
              const count = orders.filter((order) =>
                matchesFilter(order, item.key),
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
          {ordersQuery.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
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

          {ordersQuery.isError && (
            <EmptyState
              icon={ClipboardList}
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
                icon={ClipboardList}
                title="Belum ada pesanan"
                description="Pilih stok dari BSI lalu buat pesanan pertamamu."
                action={
                  <Link
                    to="/pengepul/stok"
                    className={buttonStyles({ variant: 'soft', size: 'sm' })}
                  >
                    Jelajahi stok
                  </Link>
                }
              />
            )}

          {!ordersQuery.isLoading &&
            !ordersQuery.isError &&
            orders.length > 0 &&
            filtered.length === 0 && (
              <EmptyState
                icon={Search}
                title="Tidak ada pesanan pada filter ini"
                description="Pilih filter lain atau ubah kata kunci pencarian."
              />
            )}

          {filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  viewer="pengepul"
                  onPay={setPayOrder}
                  onCancel={setCancelOrder}
                  onSchedulePickup={setScheduleOrder}
                  onCompletePickup={(pickup) =>
                    void handleCompletePickup(pickup.id)
                  }
                  pickupPendingId={pickupPendingId}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {orders.length > 0 && (
        <p className="px-1 text-[10px] text-muted">
          Menampilkan {filtered.length} dari {orders.length} pesanan · total
          pembelian sah {formatCurrency(totalSpend)}.
        </p>
      )}

      <PayOrderDialog
        open={Boolean(payOrder)}
        onClose={() => setPayOrder(null)}
        order={payOrder}
      />
      <CancelOrderDialog
        open={Boolean(cancelOrder)}
        onClose={() => setCancelOrder(null)}
        order={cancelOrder}
      />
      <ScheduleOrderPickupDialog
        open={Boolean(scheduleOrder)}
        onClose={() => setScheduleOrder(null)}
        order={scheduleOrder}
        side="pengepul"
      />
    </div>
  );
}
