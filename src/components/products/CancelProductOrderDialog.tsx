import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCancelProductOrder } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import type { ProductOrderRecord } from '@/types/database';

export function CancelProductOrderDialog({
  open,
  onClose,
  order,
  viewer,
}: {
  open: boolean;
  onClose: () => void;
  order: ProductOrderRecord | null;
  viewer: 'warga' | 'penjual';
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useCancelProductOrder();

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, order?.id]);

  const handleCancel = async () => {
    setError(null);
    if (!order) return;

    try {
      await mutation.mutateAsync(order.id);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Pesanan gagal dibatalkan.',
      );
    }
  };

  if (!order) return null;

  const paid = order.status === 'dibayar';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batalkan pesanan produk"
      description="Stok yang sudah dikunci akan dikembalikan ke katalog."
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-[#f8faf7] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {order.nomor}
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {order.product_order_items?.[0]?.nama_produk ?? 'Pesanan produk'}
            {order.product_order_items && order.product_order_items.length > 1
              ? ` +${order.product_order_items.length - 1} lainnya`
              : ''}
          </p>
          <p className="mt-2 text-lg font-extrabold text-ink">
            {formatCurrency(order.total)}
          </p>
        </div>

        <p className="text-[11px] leading-5 text-muted">
          {viewer === 'warga'
            ? 'Pesanan yang belum dibayar dapat dibatalkan kapan saja. Setelah dibayar, pembatalan hanya dapat dilakukan penjual.'
            : paid
              ? 'Pesanan sudah dibayar. Pembatalan akan mencatat kas keluar koreksi pada buku kas organisasi Anda dan stok dikembalikan.'
              : 'Pesanan yang belum dibayar akan dibatalkan dan stok dikembalikan.'}
        </p>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Kembali
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={mutation.isPending}
            onClick={() => void handleCancel()}
          >
            <XCircle className="h-3.5 w-3.5" />
            Batalkan pesanan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
