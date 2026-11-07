import type { AppRole, OrganizationType } from '@/types/database';

export const ROLE_LABELS: Record<AppRole, string> = {
  warga: 'Warga',
  bsu: 'Petugas BSU',
  bsi: 'Petugas BSI',
  pengepul: 'Pengepul',
  pembeli: 'Pembeli',
  admin: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  warga: 'Setor sampah, pantau pembayaran, dan jual hasil kreatifmu.',
  bsu: 'Kelola setoran warga, penimbangan, pembayaran, dan kas BSU.',
  bsi: 'Kelola data masuk, stok gabungan, pesanan, dan kas BSI.',
  pengepul: 'Beli stok BSI, atur pengambilan, dan pasarkan produk daur ulang.',
  pembeli: 'Temukan produk daur ulang terbaik dari warga dan pengepul.',
  admin: 'Kelola master jenis sampah dan verifikasi akun organisasi.',
};

export const ROLE_SHORT_LABELS: Record<AppRole, string> = {
  warga: 'Warga',
  bsu: 'BSU',
  bsi: 'BSI',
  pengepul: 'Pengepul',
  pembeli: 'Pembeli',
  admin: 'Admin',
};

export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  bsu: 'Bank Sampah Unit',
  bsi: 'Bank Sampah Induk',
  pengepul: 'Pengepul',
};

export const ORG_TYPE_SHORT_LABELS: Record<OrganizationType, string> = {
  bsu: 'BSU',
  bsi: 'BSI',
  pengepul: 'Pengepul',
};

export const STAFF_ROLES: AppRole[] = ['bsu', 'bsi', 'pengepul'];
export const ORG_ROLES: AppRole[] = ['bsu', 'bsi', 'pengepul'];
