import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarClock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useAddOperationalExpense } from '@/hooks/useCashBook';
import {
  localDateTimeToIso,
  toLocalDateTimeInput,
} from '@/lib/utils';

export function OperationalExpenseDialog({
  open,
  onClose,
  orgId,
  userId,
  orgLabel = 'BSU',
}: {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  userId: string;
  orgLabel?: string;
}) {
  const [jumlah, setJumlah] = useState('');
  const [tanggal, setTanggal] = useState(toLocalDateTimeInput());
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useAddOperationalExpense(orgId, userId);

  useEffect(() => {
    if (!open) return;
    setJumlah('');
    setTanggal(toLocalDateTimeInput());
    setKeterangan('');
    setError(null);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const value = Math.round(Number(jumlah));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Jumlah biaya harus lebih dari 0.');
      return;
    }

    if (!keterangan.trim()) {
      setError('Keterangan biaya wajib diisi.');
      return;
    }

    const iso = localDateTimeToIso(tanggal);
    if (!iso) {
      setError('Tanggal biaya wajib diisi dengan benar.');
      return;
    }

    try {
      await mutation.mutateAsync({
        jumlah: value,
        tanggal: iso,
        keterangan: keterangan.trim(),
      });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Biaya operasional gagal dicatat.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat biaya operasional"
      description={`Biaya operasional dicatat sebagai kas keluar ${orgLabel} dan tidak dapat diubah setelah disimpan.`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="operational-expense-form"
            size="sm"
            loading={mutation.isPending}
          >
            <Wallet className="h-3.5 w-3.5" />
            Simpan biaya
          </Button>
        </div>
      }
    >
      <form
        id="operational-expense-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          step="100"
          inputMode="numeric"
          value={jumlah}
          onChange={(event) => setJumlah(event.target.value)}
          placeholder="Contoh: 75000"
          icon={Wallet}
          required
        />

        <Input
          label="Tanggal"
          type="datetime-local"
          value={tanggal}
          onChange={(event) => setTanggal(event.target.value)}
          icon={CalendarClock}
          required
        />

        <Textarea
          label="Keterangan"
          value={keterangan}
          onChange={(event) => setKeterangan(event.target.value)}
          placeholder="Contoh: Bensin kendaraan penjemputan"
          maxLength={240}
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
