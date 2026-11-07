import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarClock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCreateWastePrice } from '@/hooks/usePrices';
import {
  formatCurrency,
  localDateTimeToIso,
  toLocalDateTimeInput,
  toNumber,
} from '@/lib/utils';
import type { PriceKind, WasteType } from '@/types/database';

export function PriceDialog({
  open,
  onClose,
  wasteType,
  currentPrice,
  orgId,
  userId,
  kind = 'beli',
}: {
  open: boolean;
  onClose: () => void;
  wasteType: WasteType | null;
  currentPrice: number | null;
  orgId: string | null;
  userId: string;
  kind?: PriceKind;
}) {
  const [harga, setHarga] = useState('');
  const [berlakuMulai, setBerlakuMulai] = useState(toLocalDateTimeInput());
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateWastePrice(orgId, userId, kind);
  const label = kind === 'jual' ? 'jual' : 'beli';

  useEffect(() => {
    if (!open) return;
    setHarga(currentPrice ? String(currentPrice) : '');
    setBerlakuMulai(toLocalDateTimeInput());
    setError(null);
  }, [open, currentPrice, wasteType?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!wasteType) {
      setError('Jenis sampah belum dipilih.');
      return;
    }

    const value = Math.round(Number(harga));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Harga per kg harus lebih dari 0.');
      return;
    }

    const effectiveIso = localDateTimeToIso(berlakuMulai);
    if (!effectiveIso) {
      setError('Tanggal berlaku wajib diisi dengan benar.');
      return;
    }

    try {
      await mutation.mutateAsync({
        wasteTypeId: wasteType.id,
        hargaPerKg: value,
        berlakuMulai: effectiveIso,
      });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Harga gagal disimpan.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        currentPrice
          ? `Ubah harga ${label}`
          : `Tetapkan harga ${label}`
      }
      description="Harga lama tidak diubah. Sistem menyimpan baris harga baru agar riwayat tetap utuh."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="price-form"
            size="sm"
            loading={mutation.isPending}
          >
            <Tag className="h-3.5 w-3.5" />
            Simpan harga
          </Button>
        </div>
      }
    >
      <form
        id="price-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        noValidate
      >
        <div className="rounded-2xl bg-[#f8faf7] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Jenis sampah
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: wasteType?.warna ?? '#22C55E' }}
            />
            <p className="text-sm font-bold text-ink">
              {wasteType?.nama ?? '—'}
            </p>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Harga aktif saat ini:{' '}
            {currentPrice ? `${formatCurrency(toNumber(currentPrice))}/kg` : 'belum diatur'}
          </p>
        </div>

        <Input
          label={`Harga ${label} per kg`}
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={harga}
          onChange={(event) => setHarga(event.target.value)}
          placeholder="Contoh: 4000"
          icon={Tag}
          required
        />

        <Input
          label="Berlaku mulai"
          type="datetime-local"
          value={berlakuMulai}
          onChange={(event) => setBerlakuMulai(event.target.value)}
          icon={CalendarClock}
          hint={
            kind === 'jual'
              ? 'Harga baru dipakai saat pengepul membuat pesanan setelah waktu ini.'
              : 'Harga baru dipakai pada penimbangan setelah waktu ini.'
          }
          required
        />

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
