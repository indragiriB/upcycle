import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ImagePlus,
  Loader2,
  Package,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  useCreateProduct,
  useUpdateProduct,
} from '@/hooks/useProducts';
import { uploadProductImage } from '@/lib/product-storage';
import { formatCurrency } from '@/lib/utils';
import type { ProductRecord, Profile } from '@/types/database';

const KATEGORI_PRODUK = [
  'Fashion',
  'Dekorasi',
  'Alat Tulis',
  'Aksesoris',
  'Perabot',
  'Elektronik',
  'Lainnya',
];

export function ProductFormDialog({
  open,
  onClose,
  product,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductRecord | null;
  profile: Profile | null;
}) {
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('Lainnya');
  const [deskripsi, setDeskripsi] = useState('');
  const [harga, setHarga] = useState('');
  const [stok, setStok] = useState('0');
  const [satuan, setSatuan] = useState('pcs');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [file, setFile] = useState<File | null>(null);
  const [keepExistingPhoto, setKeepExistingPhoto] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateProduct(profile);
  const updateMutation = useUpdateProduct();
  const submitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    setNama(product?.nama ?? '');
    setKategori(product?.kategori ?? 'Lainnya');
    setDeskripsi(product?.deskripsi ?? '');
    setHarga(product ? String(product.harga) : '');
    setStok(product ? String(product.stok) : '0');
    setSatuan(product?.satuan ?? 'pcs');
    setStatus(product?.status ?? 'aktif');
    setFile(null);
    setKeepExistingPhoto(true);
    setError(null);
  }, [open, product]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const existingPhoto = keepExistingPhoto ? product?.foto_urls[0] ?? null : null;
  const imageUrl = previewUrl ?? existingPhoto;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!profile) {
      setError('Sesi login tidak ditemukan.');
      return;
    }

    const hargaValue = Number(harga);
    const stokValue = Number(stok);

    if (!nama.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }

    if (
      !Number.isFinite(hargaValue) ||
      hargaValue <= 0 ||
      hargaValue % 100 !== 0
    ) {
      setError('Harga harus lebih dari 0 dan kelipatan Rp100.');
      return;
    }

    if (!Number.isInteger(stokValue) || stokValue < 0) {
      setError('Stok harus berupa angka bulat 0 atau lebih.');
      return;
    }

    if (!satuan.trim()) {
      setError('Satuan produk wajib diisi.');
      return;
    }

    try {
      let fotoUrls: string[] = [];

      if (file) {
        const uploadedUrl = await uploadProductImage(profile.id, file);
        fotoUrls = [uploadedUrl];
      } else if (existingPhoto) {
        fotoUrls = [existingPhoto];
      }

      const payload = {
        nama: nama.trim(),
        kategori,
        deskripsi: deskripsi.trim(),
        harga: hargaValue,
        stok: stokValue,
        satuan: satuan.trim(),
        fotoUrls,
      };

      if (product) {
        await updateMutation.mutateAsync({
          ...payload,
          id: product.id,
          status,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Produk gagal disimpan. Coba lagi.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Ubah produk' : 'Tambah produk'}
      description="Produk akan tampil di marketplace setelah disimpan sebagai aktif."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
          <Input
            label="Nama produk"
            required
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            placeholder="Contoh: Tas anyaman plastik"
            icon={Package}
          />
          <Select
            label="Kategori"
            value={kategori}
            onChange={(event) => setKategori(event.target.value)}
          >
            {KATEGORI_PRODUK.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Deskripsi"
          rows={3}
          value={deskripsi}
          onChange={(event) => setDeskripsi(event.target.value)}
          placeholder="Jelaskan bahan, ukuran, kondisi, dan keunggulan produk."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Harga (Rp)"
            type="number"
            min={100}
            step={100}
            required
            value={harga}
            onChange={(event) => setHarga(event.target.value)}
            hint={
              Number(harga) > 0
                ? formatCurrency(Number(harga))
                : 'Kelipatan Rp100'
            }
          />
          <Input
            label="Stok"
            type="number"
            min={0}
            step={1}
            required
            value={stok}
            onChange={(event) => setStok(event.target.value)}
          />
          <Input
            label="Satuan"
            required
            value={satuan}
            onChange={(event) => setSatuan(event.target.value)}
            placeholder="pcs"
          />
        </div>

        {product && (
          <Select
            label="Status produk"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'aktif' | 'nonaktif')
            }
            hint="Produk nonaktif tetap tersimpan tetapi tidak tampil di katalog."
          >
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
        )}

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">
            Foto produk
          </p>
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-black/10 bg-[#f8faf7] p-3 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Pratinjau produk"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-7 w-7 text-muted" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 text-[11px] font-semibold text-ink transition-colors hover:border-black/20">
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                {imageUrl ? 'Ganti foto' : 'Pilih foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setFile(selected);
                    if (selected) setKeepExistingPhoto(false);
                  }}
                />
              </label>
              <p className="mt-1.5 text-[9px] leading-4 text-muted">
                JPG, PNG, atau WebP. Maksimal 5 MB. Foto disimpan di bucket
                publik product-images.
              </p>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setKeepExistingPhoto(false);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus foto
                </button>
              )}
            </div>
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
            {product ? 'Simpan perubahan' : 'Publikasikan produk'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
