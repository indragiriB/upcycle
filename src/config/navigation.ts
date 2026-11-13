import {
  BadgeCheck,
  ClipboardList,
  History,
  Inbox,
  LayoutGrid,
  MapPin,
  Package,
  Recycle,
  Store,
  Tags,
  UserRound,
  Users,
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
  hidden?: boolean;
}

export interface PrimaryAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

const ALL_ROLES: AppRole[] = ['warga', 'bsu', 'bsi', 'industri', 'admin'];

/**
 * Navigasi utama sengaja dibuat sesingkat mungkin. Halaman pendukung
 * (harga, riwayat, produk, pesanan) tetap tersedia lewat tab di dalam
 * halaman utama terkait.
 */
export const NAVIGATION: Record<AppRole, AppNavItem[]> = {
  warga: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Setor sampah', shortLabel: 'Setor', to: '/warga/setor', icon: Recycle },
    { label: 'Marketplace', shortLabel: 'Market', to: '/marketplace', icon: Store },
    { label: 'Akun', shortLabel: 'Akun', to: '/profile', icon: UserRound },
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
  industri: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Stok BSI', shortLabel: 'Stok', to: '/industri/stok', icon: Warehouse },
    { label: 'Pesanan', shortLabel: 'Pesanan', to: '/industri/pesanan', icon: ClipboardList },
    { label: 'Produk', shortLabel: 'Produk', to: '/industri/produk', icon: Package },
    { label: 'Marketplace', shortLabel: 'Market', to: '/marketplace', icon: Store },
    { label: 'Buku kas', shortLabel: 'Kas', to: '/industri/kas', icon: Wallet },
  ],
  admin: [
    { label: 'Dashboard', shortLabel: 'Beranda', to: '/dashboard', icon: LayoutGrid, end: true },
    { label: 'Jenis sampah', shortLabel: 'Sampah', to: '/admin/jenis-sampah', icon: Recycle },
    { label: 'Verifikasi', shortLabel: 'Verifikasi', to: '/admin/organisasi', icon: BadgeCheck },
    { label: 'Pengguna', shortLabel: 'Pengguna', to: '/admin/pengguna', icon: Users },
  ],
};

/**
 * Otorisasi rute tidak boleh bergantung pada item navigasi, karena beberapa
 * halaman pendukung tidak lagi tampil sebagai tab utama.
 */
export const ROUTE_ROLES: Record<string, AppRole[]> = {
  '/dashboard': ALL_ROLES,
  '/profile': ALL_ROLES,
  '/marketplace': ALL_ROLES,
  '/pembeli/katalog': ALL_ROLES,
  '/pembeli/pesanan': ['warga'],
  '/warga/setor': ['warga'],
  '/warga/harga': ['warga'],
  '/warga/riwayat': ['warga'],
  '/warga/produk': ['warga'],
  '/warga/pesanan': ['warga'],
  '/bsu/setoran': ['bsu'],
  '/bsu/jemput': ['bsu'],
  '/bsu/harga': ['bsu'],
  '/bsu/kas': ['bsu'],
  '/bsi/setoran': ['bsi'],
  '/bsi/stok': ['bsi'],
  '/bsi/pesanan': ['bsi'],
  '/bsi/kas': ['bsi'],
  '/industri/stok': ['industri'],
  '/industri/pesanan': ['industri'],
  '/industri/kas': ['industri'],
  '/industri/produk': ['industri'],
  '/pengepul/stok': ['industri'],
  '/pengepul/pesanan': ['industri'],
  '/pengepul/kas': ['industri'],
  '/pengepul/produk': ['industri'],
  '/admin/jenis-sampah': ['admin'],
  '/admin/organisasi': ['admin'],
  '/admin/pengguna': ['admin'],
};

export const PRIMARY_ACTIONS: Record<AppRole, PrimaryAction> = {
  warga: { label: 'Buat setoran', to: '/warga/setor', icon: Recycle },
  bsu: { label: 'Buka antrean', to: '/bsu/setoran', icon: Inbox },
  bsi: { label: 'Lihat data masuk', to: '/bsi/setoran', icon: Inbox },
  industri: { label: 'Jelajahi stok', to: '/industri/stok', icon: Warehouse },
  admin: { label: 'Verifikasi organisasi', to: '/admin/organisasi', icon: BadgeCheck },
};

/** Tujuan tombol "Lihat semua" pada kartu aktivitas terbaru. */
export const ACTIVITY_LINKS: Record<AppRole, PrimaryAction> = {
  warga: { label: 'Riwayat setoran', to: '/warga/riwayat', icon: History },
  bsu: { label: 'Antrean setoran', to: '/bsu/setoran', icon: Inbox },
  bsi: { label: 'Data masuk', to: '/bsi/setoran', icon: Inbox },
  industri: { label: 'Pesanan', to: '/industri/pesanan', icon: ClipboardList },
  admin: { label: 'Verifikasi organisasi', to: '/admin/organisasi', icon: BadgeCheck },
};

export function getAllowedRolesForPath(path: string): AppRole[] {
  const explicit = ROUTE_ROLES[path];
  if (explicit) return explicit;

  return (Object.keys(NAVIGATION) as AppRole[]).filter((role) =>
    NAVIGATION[role].some((item) => item.to === path),
  );
}
