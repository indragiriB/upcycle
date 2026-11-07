import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useCorrectLedgerEntry } from '@/hooks/useCashBook';
import { ledgerCategoryLabel } from '@/lib/deposits';
import { formatCurrency, formatDateTime, toNumber } from '@/lib/utils';
import type { LedgerEntry } from '@/types/database';

export function LedgerCorrectionDialog({
  open,
  onClose,
  entry,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  entry: LedgerEntry | null;
  orgId: string | null;
}) {
  const [alasan, setAlasan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useCorrectLedgerEntry(orgId);

  useEffect(() => {
    if (!open) return;
    setAlasan('');
    setError(null);
  }, [open, entry?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!entry) {
      setError('Entri kas belum dipilih.');
      return;
    }
    if (alasan.trim().length < 4) {
      setError('Alasan koreksi minimal 4 karakter.');
      return;
    }

    try {
      await mutation.mutateAsync({
        entryId: entry.id,
        alasan: alasan.trim(),
      });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Koreksi kas gagal disimpan.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Koreksi entri kas"
      description="Koreksi membuat entri pembalik baru. Entri asli tetap tersimpan agar audit tetap utuh."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="ledger-correction-form"
            size="sm"
            loading={mutation.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Simpan koreksi
          </Button>
        </div>
      }
    >
      <form
        id="ledger-correction-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        noValidate
      >
        {entry && (
          <div className="rounded-2xl bg-[#f8faf7] px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Entri yang dikoreksi
            </p>
            <p className="mt-1 text-sm font-bold text-ink">
              {entry.keterangan || ledgerCategoryLabel(entry.kategori)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {ledgerCategoryLabel(entry.kategori)} ·{' '}
              {formatDateTime(entry.tanggal)} ·{' '}
              <span
                className={
                  entry.arah === 'masuk' ? 'text-brand-700' : 'text-red-600'
                }
              >
                {entry.arah === 'masuk' ? 'Masuk' : 'Keluar'}{' '}
                {formatCurrency(toNumber(entry.jumlah))}
              </span>
            </p>
          </div>
        )}

        <Textarea
          label="Alasan koreksi"
          value={alasan}
          onChange={(event) => setAlasan(event.target.value)}
          placeholder="Contoh: nominal pembayaran salah input"
          maxLength={240}
          required
        />

        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-800">
          Setelah dikoreksi, entri ini tidak dapat dikoreksi lagi.
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
