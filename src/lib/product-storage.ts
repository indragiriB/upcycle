import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/images';

export const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadProductImage(userId: string, file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  }

  if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
    throw new Error('Ukuran foto produk maksimal 5 MB.');
  }

  const { file: compressed } = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    maxBytes: 1.2 * 1024 * 1024,
  });

  const path = `${userId}/product-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, compressed, {
      cacheControl: '3600',
      contentType: compressed.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message.toLowerCase().includes('bucket not found')
        ? 'Bucket product-images belum tersedia. Jalankan migrasi storage Supabase terlebih dahulu.'
        : 'Foto produk gagal diunggah. Periksa koneksi lalu coba lagi.',
    );
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
