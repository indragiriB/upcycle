import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Plus,
  Scale,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useActiveBuyPrices } from '@/hooks/usePrices';
import {
  useCompleteWeighing,
  type WeighingItemPayload,
} from '@/hooks/useDeposits';
import {
  formatCurrency,
  formatNumber,
  formatWeight,
  toNumber,
} from '@/lib/utils';
import type { DepositRecord, PaymentMethod } from '@/types/database';

interface WeighRow {
  key: string;
  wasteTypeId: string;
  berat: string;
  harga: string;
  alasan: string;
}

function blankRow(): WeighRow {
  return {
    key: crypto.randomUUID(),
    wasteTypeId: '',
    berat: '',
    harga: '',
    alasan: '',
  };
}

export function WeighingDialog({
  open,
  onClose,
  deposit,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  deposit: DepositRecord;
  orgId: string | null;
}) {
  const pricesQuery = useActiveBuyPrices(orgId);
  const mutation = useCompleteWeighing();
  const [rows, setRows] = useState<WeighRow[]>([blankRow()]);
  const [metodeBayar, setMetodeBayar] = useState<PaymentMethod>('tunai');
  const [potongan, setPotongan] = useState('0');
  const [alasanPotongan, setAlasanPotongan] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows([blankRow()]);
    setMetodeBayar('tunai');
    setPotongan('0');
    setAlasanPotongan('');
    setError(null);
  }, [open, deposit.id]);

  const prices = pricesQuery.data ?? [];
  const priceByWaste = useMemo(
    () => new Map(prices.map((price) => [price.waste_type_id, price])),
    [prices],
  );

  const rawTotal = rows.reduce((total, row) => {
    const weight = Number(row.berat);
    const price = Number(row.harga);
    if (!Number.isFinite(weight) || !Number.isFinite(price)) return total;
    return total + Math.round(weight * price);
  }, 0);
  const potonganValue = Math.max(0, Math.round(Number(potongan) || 0));
  const totalAfterDiscount = Math.max(
    0,
    Math.round((rawTotal - potonganValue) / 100) * 100,
  );

  const updateRow = (key: string, patch: Partial<WeighRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const handleWasteChange = (row: WeighRow, wasteTypeId: string) => {
    const price = priceByWaste.get(wasteTypeId);
    updateRow(row.key, {
      wasteTypeId,
      harga: price ? String(price.harga_per_kg) : '',
      alasan: '',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const filledRows = rows.filter(
      (row) => row.wasteTypeId || row.berat.trim() || row.harga.trim(),
    );

    if (filledRows.length === 0) {
      setError('Minimal satu item hasil timbang wajib diisi.');
      return;
    }

    const wasteIds = new Set<string>();
    const items: WeighingItemPayload[] = [];

    for (const row of filledRows) {
      if (!row.wasteTypeId) {
        setError('Pilih jenis sampah untuk setiap item timbangan.');
        return;
      }
      if (wasteIds.has(row.wasteTypeId)) {
        setError('Jenis sampah tidak boleh duplikat dalam satu setoran.');
        return;
      }
      wasteIds.add(row.wasteTypeId);

      const weight = Number(row.berat);
      const price = Math.round(Number(row.harga));
      if (!Number.isFinite(weight) || weight <= 0) {
        setError('Berat final setiap item harus lebih dari 0 kg.');
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        setError('Harga per kg setiap item harus lebih dari 0.');
        return;
      }

      const activePrice = priceByWaste.get(row.wasteTypeId);
      const adjusted = activePrice
        ? price !== toNumber(activePrice.harga_per_kg)
        : true;
      if (adjusted && !row.alasan.trim()) {
        setError(
          'Alasan penyesuaian wajib diisi jika harga berbeda dari harga aktif.',
        );
        return;
      }

      items.push({
        waste_type_id: row.wasteTypeId,
        berat_final: Number(weight.toFixed(2)),
        harga_per_kg: price,
        alasan_penyesuaian: adjusted ? row.alasan.trim() : null,
      });
    }

    if (potonganValue > rawTotal) {
      setError('Potongan tidak boleh melebihi total hasil timbang.');
      return;
    }

    if (potonganValue > 0 && !alasanPotongan.trim()) {
      setError('Alasan potongan wajib diisi.');
      return;
    }

    try {
      await mutation.mutateAsync({
        depositId: deposit.id,
        items,
        metodeBayar,
        potongan: potonganValue,
        alasanPotongan:
          potonganValue > 0 ? alasanPotongan.trim() : null,
      });
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Hasil timbang gagal disimpan.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Timbang & bayar setoran"
      description={`${deposit.profiles?.nama ?? 'Warga'} · ${deposit.estimasi_jenis} · estimasi ${formatWeight(
        toNumber(deposit.estimasi_berat_kg),
      )}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
              Total dibayar
            </p>
            <p className="text-lg font-extrabold tracking-tight text-brand-800">
              {formatCurrency(totalAfterDiscount)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              form="weighing-form"
              size="sm"
              loading={mutation.isPending}
              disabled={prices.length === 0}
            >
              <Wallet className="h-3.5 w-3.5" />
              Simpan & bayar
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="weighing-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5"
        noValidate
      >
        {pricesQuery.isError && (
          <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Harga beli BSU gagal dimuat. Tutup dialog lalu coba lagi.
          </p>
        )}

        {!pricesQuery.isLoading && prices.length === 0 && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Belum ada harga beli aktif. Atur harga di menu Harga sebelum
            melakukan penimbangan.
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Scale className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-ink">Item timbangan</p>
                <p className="text-[10px] text-muted">
                  Masukkan berat final per jenis sampah.
                </p>
              </div>
            </div>
            <Button
              variant="soft"
              size="sm"
              onClick={() => setRows((current) => [...current, blankRow()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah item
            </Button>
          </div>

          {rows.map((row, index) => {
            const activePrice = priceByWaste.get(row.wasteTypeId);
            const priceValue = Number(row.harga);
            const adjusted =
              Boolean(activePrice) &&
              Number.isFinite(priceValue) &&
              priceValue !== toNumber(activePrice?.harga_per_kg);
            const subtotal =
              Math.round((Number(row.berat) || 0) * (priceValue || 0)) || 0;

            return (
              <div
                key={row.key}
                className="rounded-[20px] border border-black/[0.05] bg-[#fafbf8] p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    Item {index + 1}
                  </p>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((current) =>
                          current.filter((item) => item.key !== row.key),
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Hapus item ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Select
                    label="Jenis sampah"
                    value={row.wasteTypeId}
                    onChange={(event) =>
                      handleWasteChange(row, event.target.value)
                    }
                    disabled={prices.length === 0}
                    required
                  >
                    <option value="">Pilih jenis sampah</option>
                    {prices.map((price) => (
                      <option
                        key={price.waste_type_id}
                        value={price.waste_type_id}
                      >
                        {price.waste_nama} ·{' '}
                        {formatCurrency(toNumber(price.harga_per_kg))}/kg
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="Berat final (kg)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={row.berat}
                    onChange={(event) =>
                      updateRow(row.key, { berat: event.target.value })
                    }
                    placeholder="Contoh: 12.5"
                    required
                  />

                  <Input
                    label="Harga per kg"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={row.harga}
                    onChange={(event) =>
                      updateRow(row.key, { harga: event.target.value })
                    }
                    hint={
                      activePrice
                        ? `Harga acuan ${formatCurrency(
                            toNumber(activePrice.harga_per_kg),
                          )}/kg`
                        : 'Pilih jenis sampah untuk melihat harga acuan.'
                    }
                    required
                  />

                  <div className="flex items-end">
                    <div className="w-full rounded-2xl border border-black/[0.05] bg-white px-4 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                        Subtotal
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-ink">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>
                  </div>
                </div>

                {adjusted && (
                  <div className="mt-3">
                    <Input
                      label="Alasan penyesuaian harga"
                      value={row.alasan}
                      onChange={(event) =>
                        updateRow(row.key, { alasan: event.target.value })
                      }
                      placeholder="Contoh: kualitas bahan lebih rendah"
                      hint="Wajib diisi karena harga berbeda dari harga aktif."
                      required
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[20px] border border-black/[0.05] bg-white p-4">
            <p className="text-[12px] font-bold text-ink">Metode pembayaran</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {(['tunai', 'transfer'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setMetodeBayar(method)}
                  className={`rounded-2xl border px-3 py-2.5 text-[11px] font-semibold transition-colors ${
                    metodeBayar === method
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-black/[0.06] bg-[#fafbf8] text-muted hover:bg-[#f4f7f1]'
                  }`}
                >
                  {method === 'tunai' ? 'Tunai' : 'Transfer bank'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-4 text-muted">
              Pembayaran langsung dicatat sebagai kas keluar BSU.
            </p>
          </div>

          <div className="space-y-3 rounded-[20px] border border-black/[0.05] bg-white p-4">
            <Input
              label="Potongan (Rp)"
              type="number"
              min="0"
              step="100"
              inputMode="numeric"
              value={potongan}
              onChange={(event) => setPotongan(event.target.value)}
              hint="Opsional, misalnya karena berat kotor atau kualitas."
            />
            {potonganValue > 0 && (
              <Input
                label="Alasan potongan"
                value={alasanPotongan}
                onChange={(event) => setAlasanPotongan(event.target.value)}
                placeholder="Contoh: sampah tercampur"
                required
              />
            )}
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold text-ink">
                {formatCurrency(rawTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-2 text-[11px]">
              <span className="font-bold text-ink">Total setelah potongan</span>
              <span className="text-sm font-extrabold text-brand-800">
                {formatCurrency(totalAfterDiscount)}
              </span>
            </div>
            <p className="text-[9px] leading-4 text-muted">
              Pembulatan ke Rp100 terdekat. Berat final:{' '}
              {formatNumber(
                rows.reduce(
                  (total, row) => total + (Number(row.berat) || 0),
                  0,
                ),
                2,
              )}{' '}
              kg.
            </p>
          </div>
        </div>

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
