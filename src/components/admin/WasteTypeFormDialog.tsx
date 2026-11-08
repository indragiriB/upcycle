import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Palette, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  useCreateWasteType,
  useUpdateWasteType,
  type WasteTypeInput,
} from '@/hooks/useAdmin';
import type { WasteType } from '@/types/database';

const ICON_OPTIONS = [
  { value: 'Recycle', label: 'Daur ulang' },
  { value: 'Package', label: 'Paket' },
  { value: 'FileText', label: 'Kertas / dokumen' },
  { value: 'GlassWater', label: 'Gelas / kaca' },
  { value: 'BottleWine', label: 'Botol / plastik' },
  { value: 'Wine', label: 'Botol kaca' },
  { value: 'CircleDot', label: 'Kaleng / logam' },
  { value: 'Cpu', label: 'Elektronik' },
  { value: 'Shirt', label: 'Tekstil' },
  { value: 'TreePine', label: 'Organik / kayu' },
  { value: 'Box', label: 'Kardus' },
  { value: 'Layers', label: 'Lain-lain' },
];

const LEGACY_ICONS: Record<string, string> = {
  Bottle: 'BottleWine',
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const EMPTY_FORM: WasteTypeInput = {
  nama: '',
  kode: '',
  kategori: '',
  deskripsi: '',
  ikon: 'Recycle',
  warna: '#22C55E',
  satuan: 'kg',
  aktif: true,
};

export function WasteTypeFormDialog({
  open,
  onClose,
  wasteType,
}: {
  open: boolean;
  onClose: () => void;
  wasteType: WasteType | null;
}) {
  const [form, setForm] = useState<WasteTypeInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateWasteType();
  const updateMutation = useUpdateWasteType();
  const submitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    setForm(
      wasteType
        ? {
            nama: wasteType.nama,
            kode: wasteType.kode ?? '',
            kategori: wasteType.kategori ?? '',
            deskripsi: wasteType.deskripsi ?? '',
            ikon: LEGACY_ICONS[wasteType.ikon] ?? wasteType.ikon ?? 'Recycle',
            warna: wasteType.warna || '#22C55E',
            satuan: wasteType.satuan || 'kg',
            aktif: wasteType.aktif,
          }
        : EMPTY_FORM,
    );
    setError(null);
  }, [open, wasteType]);

  const update = <Key extends keyof WasteTypeInput>(
    key: Key,
    value: WasteTypeInput[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.nama.trim()) {
      setError('Nama jenis sampah wajib diisi.');
      return;
    }

    if (form.kode.trim() && form.kode.trim().length > 24) {
      setError('Kode jenis sampah maksimal 24 karakter.');
      return;
    }

    if (!HEX_COLOR.test(form.warna)) {
      setError('Warna harus berupa kode hex, contoh #22C55E.');
      return;
    }

    if (!form.satuan.trim()) {
      setError('Satuan wajib diisi.');
      return;
    }

    try {
      if (wasteType) {
        await updateMutation.mutateAsync({ ...form, id: wasteType.id });
      } else {
        await createMutation.mutateAsync(form);
      }
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Jenis sampah gagal disimpan. Coba lagi.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={wasteType ? 'Ubah jenis sampah' : 'Tambah jenis sampah'}
      description="Master jenis sampah dipakai oleh BSU dan BSI saat menimbang setoran serta menyusun harga."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
          <Input
            label="Nama jenis sampah"
            required
            value={form.nama}
            onChange={(event) => update('nama', event.target.value)}
            placeholder="Contoh: Botol PET"
            icon={Tag}
          />
          <Input
            label="Kode"
            value={form.kode}
            onChange={(event) => update('kode', event.target.value.toUpperCase())}
            placeholder="PET"
            maxLength={24}
            hint="Opsional, unik."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Kategori"
            value={form.kategori}
            onChange={(event) => update('kategori', event.target.value)}
            placeholder="Plastik"
          />
          <Input
            label="Satuan"
            required
            value={form.satuan}
            onChange={(event) => update('satuan', event.target.value)}
            placeholder="kg"
          />
          <Select
            label="Status"
            value={form.aktif ? 'aktif' : 'nonaktif'}
            onChange={(event) => update('aktif', event.target.value === 'aktif')}
          >
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
        </div>

        <Textarea
          label="Deskripsi (opsional)"
          rows={2}
          value={form.deskripsi}
          onChange={(event) => update('deskripsi', event.target.value)}
          placeholder="Contoh: Botol plastik bening tanpa tutup dan label."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Ikon"
            value={form.ikon}
            onChange={(event) => update('ikon', event.target.value)}
            hint="Dipakai sebagai penanda visual di daftar harga."
          >
            {ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Palette className="h-3.5 w-3.5 text-muted" />
              Warna penanda
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pilih warna penanda"
                value={HEX_COLOR.test(form.warna) ? form.warna : '#22C55E'}
                onChange={(event) => update('warna', event.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
              />
              <div className="min-w-0 flex-1">
                <Input
                  value={form.warna}
                  onChange={(event) => update('warna', event.target.value)}
                  placeholder="#22C55E"
                  maxLength={7}
                />
              </div>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-muted">
              Gunakan kode hex enam digit.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button type="submit" loading={submitting}>
            {wasteType ? 'Simpan perubahan' : 'Tambah jenis sampah'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
