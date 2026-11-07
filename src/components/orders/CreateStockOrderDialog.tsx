import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  PackagePlus,
  Scale,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateStockOrder } from '@/hooks/useOrders';
import {
  formatCurrency,
  formatWeight,
  toNumber,
} from '@/lib/utils';
import type { BsiStockSummary } from '@/types/database';

export function CreateStockOrderDialog({
  open,
  onClose,
  bsiId,
  bsiNama,
  rows,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  bsiId: string | null;
  bsiNama: string;
  rows: BsiStockSummary[];
  onCreated: (order: { id: string; nomor: string } | null) => void;
}) {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateStockOrder();

  useEffect(() => {
    if (!open) return;
    setWeights({});
    setCatatan('');
    setError(null);
  }, [open, bsiId]);

  const selected = rows
    .map((row) => ({
      row,
      value: Number(weights[row.waste_type_id] ?? 0),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0);

  const totalRaw = selected.reduce(
    (total, item) =>
      total +
      (item.row.harga_jual_per_kg
        ? Math.round(item.value * item.row.harga_jual_per_kg)
        : 0),
    0,
  );
  const total = Math.round(totalRaw / 100) * 100;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!bsiId) {
      setError('BSI belum dipilih.');
      return;
    }

    if (selected.length === 0) {
      setError('Isi berat untuk minimal satu jenis stok.');
      return;
    }

    for (const item of selected) {
      if (!item.row.harga_jual_per_kg || item.row.harga_jual_per_kg <= 0) {
        setError(
          `Harga jual ${item.row.waste_nama} belum diatur BSI. Hapus item ini atau hubungi BSI.`,
        );
        return;
      }
      if (item.value > item.row.berat_tersedia_kg) {
        setError(
          `Berat ${item.row.waste_nama} melebihi stok tersedia (${formatWeight(
            item.row.berat_tersedia_kg,
          )}).`,
        );
        return;
      }
    }

    try {
      const result = await mutation.mutateAsync({
        bsiId,
        items: selected.map((item) => ({
          wasteTypeId: item.row.waste_type_id,
          beratKg: item.value,
        })),
        catatan: catatan.trim() || null,
      });
      onCreated(result);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Pesanan stok gagal dibuat.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat pesanan stok"
      description={`Isi berat yang ingin dibeli dari ${bsiNama || 'BSI'}. Stok dialokasikan otomatis dari lot tertua.`}
      size="lg"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
              Total perkiraan
            </p>
            <p className="text-lg font-extrabold tracking-tight text-brand-800">
              {formatCurrency(total)}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              form="create-stock-order-form"
              size="sm"
              loading={mutation.isPending}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Buat pesanan
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="create-stock-order-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        noValidate
      >
        <div className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-[10px] leading-5 text-brand-900">
          <PackagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Stok langsung dikunci saat pesanan dibuat. Pesanan yang belum dibayar
          dapat dibatalkan dan stoknya dikembalikan.
        </div>

        {rows.length === 0 && (
          <p className="rounded-2xl bg-[#f8faf7] px-4 py-4 text-center text-[11px] text-muted">
            Belum ada stok tersedia dari BSI ini.
          </p>
        )}

        <div className="space-y-2">
          {rows.map((row) => {
            const value = weights[row.waste_type_id] ?? '';
            const price = row.harga_jual_per_kg;
            return (
              <div
                key={row.waste_type_id}
                className="rounded-2xl border border-black/[0.05] bg-[#fafbf8] p-3.5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: row.warna }}
                  >
                    <Scale className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-ink">
                      {row.waste_nama}
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted">
                      Tersedia {formatWeight(toNumber(row.berat_tersedia_kg))}
                      {' · '}
                      {price
                        ? `${formatCurrency(price)}/kg`
                        : 'Harga jual belum diatur'}
                    </p>
                  </div>
                  <div className="w-full sm:w-32">
                    <label
                      htmlFor={`weight-${row.waste_type_id}`}
                      className="mb-1 block text-[9px] font-semibold text-muted"
                    >
                      Berat (kg)
                    </label>
                    <input
                      id={`weight-${row.waste_type_id}`}
                      type="number"
                      min="0"
                      max={row.berat_tersedia_kg}
                      step="0.01"
                      inputMode="decimal"
                      value={value}
                      disabled={!price}
                      onChange={(event) =>
                        setWeights((current) => ({
                          ...current,
                          [row.waste_type_id]: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-xl border border-black/[0.07] bg-white px-3 text-sm font-semibold text-ink outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Textarea
          label="Catatan pesanan (opsional)"
          value={catatan}
          onChange={(event) => setCatatan(event.target.value)}
          placeholder="Contoh: ambil pagi hari, hubungi sebelum datang"
          maxLength={240}
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
