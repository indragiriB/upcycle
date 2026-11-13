import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { monthStartIso, formatWeight } from '@/lib/utils';
import {
  DEPOSIT_STAGE_LABELS,
  DEPOSIT_STAGE_TONES,
  DEPOSIT_STATUS_LABELS,
  DEPOSIT_STATUS_TONES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  VERIFICATION_LABELS,
  VERIFICATION_TONES,
  depositStage,
  statusLabel,
  statusTone,
} from '@/lib/status';
import type {
  DashboardStat,
  ProfileWithOrganization,
  StatFormat,
} from '@/types/database';

export interface DashboardChartSource {
  title: string;
  description: string;
  format: StatFormat;
  rows: Array<{ date: string; value: number }>;
}

export interface DashboardRecentItem {
  id: string;
  title: string;
  description: string;
  date: string;
  status: string;
  tone: 'green' | 'neutral' | 'amber' | 'red' | 'dark' | 'white';
  href: string;
}

export interface DashboardSnapshot {
  stats: DashboardStat[];
  chart: DashboardChartSource;
  recent: DashboardRecentItem[];
}

interface DepositRow {
  id: string;
  status: string;
  total: number | string | null;
  metode?: string | null;
  estimasi_jenis?: string | null;
  estimasi_berat_kg: number | string;
  created_at: string;
  deposit_items?: Array<{ berat_final_kg: number | string }> | null;
}

interface IncomingRow {
  id: string;
  status: string;
  estimasi_jenis: string;
  estimasi_berat_kg: number | string;
  created_at: string;
  warga_nama: string;
  bsu_nama: string;
  total: number | string;
}

interface OrderRow {
  id: string;
  nomor: string;
  status: string;
  total: number | string;
  created_at: string;
}

interface OrganizationRow {
  id: string;
  nama: string;
  tipe: string;
  status: string;
  created_at: string;
}

interface LedgerRow {
  arah: 'masuk' | 'keluar';
  jumlah: number | string;
}

const ACTIVE_DEPOSIT_STATUSES = [
  'diajukan',
  'dijadwalkan',
  'dicek_dibayar',
  'dikonfirmasi',
];

const RECEIVED_DEPOSIT_STATUSES = [
  'dicek_dibayar',
  'dikonfirmasi',
  'dikirim_ke_bsi',
  'dipublikasikan',
  'dibeli_pengepul',
  'diambil_bsi',
  'diambil_pengepul',
];

const ACTIVE_ORDER_STATUSES = ['menunggu_pembayaran', 'dibayar', 'diproses'];

