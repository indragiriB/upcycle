import {
  CalendarClock,
  Clock3,
  CreditCard,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderItemsTable } from '@/components/orders/OrderItemsTable';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { PickupList } from '@/components/orders/PickupList';
import { paymentMethodLabel } from '@/lib/deposits';
import { formatCurrency, formatDateTime, toNumber } from '@/lib/utils';
import type {
  PickupRecord,
  StockOrder,
} from '@/types/database';

export function OrderCard({
  order,
  viewer,
  onPay,
  onCancel,
  onSchedulePickup,
  onCompletePickup,
  cancelLoading = false,
  pickupPendingId = null,
}: {
  order: StockOrder;
  viewer: 'bsi' | 'industri';
  onPay?: (order: StockOrder) => void;
  onCancel?: (order: StockOrder) => void;
  onSchedulePickup?: (order: StockOrder) => void;
  onCompletePickup?: (pickup: PickupRecord) => void;
  cancelLoading?: boolean;
  pickupPendingId?: string | null;
}) {
  const counterpart =
    viewer === 'bsi'
      ? order.industri?.nama ?? 'Industri'
      : order.bsi?.nama ?? 'BSI';
  const pickups = order.pickups ?? [];
  const hasActiveIndustriPickup = pickups.some(
    (pickup) =>
      pickup.tipe === 'industri_ke_bsi' &&
      (pickup.status === 'dijadwalkan' ||
        pickup.status === 'dalam_perjalanan'),
  );
  const hasPendingBsuPickup = pickups.some(
    (pickup) =>
      pickup.tipe === 'bsi_ke_bsu' && pickup.status !== 'selesai',
  );

  const canPay = viewer === 'industri' && order.status === 'menunggu_pembayaran';
  const canCancel = order.status === 'menunggu_pembayaran';
  const canScheduleBsuPickup =
    viewer === 'bsi' &&
    (order.status === 'dibayar' ||
      (order.status === 'diproses' && hasPendingBsuPickup));
  const canScheduleIndustriPickup =
    viewer === 'industri' && order.status === 'diproses';

  return (
    <div className="rounded-[22px] border border-black/[0.05] bg-white p-3.5 shadow-[0_1px_2px_rgba(17,21,17,0.02)] sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Store className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-ink sm:text-sm">
              {counterpart}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
              <span className="font-semibold text-ink/70">{order.nomor}</span>
              <span aria-hidden="true">·</span>
              <span>{formatDateTime(order.created_at)}</span>
              {order.dibayar_at && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Dibayar {formatDateTime(order.dibayar_at)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            Total pesanan
          </p>
          <p className="mt-0.5 text-[13px] font-extrabold text-brand-800">
            {formatCurrency(toNumber(order.total))}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f8faf7] px-3.5 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            Metode bayar
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <CreditCard className="h-3 w-3 text-brand-600" />
            {paymentMethodLabel(order.metode_bayar)}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5 sm:col-span-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            Item
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <Truck className="h-3 w-3 text-brand-600" />
            {(order.order_items ?? []).length} jenis sampah
          </p>
        </div>
      </div>

      {order.catatan && (
        <p className="mt-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[10px] leading-4 text-amber-800">
          Catatan industri: {order.catatan}
        </p>
      )}

      <div className="mt-3">
        <OrderItemsTable
          items={order.order_items ?? []}
          subtotal={toNumber(order.subtotal)}
          total={toNumber(order.total)}
        />
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-brand-600" />
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            Jadwal pengambilan
          </p>
        </div>
        <PickupList
          pickups={pickups}
          viewer={viewer}
          onComplete={onCompletePickup}
          pendingId={pickupPendingId}
        />
      </div>

      {order.status === 'selesai' && order.selesai_at && (
        <p className="mt-2 flex items-center gap-1.5 text-[9px] text-muted">
          <Clock3 className="h-3 w-3" />
          Pesanan selesai {formatDateTime(order.selesai_at)}
        </p>
      )}

      {(canPay || canCancel || canScheduleBsuPickup || canScheduleIndustriPickup) && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.04] pt-3">
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              loading={cancelLoading}
              onClick={() => onCancel?.(order)}
            >
              <XCircle className="h-3.5 w-3.5" />
              Batalkan
            </Button>
          )}
          {canPay && (
            <Button size="sm" onClick={() => onPay?.(order)}>
              <CreditCard className="h-3.5 w-3.5" />
              Bayar pesanan
            </Button>
          )}
          {canScheduleBsuPickup && (
            <Button
              size="sm"
              variant={order.status === 'dibayar' ? 'primary' : 'secondary'}
              onClick={() => onSchedulePickup?.(order)}
            >
              <Truck className="h-3.5 w-3.5" />
              {order.status === 'dibayar'
                ? 'Jadwalkan ambil dari BSU'
                : 'Atur ulang jadwal BSU'}
            </Button>
          )}
          {canScheduleIndustriPickup && (
            <Button
              size="sm"
              variant={hasActiveIndustriPickup ? 'secondary' : 'primary'}
              onClick={() => onSchedulePickup?.(order)}
            >
              <Truck className="h-3.5 w-3.5" />
              {hasActiveIndustriPickup
                ? 'Ubah jadwal ambil'
                : 'Jadwalkan ambil di BSI'}
            </Button>
          )}
        </div>
      )}

      {viewer === 'industri' &&
        order.status === 'diproses' &&
        !hasActiveIndustriPickup && (
          <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5 text-[9px] leading-4 text-muted">
            <Truck className="h-3 w-3 shrink-0 text-brand-600" />
            Jadwalkan pengambilan setelah BSI menyelesaikan penjemputan stok
            dari BSU. Sistem menolak jadwal bila stok belum tiba di BSI.
          </p>
        )}

      {viewer === 'bsi' && order.status === 'menunggu_pembayaran' && (
        <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-[#f8faf7] px-3.5 py-2.5 text-[9px] leading-4 text-muted">
          <Badge tone="amber" className="px-1.5 py-0.5 text-[8px]">
            Stok terkunci
          </Badge>
          Stok sudah dialokasikan untuk pesanan ini dan kembali otomatis bila
          industri atau BSI membatalkan.
        </p>
      )}
    </div>
  );
}
