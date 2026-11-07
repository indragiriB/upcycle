import {
  BadgeCheck,
  ClipboardList,
  History,
  Inbox,
  LayoutGrid,
  MapPin,
  Package,
  Recycle,
  ShoppingBag,
  Store,
  Tags,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '@/types/database';

export interface AppNavItem {
  label: string;
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface PrimaryAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const NAVIGATION: Record<AppRole, AppNavItem[]> = {
  warga: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Setor sampah', shortLabel: 'Setor', to: '/warga/setor', icon: Recycle },
    { label: 'Harga BSU', shortLabel: 'Harga', to: '/warga/harga', icon: Tags },
    { label: 'Riwayat setoran', shortLabel: 'Riwayat', to: '/warga/riwayat', icon: History },
    { label: 'Marketplace', shortLabel: 'Market', to: '/marketplace', icon: Store },
  ],
  bsu: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Antrean setoran', shortLabel: 'Setoran', to: '/bsu/setoran', icon: Inbox },
    { label: 'Jemput', shortLabel: 'Jemput', to: '/bsu/jemput', icon: MapPin },
    { label: 'Harga', shortLabel: 'Harga', to: '/bsu/harga', icon: Tags },
    { label: 'Buku kas', shortLabel: 'Kas', to: '/bsu/kas', icon: Wallet },
  ],
  bsi: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Data masuk', shortLabel: 'Masuk', to: '/bsi/setoran', icon: Inbox },
    { label: 'Stok', shortLabel: 'Stok', to: '/bsi/stok', icon: Warehouse },
    { label: 'Pesanan', shortLabel: 'Pesanan', to: '/bsi/pesanan', icon: ClipboardList },
    { label: 'Buku kas', shortLabel: 'Kas', to: '/bsi/kas', icon: Wallet },
  ],
  pengepul: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Stok BSI', shortLabel: 'Stok', to: '/pengepul/stok', icon: Warehouse },
    { label: 'Pesanan', shortLabel: 'Pesanan', to: '/pengepul/pesanan', icon: ClipboardList },
    { label: 'Produk', shortLabel: 'Produk', to: '/pengepul/produk', icon: Package },
    { label: 'Buku kas', shortLabel: 'Kas', to: '/pengepul/kas', icon: Wallet },
  ],
  pembeli: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Marketplace', shortLabel: 'Market', to: '/marketplace', icon: Store },
    { label: 'Pesanan saya', shortLabel: 'Pesanan', to: '/pembeli/pesanan', icon: ShoppingBag },
  ],
  admin: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Jenis sampah', shortLabel: 'Sampah', to: '/admin/jenis-sampah', icon: Recycle },
    { label: 'Verifikasi', shortLabel: 'Verifikasi', to: '/admin/organisasi', icon: BadgeCheck },
  ],
};

export const PRIMARY_ACTIONS: Record<AppRole, PrimaryAction> = {
  warga: { label: 'Buat setoran', to: '/warga/setor', icon: Recycle },
  bsu: { label: 'Buka antrean', to: '/bsu/setoran', icon: Inbox },
  bsi: { label: 'Lihat data masuk', to: '/bsi/setoran', icon: Inbox },
  pengepul: { label: 'Jelajahi stok', to: '/pengepul/stok', icon: Warehouse },
  pembeli: { label: 'Jelajahi marketplace', to: '/marketplace', icon: Store },
  admin: { label: 'Verifikasi organisasi', to: '/admin/organisasi', icon: BadgeCheck },
};

export interface UpcomingPageMeta {
  title: string;
  description: string;
  stage: string;
}

export const UPCOMING_PAGE_META: Record<string, UpcomingPageMeta> = {
  '/pengepul/produk': {
    title: 'Produk pengepul',
    description:
      'Kelola produk daur ulang yang dijual di marketplace UPCYCLE.',
    stage: 'Tahap 5',
  },
  '/pembeli/pesanan': {
    title: 'Pesanan saya',
    description:
      'Pantau pesanan marketplace, pembayaran, dan status pengiriman.',
    stage: 'Tahap 5',
  },
  '/admin/jenis-sampah': {
    title: 'Master jenis sampah',
    description:
      'Kelola daftar jenis sampah yang bisa digunakan BSU dan BSI.',
    stage: 'Tahap 6',
  },
  '/admin/organisasi': {
    title: 'Verifikasi organisasi',
    description:
      'Tinjau dan verifikasi akun BSU, BSI, serta pengepul yang mendaftar.',
    stage: 'Tahap 6',
  },
};

export function getAllowedRolesForPath(path: string): AppRole[] {
  if (path === '/marketplace') {
    return ['warga', 'bsu', 'bsi', 'pengepul', 'pembeli', 'admin'];
  }
  return (Object.keys(NAVIGATION) as AppRole[]).filter((role) =>
    NAVIGATION[role].some((item) => item.to === path),
  );
}
