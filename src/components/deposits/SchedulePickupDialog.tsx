import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarClock,
  MapPin,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useSchedulePickup } from '@/hooks/useDeposits';
import {
  formatWeight,
  localDateTimeToIso,
  toLocalDateTimeInput,
  toNumber,
} from '@/lib/utils';
import type { DepositRecord } from '@/types/database';

function defaultPickupTime(existing: string | null) {
  if (existing) return toLocalDateTimeInput(existing);
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toLocalDateTimeInput(date);
}

export function SchedulePickupDialog({
  open,
  onClose,
  deposit,
}: {
  open: boolean;
  onClose: () => void;
  deposit: DepositRecord;
}) {
  const [jadwal, setJadwal] = useState(defaultPickupTime(deposit.jadwal));
  const [error, setError] = useState<string | null>(null);
  const mutation = useSchedulePickup();

  useEffect(() => {
    if (!open) return;
    setJadwal(defaultPickupTime(deposit.jadwal));
    setError(null);
  }, [open, deposit.id, deposit.jadwal]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const iso = localDateTimeToIso(jadwal);
    if (!iso) {
      setError('Waktu penjemputan wajib diisi dengan benar.');
      return;
    }

    if (new Date(iso).getTime() < Date.now() - 60_000) {
      setError('Waktu penjemputan tidak boleh di masa lalu.');
      return;
    }

    try {
      await mutation.mutateAsync({ depositId: deposit.id, jadwal: iso });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Jadwal penjemputan gagal disimpan.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Jadwalkan penjemputan"
      description="Tentukan waktu BSU menjemput sampah warga."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="schedule-pickup-form"
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
        id="schedule-pickup-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        noValidate
      >
        <div className="rounded-2xl bg-[#f8faf7] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Setoran
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {deposit.estimasi_jenis} ·{' '}
            {formatWeight(toNumber(deposit.estimasi_berat_kg))}
          </p>
          <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted">
            <p className="flex items-start gap-1.5">
              <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              {deposit.profiles?.nama ?? 'Warga'}
            </p>
            {deposit.alamat && (
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                {deposit.alamat}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Waktu penjemputan"
          type="datetime-local"
          value={jadwal}
          min={toLocalDateTimeInput()}
          onChange={(event) => setJadwal(event.target.value)}
          icon={CalendarClock}
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
