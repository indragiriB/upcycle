import type { ProductCondition } from '@/types/database';

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  upcycle: 'Upcycle',
  bekas: 'Bekas',
};

export const PRODUCT_CONDITION_HINTS: Record<ProductCondition, string> = {
  upcycle: 'Produk hasil daur ulang atau kreasi ulang.',
  bekas: 'Barang bekas layak pakai yang dijual kembali.',
};

export const PRODUCT_CONDITIONS: ProductCondition[] = ['upcycle', 'bekas'];

export const PRODUCT_CATEGORIES = [
  'Fashion',
  'Dekorasi',
  'Alat Tulis',
  'Aksesoris',
  'Perabot',
  'Elektronik',
  'Lainnya',
];
