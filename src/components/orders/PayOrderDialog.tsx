import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Banknote, CalendarClock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { usePayStockOrder } from '@/hooks/useOrders';
import {
  formatCurrency,
  formatDateTime,
  toNumber,
} from '@/lib/utils';
import type { PaymentMethod, StockOrder } from '@/types/database';

export function PayOrderDialog({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: StockOrder | null;
}) {
  const [metode, setMetode] = useState<PaymentMethod>('transfer');
  const [error, setError] = useState<string | null>(null);
  const mutation = usePayStockOrder();

  useEffect(() => {
    if (!open) return;
    setMetode('transfer');
    setError(null);
  }, [open, order?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!order) {
      setError('Pesanan belum dipilih.');
      return;
    }

    try {
      await mutation.mutateAsync({
        orderId: order.id,
        metodeBayar: metode,
      });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Pembayaran pesanan gagal disimpan.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bayar pesanan stok"
      description="Pembayaran dicatat manual. Kas BSI dan industri diperbarui otomatis setelah pembayaran."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="pay-order-form"
            size="sm"
            loading={mutation.isPending}
          >
            <Wallet className="h-3.5 w-3.5" />
            Bayar sekarang
          </Button>
        </div>
      }
    >
      <form
        id="pay-order-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        noValidate
      >
        <div className="rounded-2xl bg-[#f8faf7] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Pesanan
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {order?.nomor ?? '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            {order?.created_at
              ? formatDateTime(order.created_at)
              : '—'}
            {order?.bsi?.nama ? ` · ${order.bsi.nama}` : ''}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-black/[0.05] pt-3">
            <span className="text-[10px] text-muted">Total pembayaran</span>
            <span className="text-lg font-extrabold tracking-tight text-brand-800">
              {formatCurrency(toNumber(order?.total))}
            </span>
          </div>
        </div>

        <Select
          label="Metode pembayaran"
          value={metode}
          onChange={(event) =>
            setMetode(event.target.value as PaymentMethod)
          }
          icon={Banknote}
          hint="Tunai atau transfer bank, sesuai kesepakatan dengan BSI."
        >
          <option value="transfer">Transfer bank</option>
          <option value="tunai">Tunai</option>
        </Select>

        {order?.catatan && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-800">
            Catatan pesanan: {order.catatan}
          </p>
        )}

        <p className="flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[10px] leading-5 text-brand-900">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Setelah dibayar, pesanan tidak dapat dibatalkan. BSI akan menyiapkan
          stok dan mengatur pengambilan dari BSU.
        </p>

        {error && (
          <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
