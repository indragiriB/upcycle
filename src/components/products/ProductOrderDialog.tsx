import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateProductOrder } from '@/hooks/useProducts';
import {
  isValidWhatsApp,
  normalizedWhatsApp,
} from '@/lib/deposits';
import { formatCurrency } from '@/lib/utils';
import type { ProductOrderRecord, ProductRecord } from '@/types/database';

export function ProductOrderDialog({
  open,
  onClose,
  product,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductRecord | null;
  onCreated: (order: ProductOrderRecord) => void;
}) {
  const [jumlah, setJumlah] = useState('1');
  const [nomorWa, setNomorWa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateProductOrder();

  useEffect(() => {
    if (!open) return;
    setJumlah('1');
    setNomorWa('');
    setAlamat('');
    setCatatan('');
    setError(null);
  }, [open, product?.id]);

  const jumlahValue = Number(jumlah);
  const total =
    product && Number.isFinite(jumlahValue) && jumlahValue > 0
      ? product.harga * jumlahValue
      : 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!product) return;

    if (
      !Number.isInteger(jumlahValue) ||
      jumlahValue <= 0 ||
      jumlahValue > product.stok
    ) {
      setError(
        product.stok > 0
          ? `Jumlah harus antara 1 dan ${product.stok} ${product.satuan}.`
          : 'Stok produk ini sedang habis.',
      );
      return;
    }

    if (!isValidWhatsApp(nomorWa)) {
      setError('Nomor WhatsApp tidak valid. Contoh: 081234567890.');
      return;
    }

    if (alamat.trim().length < 5) {
      setError('Alamat pengiriman wajib diisi minimal 5 karakter.');
      return;
    }

    try {
      const order = await mutation.mutateAsync({
        items: [{ product_id: product.id, jumlah: jumlahValue }],
        nomorWa: normalizedWhatsApp(nomorWa),
        alamat: alamat.trim(),
        catatan: catatan.trim(),
      });
      onCreated(order);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Pesanan gagal dibuat. Coba lagi.',
      );
    }
  };

  if (!product) return null;

  const sellerName = product.org?.nama ?? product.penjual?.nama ?? 'Penjual';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat pesanan produk"
      description="Stok akan dikunci setelah pesanan dibuat. Pembayaran dicatat langsung ke penjual."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 rounded-[20px] bg-[#f8faf7] p-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
            {product.foto_urls[0] ? (
              <img
                src={product.foto_urls[0]}
                alt={product.nama}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-7 w-7 text-muted" />
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-bold text-ink">
              {product.nama}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              {sellerName} · stok {product.stok} {product.satuan}
            </p>
            <p className="mt-1 text-sm font-extrabold text-brand-800">
              {formatCurrency(product.harga)}
              <span className="text-[9px] font-medium text-muted">
                /{product.satuan}
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
          <Input
            label="Jumlah"
            type="number"
            min={1}
            max={product.stok}
            step={1}
            required
            value={jumlah}
            onChange={(event) => setJumlah(event.target.value)}
            trailing={
              <span className="text-[10px] font-medium text-muted">
                {product.satuan}
              </span>
            }
          />
          <Input
            label="Nomor WhatsApp"
            required
            value={nomorWa}
            onChange={(event) => setNomorWa(event.target.value)}
            placeholder="081234567890"
            inputMode="tel"
            hint="Dipakai penjual untuk mengonfirmasi pengiriman."
          />
        </div>

        <Textarea
          label="Alamat pengiriman"
          rows={3}
          required
          value={alamat}
          onChange={(event) => setAlamat(event.target.value)}
          placeholder="Nama penerima, alamat lengkap, kota, dan kode pos."
        />

        <Textarea
          label="Catatan (opsional)"
          rows={2}
          value={catatan}
          onChange={(event) => setCatatan(event.target.value)}
          placeholder="Contoh: kirim setelah jam 15.00."
        />

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-900/60">
              Total pembayaran
            </p>
            <p className="text-lg font-extrabold text-brand-900">
              {formatCurrency(total)}
            </p>
          </div>
          <Button type="submit" loading={mutation.isPending}>
            <ShoppingBag className="h-3.5 w-3.5" />
            Buat pesanan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
