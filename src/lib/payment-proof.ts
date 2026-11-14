import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/images';

const BUCKET = 'payment-proofs';

export function validatePaymentProof(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Gunakan foto JPG, PNG, atau WebP.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Ukuran bukti pembayaran maksimal 5 MB.';
  }
  return null;
}

export async function uploadPaymentProof(
  depositId: string,
  file: File,
  side: 'bsu' | 'warga' = 'bsu',
) {
  const validation = validatePaymentProof(file);
  if (validation) throw new Error(validation);

  const { file: compressed } = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    maxBytes: 1.2 * 1024 * 1024,
  });

  const path = `${depositId}/${side}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      cacheControl: '3600',
      contentType: compressed.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('bucket not found')
        ? 'Bucket bukti pembayaran belum tersedia. Terapkan migrasi terbaru terlebih dahulu.'
        : 'Bukti pembayaran gagal diunggah. Periksa koneksi lalu coba lagi.',
    );
  }

  return path;
}

export async function getPaymentProofSignedUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    throw new Error(
      'Bukti pembayaran tidak bisa dibuka. Pastikan bucket dan policy storage sudah diterapkan.',
    );
  }

  return data.signedUrl;
}
