import { normalizeWhatsApp, toNumber } from '@/lib/utils';
import type {
  DepositRecord,
  DepositStatus,
  PaymentMethod,
} from '@/types/database';

export const ACTIVE_DEPOSIT_STATUSES: DepositStatus[] = [
  'diajukan',
  'dijadwalkan',
  'dicek_dibayar',
  'dikonfirmasi',
  'dikirim_ke_bsi',
];

export const COMPLETED_DEPOSIT_STATUSES: DepositStatus[] = [
  'dipublikasikan',
  'dibeli_pengepul',
  'diambil_bsi',
  'diambil_pengepul',
];

export const WAITING_DEPOSIT_STATUSES: DepositStatus[] = [
  'diajukan',
  'dijadwalkan',
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer bank',
};

export const LEDGER_CATEGORY_LABELS: Record<string, string> = {
  pembayaran_warga: 'Pembayaran warga',
  penjualan_stok: 'Penjualan stok',
  penjualan_produk: 'Penjualan produk',
  pembelian_stok: 'Pembelian stok',
  operasional: 'Operasional',
  koreksi: 'Koreksi',
  lainnya: 'Lainnya',
};

export function paymentMethodLabel(method: PaymentMethod | null | undefined) {
  return method ? PAYMENT_METHOD_LABELS[method] : '—';
}

export function depositWeight(deposit: DepositRecord) {
  const itemWeight = (deposit.deposit_items ?? []).reduce(
    (total, item) => total + toNumber(item.berat_final_kg),
    0,
  );
  return itemWeight > 0 ? itemWeight : toNumber(deposit.estimasi_berat_kg);
}

export function isValidWhatsApp(value: string) {
  const normalized = normalizeWhatsApp(value);
  return /^628[1-9][0-9]{6,10}$/.test(normalized);
}

export function normalizedWhatsApp(value: string) {
  return normalizeWhatsApp(value);
}

export type BsuDepositAction = 'schedule' | 'weigh' | 'send' | null;

export function bsuDepositAction(
  deposit: Pick<DepositRecord, 'metode' | 'status'>,
): BsuDepositAction {
  if (deposit.metode === 'jemput' && deposit.status === 'diajukan') {
    return 'schedule';
  }
  if (
    (deposit.metode === 'antar' && deposit.status === 'diajukan') ||
    (deposit.metode === 'jemput' && deposit.status === 'dijadwalkan')
  ) {
    return 'weigh';
  }
  if (deposit.status === 'dikonfirmasi') {
    return 'send';
  }
  return null;
}

export interface DepositTimelineStep {
  key: string;
  title: string;
  description: string;
  at: string | null;
  done: boolean;
}

export function depositTimeline(deposit: DepositRecord): DepositTimelineStep[] {
  const purchased =
    deposit.status === 'dibeli_pengepul' ||
    deposit.status === 'diambil_bsi' ||
    deposit.status === 'diambil_pengepul';
  const takenByBsi =
    Boolean(deposit.diambil_bsi_at) ||
    deposit.status === 'diambil_bsi' ||
    deposit.status === 'diambil_pengepul';

  return [
    {
      key: 'diajukan',
      title: 'Setoran diajukan',
      description: 'Warga mengirim permintaan setoran ke BSU tujuan.',
      at: deposit.created_at,
      done: true,
    },
    {
      key: 'dijadwalkan',
      title: 'Penjemputan dijadwalkan',
      description:
        deposit.metode === 'antar'
          ? 'Metode antar tidak membutuhkan jadwal penjemputan.'
          : 'BSU menjadwalkan waktu penjemputan.',
      at: deposit.dijadwalkan_at,
      done: Boolean(deposit.dijadwalkan_at),
    },
    {
      key: 'dicek_dibayar',
      title: 'Ditimbang & dibayar',
      description: 'BSU mencatat hasil timbang dan pembayaran langsung.',
      at: deposit.dicek_at ?? deposit.dibayar_at,
      done: Boolean(deposit.dicek_at || deposit.dibayar_at),
    },
    {
      key: 'dikonfirmasi',
      title: 'Dikonfirmasi warga',
      description: 'Warga menyetujui hasil timbang dan nominal pembayaran.',
      at: deposit.dikonfirmasi_at,
      done: Boolean(deposit.dikonfirmasi_at),
    },
    {
      key: 'dikirim_ke_bsi',
      title: 'Dikirim ke BSI',
      description: 'Data setoran diteruskan BSU ke BSI untuk dipublikasikan.',
      at: deposit.dikirim_ke_bsi_at,
      done: Boolean(deposit.dikirim_ke_bsi_at),
    },
    {
      key: 'dipublikasikan',
      title: 'Dipublikasikan ke stok',
      description: 'BSI mempublikasikan hasil setoran menjadi stok gabungan.',
      at: deposit.dipublikasikan_at,
      done: Boolean(deposit.dipublikasikan_at),
    },
    {
      key: 'dibeli_pengepul',
      title: 'Dibeli industri',
      description: 'Stok setoran dialokasikan ke pesanan industri.',
      at: null,
      done: purchased,
    },
    {
      key: 'diambil_bsi',
      title: 'Diambil BSI dari BSU',
      description: 'BSI menjemput stok setoran dari BSU asal.',
      at: deposit.diambil_bsi_at,
      done: takenByBsi,
    },
    {
      key: 'diambil_pengepul',
      title: 'Diambil industri',
      description: 'Industri mengambil stok dari lokasi BSI.',
      at: deposit.diambil_pengepul_at,
      done: Boolean(deposit.diambil_pengepul_at),
    },
  ];
}

export function ledgerCategoryLabel(category: string) {
  return LEDGER_CATEGORY_LABELS[category] ?? category;
}
