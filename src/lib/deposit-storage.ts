import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/images';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateDepositPhoto(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Gunakan foto JPG, PNG, atau WebP.';
  }
  if (file.size > MAX_PHOTO_SIZE) {
    return 'Ukuran foto maksimal 5 MB.';
  }
  return null;
}

export async function uploadDepositPhoto(
  userId: string,
  depositId: string,
  file: File,
) {
  const validation = validateDepositPhoto(file);
  if (validation) throw new Error(validation);

  // Foto dari kamera HP sering berukuran beberapa MB. Kompres dulu agar
  // unggahan lebih cepat dan hemat kuota.
  const { file: compressed } = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    maxBytes: 1.2 * 1024 * 1024,
  });

  const path = `${userId}/${depositId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('deposit-photos')
    .upload(path, compressed, {
      cacheControl: '3600',
      contentType: compressed.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('bucket not found')
        ? 'Bucket foto setoran belum tersedia. Jalankan migrasi storage terlebih dahulu.'
        : 'Foto setoran gagal diunggah. Periksa koneksi lalu coba lagi.',
    );
  }

  return path;
}

export async function removeDepositPhoto(path: string) {
  await supabase.storage.from('deposit-photos').remove([path]);
}

export async function getDepositPhotoSignedUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  const { data, error } = await supabase.storage
    .from('deposit-photos')
    .createSignedUrl(path, 60 * 60);

  if (error) {
    throw new Error(
      'Foto setoran tidak bisa dibuka. Pastikan bucket dan policy storage sudah diterapkan.',
    );
  }

  return data.signedUrl;
}
