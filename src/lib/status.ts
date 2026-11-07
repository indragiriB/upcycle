type BadgeTone = 'green' | 'neutral' | 'amber' | 'red' | 'dark' | 'white';

export const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  diajukan: 'Diajukan',
  dijadwalkan: 'Dijadwalkan',
  dicek_dibayar: 'Dicek & dibayar',
  dikonfirmasi: 'Dikonfirmasi',
  dikirim_ke_bsi: 'Dikirim ke BSI',
  dipublikasikan: 'Dipublikasikan',
  dibeli_pengepul: 'Dibeli pengepul',
  diambil_bsi: 'Diambil BSI',
  diambil_pengepul: 'Diambil pengepul',
};

export const DEPOSIT_STATUS_TONES: Record<string, BadgeTone> = {
  diajukan: 'amber',
  dijadwalkan: 'amber',
  dicek_dibayar: 'green',
  dikonfirmasi: 'green',
  dikirim_ke_bsi: 'green',
  dipublikasikan: 'green',
  dibeli_pengepul: 'neutral',
  diambil_bsi: 'neutral',
  diambil_pengepul: 'neutral',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  menunggu_pembayaran: 'Menunggu pembayaran',
  dibayar: 'Dibayar',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const ORDER_STATUS_TONES: Record<string, BadgeTone> = {
  menunggu_pembayaran: 'amber',
  dibayar: 'green',
  diproses: 'green',
  selesai: 'neutral',
  dibatalkan: 'red',
};

export const PICKUP_TYPE_LABELS: Record<string, string> = {
  bsi_ke_bsu: 'BSI mengambil dari BSU',
  pengepul_ke_bsi: 'Pengepul mengambil di BSI',
};

export const PICKUP_STATUS_LABELS: Record<string, string> = {
  dijadwalkan: 'Dijadwalkan',
  dalam_perjalanan: 'Dalam perjalanan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const PICKUP_STATUS_TONES: Record<string, BadgeTone> = {
  dijadwalkan: 'amber',
  dalam_perjalanan: 'green',
  selesai: 'neutral',
  dibatalkan: 'red',
};

export const STOCK_STATUS_LABELS: Record<string, string> = {
  tersedia: 'Tersedia',
  habis: 'Habis',
};

export const PRODUCT_ORDER_STATUS_LABELS: Record<string, string> = {
  menunggu_pembayaran: 'Menunggu pembayaran',
  dibayar: 'Dibayar',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const PRODUCT_ORDER_STATUS_TONES: Record<string, BadgeTone> = {
  menunggu_pembayaran: 'amber',
  dibayar: 'green',
  dikirim: 'green',
  selesai: 'neutral',
  dibatalkan: 'red',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: 'Menunggu verifikasi',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
};

export const VERIFICATION_TONES: Record<string, BadgeTone> = {
  pending: 'amber',
  verified: 'green',
  rejected: 'red',
};

export function statusLabel(
  status: string | null | undefined,
  labels: Record<string, string>,
) {
  if (!status) return '—';
  return labels[status] ?? status;
}

export function statusTone(
  status: string | null | undefined,
  tones: Record<string, BadgeTone>,
): BadgeTone {
  if (!status) return 'neutral';
  return tones[status] ?? 'neutral';
}
