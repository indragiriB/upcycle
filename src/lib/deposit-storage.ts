import { supabase } from '@/lib/supabase';

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

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${depositId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from('deposit-photos')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
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
