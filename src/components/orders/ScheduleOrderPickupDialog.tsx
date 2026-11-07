import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarClock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useScheduleOrderPickup } from '@/hooks/useOrders';
import {
  localDateTimeToIso,
  toLocalDateTimeInput,
} from '@/lib/utils';
import type { StockOrder } from '@/types/database';

export function ScheduleOrderPickupDialog({
  open,
  onClose,
  order,
  side,
}: {
  open: boolean;
  onClose: () => void;
  order: StockOrder | null;
  side: 'bsi' | 'pengepul';
}) {
  const [jadwal, setJadwal] = useState(toLocalDateTimeInput());
  const [error, setError] = useState<string | null>(null);
  const mutation = useScheduleOrderPickup(side);

  useEffect(() => {
    if (!open) return;
    setJadwal(
      toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    );
    setError(null);
  }, [open, order?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!order) {
      setError('Pesanan belum dipilih.');
      return;
    }

    const iso = localDateTimeToIso(jadwal);
    if (!iso) {
      setError('Jadwal pengambilan wajib diisi dengan benar.');
      return;
    }

    try {
      await mutation.mutateAsync({ orderId: order.id, jadwal: iso });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Jadwal pengambilan gagal disimpan.',
      );
    }
  };

  const fromBsu = side === 'bsi';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        fromBsu
          ? 'Jadwalkan ambil dari BSU'
          : 'Jadwalkan ambil di BSI'
      }
      description={
        fromBsu
          ? 'BSI menjadwalkan pengambilan stok dari setiap BSU asal. Satu jadwal dibuat per BSU.'
          : 'Tentukan waktu pengambilan stok pesanan di lokasi BSI.'
      }
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="order-pickup-form"
            size="sm"
            loading={mutation.isPending}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Simpan jadwal
          </Button>
        </div>
      }
    >
      <form
        id="order-pickup-form"
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
            {fromBsu
              ? `${order?.order_items?.length ?? 0} jenis stok dari BSU asal`
              : 'Pengambilan dilakukan setelah BSI memproses pesanan.'}
          </p>
        </div>

        <Input
          label="Jadwal pengambilan"
          type="datetime-local"
          value={jadwal}
          onChange={(event) => setJadwal(event.target.value)}
          icon={CalendarClock}
          hint={
            fromBsu
              ? 'BSU asal akan menerima notifikasi jadwal ini.'
              : 'BSI akan menerima notifikasi jadwal ini.'
          }
          required
        />

        <p className="flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[10px] leading-5 text-brand-900">
          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {fromBsu
            ? 'Stok yang sudah diambil dari BSU ditandai “diambil BSI”. Setelah itu pengepul dapat menjadwalkan pengambilan di lokasi BSI.'
            : 'Setelah pengambilan selesai, pesanan otomatis ditutup dan setoran asal ditandai “diambil pengepul”.'}
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
