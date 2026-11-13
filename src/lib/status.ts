type BadgeTone = 'green' | 'neutral' | 'amber' | 'red' | 'dark' | 'white';

export const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  diajukan: 'Diajukan',
  dijadwalkan: 'Dijadwalkan',
  dicek_dibayar: 'Dicek & dibayar',
  dikonfirmasi: 'Dikonfirmasi',
  dikirim_ke_bsi: 'Dikirim ke BSI',
  dipublikasikan: 'Dipublikasikan',
  dibeli_pengepul: 'Dibeli industri',
  diambil_bsi: 'Diambil BSI',
  diambil_pengepul: 'Diambil industri',
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

/**
 * Warga cukup melihat tiga tahap besar. Status internal (9 tahap) tetap
 * dipakai pada timeline, aksi BSU/BSI, dan data mentah di database.
 */
export type DepositStage = 'diajukan' | 'ditimbang' | 'selesai';

export const DEPOSIT_STAGE_LABELS: Record<DepositStage, string> = {
  diajukan: 'Diajukan',
  ditimbang: 'Ditimbang',
  selesai: 'Selesai',
};

export const DEPOSIT_STAGE_TONES: Record<DepositStage, BadgeTone> = {
  diajukan: 'amber',
  ditimbang: 'green',
  selesai: 'neutral',
};

export const DEPOSIT_STAGE_HINTS: Record<DepositStage, string> = {
  diajukan: 'Setoranmu menunggu dijadwalkan atau ditimbang oleh BSU.',
  ditimbang:
    'BSU sudah mencatat hasil timbang dan pembayaran. Periksa rincian di bawah.',
  selesai:
    'Setoranmu sudah selesai diproses. Terima kasih sudah memilah sampah!',
};

export function depositStage(status: string | null | undefined): DepositStage {
  if (status === 'dicek_dibayar' || status === 'dikonfirmasi') {
    return 'ditimbang';
  }
  if (
    status === 'dikirim_ke_bsi' ||
    status === 'dipublikasikan' ||
    status === 'dibeli_pengepul' ||
    status === 'diambil_bsi' ||
    status === 'diambil_pengepul'
  ) {
    return 'selesai';
  }
  return 'diajukan';
}


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
  pengepul_ke_bsi: 'Industri mengambil di BSI',
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
