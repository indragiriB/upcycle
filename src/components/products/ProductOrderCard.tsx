import {
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageCircle,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  PRODUCT_ORDER_STATUS_LABELS,
  PRODUCT_ORDER_STATUS_TONES,
  statusLabel,
  statusTone,
} from '@/lib/status';
import { paymentMethodLabel } from '@/lib/deposits';
import {
  formatCurrency,
  formatDateTime,
  whatsappUrl,
} from '@/lib/utils';
import type { ProductOrderRecord } from '@/types/database';

export function ProductOrderCard({
  order,
  viewer,
  onPay,
  onCancel,
  onShip,
  onComplete,
  pending = false,
}: {
  order: ProductOrderRecord;
  viewer: 'pembeli' | 'penjual';
  onPay?: (order: ProductOrderRecord) => void;
  onCancel?: (order: ProductOrderRecord) => void;
  onShip?: (order: ProductOrderRecord) => void;
  onComplete?: (order: ProductOrderRecord) => void;
  pending?: boolean;
}) {
  const items = order.product_order_items ?? [];
  const isBuyer = viewer === 'pembeli';
  const counterpart = isBuyer
    ? order.penjual_org?.nama ?? order.penjual?.nama ?? 'Penjual'
    : order.pembeli?.nama ?? 'Pembeli';

  const canPay = isBuyer && order.status === 'menunggu_pembayaran';
  const canCancelBuyer =
    isBuyer && order.status === 'menunggu_pembayaran';
  const canComplete = isBuyer && order.status === 'dikirim';
  const canShip = !isBuyer && order.status === 'dibayar';
  const canCancelSeller =
    !isBuyer &&
    (order.status === 'menunggu_pembayaran' || order.status === 'dibayar');

  const buyerWhatsApp = whatsappUrl(
    order.nomor_wa,
    `Halo, saya dari ${order.penjual_org?.nama ?? order.penjual?.nama ?? 'penjual'} terkait pesanan ${order.nomor}.`,
  );
  const sellerWhatsApp = order.penjual_org?.telepon
    ? whatsappUrl(
        order.penjual_org.telepon,
        `Halo, saya pembeli terkait pesanan ${order.nomor}.`,
      )
    : null;

  return (
    <article className="rounded-[22px] border border-black/[0.05] bg-white p-3.5 shadow-[0_1px_2px_rgba(17,21,17,0.02)] sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink sm:text-sm">
            {order.nomor}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            {isBuyer ? 'Penjual' : 'Pembeli'}: {counterpart} ·{' '}
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <Badge
          tone={statusTone(order.status, PRODUCT_ORDER_STATUS_TONES)}
          className="px-2.5 py-1 text-[10px]"
        >
          {statusLabel(order.status, PRODUCT_ORDER_STATUS_LABELS)}
        </Badge>
      </div>

      <div className="mt-3 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 rounded-2xl bg-[#f8faf7] px-3 py-2"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
              {item.products?.foto_urls?.[0] ? (
                <img
                  src={item.products.foto_urls[0]}
                  alt={item.nama_produk}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-4 w-4 text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-ink">
                {item.nama_produk}
              </p>
              <p className="mt-0.5 text-[9px] text-muted">
                {item.jumlah} × {formatCurrency(item.harga_satuan)}
              </p>
            </div>
            <p className="text-[11px] font-extrabold text-ink">
              {formatCurrency(item.subtotal)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 rounded-2xl border border-black/[0.04] px-3.5 py-3 text-[10px] leading-4 text-muted sm:grid-cols-2">
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <span className="font-semibold text-ink">Kirim ke:</span>{' '}
            {order.alamat}
          </span>
        </p>
        <div className="space-y-1">
          <p className="flex items-center gap-1.5">
            <MessageCircle className="h-3 w-3" />
            <span className="font-semibold text-ink">WhatsApp:</span>{' '}
            {order.nomor_wa}
          </p>
          {!isBuyer && buyerWhatsApp && (
            <a
              href={buyerWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex font-semibold text-brand-700 hover:text-brand-800"
            >
              Hubungi pembeli
            </a>
          )}
          {isBuyer && sellerWhatsApp && (
            <a
              href={sellerWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex font-semibold text-brand-700 hover:text-brand-800"
            >
              Hubungi penjual
            </a>
          )}
        </div>
        {order.catatan && (
          <p className="sm:col-span-2">
            <span className="font-semibold text-ink">Catatan:</span>{' '}
            {order.catatan}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.04] pt-3">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-muted">
            Total
          </p>
          <p className="text-sm font-extrabold text-brand-900">
            {formatCurrency(order.total)}
          </p>
          {order.metode_bayar && (
            <p className="mt-0.5 text-[9px] text-muted">
              {paymentMethodLabel(order.metode_bayar)}
              {order.dibayar_at
                ? ` · ${formatDateTime(order.dibayar_at)}`
                : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {canCancelBuyer && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onCancel?.(order)}
            >
              <XCircle className="h-3.5 w-3.5" />
              Batalkan
            </Button>
          )}
          {canPay && (
            <Button size="sm" onClick={() => onPay?.(order)}>
              <CreditCard className="h-3.5 w-3.5" />
              Bayar
            </Button>
          )}
          {canComplete && (
            <Button
              size="sm"
              loading={pending}
              onClick={() => onComplete?.(order)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pesanan diterima
            </Button>
          )}
          {canCancelSeller && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onCancel?.(order)}
            >
              <XCircle className="h-3.5 w-3.5" />
              Batalkan
            </Button>
          )}
          {canShip && (
            <Button
              size="sm"
              loading={pending}
              onClick={() => onShip?.(order)}
            >
              <Truck className="h-3.5 w-3.5" />
              Kirim pesanan
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
