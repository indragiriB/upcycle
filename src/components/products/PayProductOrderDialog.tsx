import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Banknote, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { usePayProductOrder } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethod, ProductOrderRecord } from '@/types/database';

export function PayProductOrderDialog({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: ProductOrderRecord | null;
}) {
  const [metode, setMetode] = useState<PaymentMethod>('transfer');
  const [error, setError] = useState<string | null>(null);
  const mutation = usePayProductOrder();

  useEffect(() => {
    if (!open) return;
    setMetode('transfer');
    setError(null);
  }, [open, order?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!order) return;

    try {
      await mutation.mutateAsync({ orderId: order.id, metodeBayar: metode });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Pembayaran gagal dicatat.',
      );
    }
  };

  if (!order) return null;

  const sellerName =
    order.penjual_org?.nama ?? order.penjual?.nama ?? 'Penjual';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bayar pesanan produk"
      description="Pembayaran dicatat sebagai transaksi langsung ke penjual. Penjual akan menerima notifikasi."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-[#f8faf7] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {order.nomor}
          </p>
          <p className="mt-1 text-sm font-bold text-ink">{sellerName}</p>
          <p className="mt-2 text-xl font-extrabold text-brand-900">
            {formatCurrency(order.total)}
          </p>
        </div>

        <Select
          label="Metode pembayaran"
          value={metode}
          onChange={(event) =>
            setMetode(event.target.value as PaymentMethod)
          }
        >
          <option value="transfer">Transfer bank</option>
          <option value="tunai">Tunai</option>
        </Select>

        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-[10px] leading-4 text-amber-800">
          <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pembayaran dilakukan langsung antara pembeli dan penjual. UPCYCLE
          mencatat status dan, untuk penjual organisasi, kas masuk otomatis.
        </div>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Batal
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {metode === 'tunai' ? (
              <Banknote className="h-3.5 w-3.5" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Konfirmasi pembayaran
          </Button>
        </div>
      </form>
    </Modal>
  );
}
