import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCancelStockOrder } from '@/hooks/useOrders';
import { formatCurrency, toNumber } from '@/lib/utils';
import type { StockOrder } from '@/types/database';

export function CancelOrderDialog({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: StockOrder | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useCancelStockOrder();

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, order?.id]);

  const handleCancelOrder = async () => {
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batalkan pesanan?"
      description="Stok yang sudah dialokasikan akan dikembalikan ke lot asal."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Tidak
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={mutation.isPending}
            onClick={() => void handleCancelOrder()}
          >
            <XCircle className="h-3.5 w-3.5" />
            Batalkan pesanan
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-[#f8faf7] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Pesanan
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {order?.nomor ?? '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            Total {formatCurrency(toNumber(order?.total))}
          </p>
        </div>

        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pembatalan hanya dapat dilakukan sebelum pembayaran. Setelah
          dibayar, pesanan harus diselesaikan melalui pengambilan.
        </p>

        {error && (
          <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