const number = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sum = <T,>(rows: T[], pick: (row: T) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

const isSince = (dateValue: string, sinceIso: string) =>
  new Date(dateValue).getTime() >= new Date(sinceIso).getTime();

function depositWeight(row: DepositRow) {
  const fromItems = sum(row.deposit_items ?? [], (item) =>
    number(item.berat_final_kg),
  );
  return fromItems > 0 ? fromItems : number(row.estimasi_berat_kg);
}

function depositChartRows(rows: DepositRow[]) {
  return rows.map((row) => ({
    date: row.created_at,
    value: depositWeight(row),
  }));
}

function depositRecent(
  rows: DepositRow[],
  hrefPrefix: string,
  simplified = false,
): DashboardRecentItem[] {
  return rows.slice(0, 4).map((row) => {
    const stage = depositStage(row.status);
    return {
      id: row.id,
      title: `Setoran ${row.estimasi_jenis ?? 'sampah'}`,
      description: `${formatWeight(depositWeight(row))} · ${
        row.metode === 'jemput' ? 'Dijemput BSU' : 'Diantar ke BSU'
      }`,
      date: row.created_at,
      status: simplified
        ? DEPOSIT_STAGE_LABELS[stage]
        : statusLabel(row.status, DEPOSIT_STATUS_LABELS),
      tone: simplified
        ? DEPOSIT_STAGE_TONES[stage]
        : statusTone(row.status, DEPOSIT_STATUS_TONES),
      href: `${hrefPrefix}/${row.id}`,
    };
  });
}

function ledgerTotal(rows: LedgerRow[], arah: 'masuk' | 'keluar') {
  return sum(
    rows.filter((row) => row.arah === arah),
    (row) => number(row.jumlah),
  );
}

function includeIncoming(status: string) {
  return RECEIVED_DEPOSIT_STATUSES.includes(status);
}

async function loadWargaSnapshot(userId: string): Promise<DashboardSnapshot> {
  const monthStart = monthStartIso();
  const [depositResult, activeResult, totalResult] = await Promise.all([
    supabase
      .from('deposits')
      .select(
        'id, status, total, metode, estimasi_jenis, estimasi_berat_kg, created_at, deposit_items(berat_final_kg)',
      )
      .eq('warga_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('deposits')
      .select('id', { count: 'exact', head: true })
      .eq('warga_id', userId)
      .in('status', ACTIVE_DEPOSIT_STATUSES),
    supabase
      .from('deposits')
      .select('id', { count: 'exact', head: true })
      .eq('warga_id', userId),
  ]);

  if (depositResult.error) throw depositResult.error;
  if (activeResult.error) throw activeResult.error;
  if (totalResult.error) throw totalResult.error;

  const rows = (depositResult.data ?? []) as DepositRow[];
  const thisMonth = rows.filter((row) => isSince(row.created_at, monthStart));
  const paid = rows.filter((row) => includeIncoming(row.status));

  return {
    stats: [
      {
        key: 'pendapatan',
        label: 'Pendapatan diterima',
        value: sum(paid, (row) => number(row.total)),
        format: 'currency',
        hint: 'Dari setoran terbayar',
      },
      {
        key: 'berat',
        label: 'Berat bulan ini',
        value: sum(thisMonth, depositWeight),
        format: 'weight',
        hint: 'Setoran bulan berjalan',
      },
      {
        key: 'aktif',
        label: 'Setoran aktif',
        value: activeResult.count ?? 0,
        format: 'number',
        hint: 'Belum selesai diproses',
      },
      {
        key: 'total',
        label: 'Total setoran',
        value: totalResult.count ?? 0,
        format: 'number',
        hint: 'Sepanjang waktu',
      },
    ],
    chart: {
      title: 'Volume setoran',
      description: 'Berat sampah yang kamu setorkan',
      format: 'weight',
      rows: depositChartRows(rows),
    },
    recent: depositRecent(rows, '/warga/setoran', true),
  };
}

async function loadBsuSnapshot(orgId: string): Promise<DashboardSnapshot> {
  const monthStart = monthStartIso();
  const [depositResult, queueResult, totalResult, ledgerResult] =
    await Promise.all([
      supabase
        .from('deposits')
        .select(
          'id, status, total, metode, estimasi_jenis, estimasi_berat_kg, created_at, deposit_items(berat_final_kg)',
        )
        .eq('bsu_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('bsu_id', orgId)
        .in('status', ['diajukan', 'dijadwalkan']),
      supabase
        .from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('bsu_id', orgId),
      supabase
        .from('ledger_entries')
        .select('arah, jumlah')
        .eq('org_id', orgId)
        .gte('tanggal', monthStart),
    ]);

  if (depositResult.error) throw depositResult.error;
  if (queueResult.error) throw queueResult.error;
  if (totalResult.error) throw totalResult.error;
  if (ledgerResult.error) throw ledgerResult.error;

  const rows = (depositResult.data ?? []) as DepositRow[];
  const receivedThisMonth = rows.filter(
    (row) =>
      isSince(row.created_at, monthStart) &&
      RECEIVED_DEPOSIT_STATUSES.includes(row.status),
  );
  const ledger = (ledgerResult.data ?? []) as unknown as LedgerRow[];

  return {
    stats: [
      {
        key: 'antrean',
        label: 'Antrean setoran',
        value: queueResult.count ?? 0,
        format: 'number',
        hint: 'Perlu dijadwalkan / ditimbang',
        badge: (queueResult.count ?? 0) > 0 ? 'Perlu aksi' : undefined,
      },
      {
        key: 'berat',
        label: 'Diterima bulan ini',
        value: sum(receivedThisMonth, depositWeight),
        format: 'weight',
        hint: 'Setoran terverifikasi',
      },
      {
        key: 'kas_keluar',
        label: 'Kas keluar bulan ini',
        value: ledgerTotal(ledger, 'keluar'),
        format: 'currency',
        hint: 'Pembayaran & operasional',
      },
      {
        key: 'total',
        label: 'Total setoran',
        value: totalResult.count ?? 0,
        format: 'number',
        hint: 'Sepanjang waktu',
      },
    ],
    chart: {
      title: 'Volume diterima',
      description: 'Berat setoran yang diproses BSU',
      format: 'weight',
      rows: depositChartRows(rows),
    },
    recent: depositRecent(rows, '/bsu/setoran'),
  };
}

async function loadBsiSnapshot(orgId: string): Promise<DashboardSnapshot> {
  const monthStart = monthStartIso();
  const [incomingResult, stockResult, orderResult, ledgerResult] =
    await Promise.all([
      supabase
        .from('v_bsi_incoming_deposits')
        .select(
          'id, status, estimasi_jenis, estimasi_berat_kg, created_at, warga_nama, bsu_nama, total',
        )
        .eq('bsi_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('v_bsi_stock_summary')
        .select('berat_tersedia_kg')
        .eq('bsi_id', orgId),
      supabase
        .from('orders')
        .select('id, status')
        .eq('bsi_id', orgId)
        .in('status', ACTIVE_ORDER_STATUSES),
      supabase
        .from('ledger_entries')
        .select('arah, jumlah')
        .eq('org_id', orgId)
        .gte('tanggal', monthStart),
    ]);

  if (incomingResult.error) throw incomingResult.error;
  if (stockResult.error) throw stockResult.error;
  if (orderResult.error) throw orderResult.error;
  if (ledgerResult.error) throw ledgerResult.error;

  const incoming = (incomingResult.data ?? []) as IncomingRow[];
  const stockRows = (stockResult.data ?? []) as Array<{
    berat_tersedia_kg: number | string;
  }>;
  const ledger = (ledgerResult.data ?? []) as unknown as LedgerRow[];
  const pending = incoming.filter((row) => row.status === 'dikirim_ke_bsi');

  return {
    stats: [
      {
        key: 'antrean',
        label: 'Perlu dipublikasikan',
        value: pending.length,
        format: 'number',
        hint: 'Data masuk dari BSU',
        badge: pending.length > 0 ? 'Perlu aksi' : undefined,
      },
      {
        key: 'stok',
        label: 'Stok tersedia',
        value: sum(stockRows, (row) => number(row.berat_tersedia_kg)),
        format: 'weight',
        hint: 'Seluruh lot aktif',
      },
      {
        key: 'kas_masuk',
        label: 'Kas masuk bulan ini',
        value: ledgerTotal(ledger, 'masuk'),
        format: 'currency',
        hint: 'Penjualan stok & lainnya',
      },
      {
        key: 'pesanan',
        label: 'Pesanan aktif',
        value: orderResult.data?.length ?? 0,
        format: 'number',
        hint: 'Menunggu diproses',
      },
    ],
    chart: {
      title: 'Data masuk',
      description: 'Estimasi berat setoran dari BSU',
      format: 'weight',
      rows: incoming.map((row) => ({
        date: row.created_at,
        value: number(row.estimasi_berat_kg),
      })),
    },
    recent: incoming.slice(0, 4).map((row) => ({
      id: row.id,
      title: `Data dari ${row.bsu_nama}`,
      description: `${row.estimasi_jenis} · ${formatWeight(
        number(row.estimasi_berat_kg),
      )}`,
      date: row.created_at,
      status: statusLabel(row.status, DEPOSIT_STATUS_LABELS),
      tone: statusTone(row.status, DEPOSIT_STATUS_TONES),
      href: `/bsi/setoran/${row.id}`,
    })),
  };
}

async function loadIndustriSnapshot(orgId: string): Promise<DashboardSnapshot> {
  const monthStart = monthStartIso();
  const [orderResult, stockResult, ledgerResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, nomor, status, total, created_at')
      .eq('pengepul_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('v_bsi_stock_summary').select('berat_tersedia_kg'),
    supabase
      .from('ledger_entries')
      .select('arah, jumlah')
      .eq('org_id', orgId)
      .gte('tanggal', monthStart),
  ]);

  if (orderResult.error) throw orderResult.error;
  if (stockResult.error) throw stockResult.error;
  if (ledgerResult.error) throw ledgerResult.error;

  const orders = (orderResult.data ?? []) as OrderRow[];
  const stockRows = (stockResult.data ?? []) as Array<{
    berat_tersedia_kg: number | string;
  }>;
  const ledger = (ledgerResult.data ?? []) as unknown as LedgerRow[];
  const active = orders.filter((row) =>
    ACTIVE_ORDER_STATUSES.includes(row.status),
  );
  const validOrders = orders.filter((row) => row.status !== 'dibatalkan');

  return {
    stats: [
      {
        key: 'pesanan',
        label: 'Pesanan aktif',
        value: active.length,
        format: 'number',
        hint: 'Pembelian stok berjalan',
        badge: active.length > 0 ? 'Berjalan' : undefined,
      },
      {
        key: 'pembelian',
        label: 'Total pembelian',
        value: sum(validOrders, (row) => number(row.total)),
        format: 'currency',
        hint: 'Seluruh pesanan sah',
      },
      {
        key: 'stok',
        label: 'Stok BSI tersedia',
        value: sum(stockRows, (row) => number(row.berat_tersedia_kg)),
        format: 'weight',
        hint: 'Siap dibeli',
      },
      {
        key: 'kas_keluar',
        label: 'Kas keluar bulan ini',
        value: ledgerTotal(ledger, 'keluar'),
        format: 'currency',
        hint: 'Pembelian & operasional',
      },
    ],
    chart: {
      title: 'Pembelian stok',
      description: 'Nilai pembelian stok dari BSI',
      format: 'currency',
      rows: orders.map((row) => ({
        date: row.created_at,
        value: number(row.total),
      })),
    },
    recent: orders.slice(0, 4).map((row) => ({
      id: row.id,
      title: `Pesanan ${row.nomor}`,
      description: `Pembelian stok · ${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(number(row.total))}`,
      date: row.created_at,
      status: statusLabel(row.status, ORDER_STATUS_LABELS),
      tone: statusTone(row.status, ORDER_STATUS_TONES),
      href: '/industri/pesanan',
    })),
  };
}

async function loadAdminSnapshot(): Promise<DashboardSnapshot> {
  const [orgResult, wasteResult, profileResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, nama, tipe, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('waste_types')
      .select('id', { count: 'exact', head: true })
      .eq('aktif', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  if (orgResult.error) throw orgResult.error;
  if (wasteResult.error) throw wasteResult.error;
  if (profileResult.error) throw profileResult.error;

  const organizations = (orgResult.data ?? []) as OrganizationRow[];
  const pending = organizations.filter((row) => row.status === 'pending');
  const verified = organizations.filter((row) => row.status === 'verified');

  return {
    stats: [
      {
        key: 'pending',
        label: 'Menunggu verifikasi',
        value: pending.length,
        format: 'number',
        hint: 'Organisasi baru',
        badge: pending.length > 0 ? 'Perlu aksi' : undefined,
      },
      {
        key: 'verified',
        label: 'Organisasi terverifikasi',
        value: verified.length,
        format: 'number',
        hint: 'Aktif di jaringan',
      },
      {
        key: 'jenis',
        label: 'Jenis sampah aktif',
        value: wasteResult.count ?? 0,
        format: 'number',
        hint: 'Master data',
      },
      {
        key: 'pengguna',
        label: 'Pengguna terdaftar',
        value: profileResult.count ?? 0,
        format: 'number',
        hint: 'Seluruh peran',
      },
    ],
    chart: {
      title: 'Registrasi organisasi',
      description: 'Organisasi baru yang mendaftar',
      format: 'number',
      rows: organizations.map((row) => ({
        date: row.created_at,
        value: 1,
      })),
    },
    recent: organizations.slice(0, 4).map((row) => ({
      id: row.id,
      title: row.nama,
      description: row.tipe.toUpperCase(),
      date: row.created_at,
      status: statusLabel(row.status, VERIFICATION_LABELS),
      tone: statusTone(row.status, VERIFICATION_TONES),
      href: '/admin/organisasi',
    })),
  };
}

async function loadSnapshot(
  profile: ProfileWithOrganization,
): Promise<DashboardSnapshot> {
  if (profile.role === 'warga') return loadWargaSnapshot(profile.id);
  if (profile.role === 'admin') return loadAdminSnapshot();

  if (!profile.org_id) {
    throw new Error(
      'Akun ini belum terhubung ke organisasi. Hubungi administrator UPCYCLE.',
    );
  }

  if (profile.role === 'bsu') {
    return loadBsuSnapshot(profile.org_id);
  }
  if (profile.role === 'bsi') {
    return loadBsiSnapshot(profile.org_id);
  }
  return loadIndustriSnapshot(profile.org_id);
}

export function useDashboardData(profile: ProfileWithOrganization | null) {
  return useQuery({
    queryKey: ['dashboard', profile?.id, profile?.role, profile?.org_id],
    enabled: Boolean(profile),
    staleTime: 30_000,
    queryFn: () => loadSnapshot(profile as ProfileWithOrganization),
  });
}
