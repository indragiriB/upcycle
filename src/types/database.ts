export type AppRole =
  | 'warga'
  | 'bsu'
  | 'bsi'
  | 'industri'
  | 'admin';

export type OrganizationType = 'bsu' | 'bsi' | 'industri';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type DepositMethod = 'jemput' | 'antar';
export type PaymentMethod = 'tunai' | 'transfer';
export type DepositStatus =
  | 'diajukan'
  | 'dijadwalkan'
  | 'dicek_dibayar'
  | 'dikonfirmasi'
  | 'dikirim_ke_bsi'
  | 'dipublikasikan'
  | 'dibeli_pengepul'
  | 'diambil_bsi'
  | 'diambil_pengepul';
export type PriceKind = 'beli' | 'jual';
export type LedgerDirection = 'masuk' | 'keluar';
export type StockStatus = 'tersedia' | 'habis';
export type OrderStatus =
  | 'menunggu_pembayaran'
  | 'dibayar'
  | 'diproses'
  | 'selesai'
  | 'dibatalkan';
export type PickupType = 'bsi_ke_bsu' | 'pengepul_ke_bsi';
export type PickupStatus =
  | 'dijadwalkan'
  | 'dalam_perjalanan'
  | 'selesai'
  | 'dibatalkan';

export interface Profile {
  id: string;
  nama: string;
  role: AppRole;
  org_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OrganizationSummary {
  id: string;
  nama: string;
  tipe: OrganizationType;
  status: VerificationStatus;
  kota: string | null;
  provinsi: string | null;
  alamat: string | null;
  telepon: string | null;
  email?: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  created_at: string;
}

export interface OrganizationAdminRecord extends OrganizationSummary {
  slug: string | null;
  email: string | null;
  verified_at: string | null;
  verified_by: string | null;
  updated_at: string;
}

export interface ProfileWithOrganization extends Profile {
  organizations: OrganizationSummary | null;
}

export interface AdminProfileRecord extends Profile {
  organizations: Pick<
    OrganizationSummary,
    'id' | 'nama' | 'tipe' | 'status'
  > | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  judul: string;
  pesan: string;
  tipe: string;
  link: string | null;
  dibaca: boolean;
  created_at: string;
}

export interface WasteType {
  id: string;
  nama: string;
  kode: string | null;
  kategori: string | null;
  deskripsi: string | null;
  ikon: string;
  warna: string;
  satuan: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveWastePrice {
  id: string;
  waste_type_id: string;
  waste_nama: string;
  waste_kode: string | null;
  kategori: string | null;
  ikon: string;
  warna: string;
  satuan: string;
  org_id: string;
  org_nama: string;
  org_tipe: OrganizationType;
  org_status: VerificationStatus;
  tipe: PriceKind;
  harga_per_kg: number;
  berlaku_mulai: string;
}

export interface WastePriceEntry {
  id: string;
  waste_type_id: string;
  org_id: string;
  tipe: PriceKind;
  harga_per_kg: number;
  berlaku_mulai: string;
  dibuat_oleh: string | null;
  created_at: string;
  waste_types?: Pick<
    WasteType,
    'nama' | 'kode' | 'kategori' | 'ikon' | 'warna' | 'satuan'
  > | null;
  profiles?: { nama: string } | null;
}

export interface DepositItem {
  id: string;
  deposit_id: string;
  waste_type_id: string;
  berat_final_kg: number;
  harga_per_kg: number;
  harga_acuan_per_kg: number;
  alasan_penyesuaian: string | null;
  subtotal: number;
  created_at: string;
  waste_types?: Pick<
    WasteType,
    'nama' | 'kode' | 'ikon' | 'warna' | 'satuan'
  > | null;
}

export interface DepositRecord {
  id: string;
  warga_id: string;
  bsu_id: string;
  bsi_id: string | null;
  metode: DepositMethod;
  metode_bayar: PaymentMethod | null;
  nomor_wa: string;
  lokasi_url: string | null;
  lat: number | null;
  lng: number | null;
  alamat: string | null;
  estimasi_jenis: string;
  estimasi_berat_kg: number;
  foto_url: string | null;
  status: DepositStatus;
  jadwal: string | null;
  catatan: string | null;
  total: number;
  potongan: number;
  alasan_potongan: string | null;
  created_at: string;
  updated_at: string;
  dijadwalkan_at: string | null;
  dicek_at: string | null;
  dibayar_at: string | null;
  dikonfirmasi_at: string | null;
  dikirim_ke_bsi_at: string | null;
  dipublikasikan_at: string | null;
  diambil_bsi_at: string | null;
  diambil_pengepul_at: string | null;
  profiles?: { nama: string } | null;
  deposit_items?: DepositItem[];
}

export interface LedgerEntry {
  id: string;
  org_id: string;
  arah: LedgerDirection;
  kategori: string;
  jumlah: number;
  ref_type: string | null;
  ref_id: string | null;
  keterangan: string | null;
  dicatat_oleh: string | null;
  tanggal: string;
  created_at: string;
  profiles?: { nama: string } | null;
}

export interface CashBalance {
  org_id: string;
  org_nama: string;
  tipe: OrganizationType;
  total_masuk: number;
  total_keluar: number;
  saldo: number;
}

export interface BsiIncomingDeposit {
  id: string;
  warga_id: string;
  warga_nama: string;
  bsu_id: string;
  bsu_nama: string;
  bsi_id: string;
  metode: DepositMethod;
  metode_bayar: PaymentMethod | null;
  estimasi_jenis: string;
  estimasi_berat_kg: number;
  status: DepositStatus;
  total: number;
  potongan: number;
  alasan_potongan: string | null;
  jadwal: string | null;
  created_at: string;
  updated_at: string;
  dicek_at: string | null;
  dibayar_at: string | null;
  dikonfirmasi_at: string | null;
  dikirim_ke_bsi_at: string | null;
  dipublikasikan_at: string | null;
  diambil_bsi_at: string | null;
  diambil_pengepul_at: string | null;
  berat_final_kg: number;
}

export interface BsiStockSummary {
  bsi_id: string;
  bsi_nama: string;
  waste_type_id: string;
  waste_nama: string;
  waste_kode: string | null;
  kategori: string | null;
  ikon: string;
  warna: string;
  satuan: string;
  berat_tersedia_kg: number;
  jumlah_bsu: number;
  harga_jual_per_kg: number | null;
}

export interface BsiStockLot {
  id: string;
  bsi_id: string;
  bsu_id: string;
  deposit_id: string;
  deposit_item_id: string;
  waste_type_id: string;
  berat_awal_kg: number;
  berat_tersedia_kg: number;
  status: StockStatus;
  published_at: string;
  created_at: string;
  updated_at: string;
  waste_types?: Pick<
    WasteType,
    'nama' | 'kode' | 'kategori' | 'ikon' | 'warna' | 'satuan'
  > | null;
  bsu?: OrganizationBrief | null;
}

export interface OrganizationBrief {
  nama: string;
  alamat: string | null;
  kota: string | null;
  telepon: string | null;
  lat: number | null;
  lng: number | null;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  waste_type_id: string;
  berat_kg: number;
  harga_per_kg: number;
  subtotal: number;
  created_at: string;
  waste_types?: Pick<
    WasteType,
    'nama' | 'kode' | 'kategori' | 'ikon' | 'warna' | 'satuan'
  > | null;
}

export interface PickupParty {
  nama: string;
  alamat?: string | null;
  kota?: string | null;
  telepon?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PickupRecord {
  id: string;
  order_id: string;
  tipe: PickupType;
  bsi_id: string;
  bsu_id: string | null;
  pengepul_id: string | null;
  jadwal: string;
  status: PickupStatus;
  catatan: string | null;
  dibuat_oleh: string;
  selesai_at: string | null;
  created_at: string;
  updated_at: string;
  bsu?: PickupParty | null;
  bsi?: PickupParty | null;
  pengepul?: PickupParty | null;
  order?: { nomor: string; total: number } | null;
}

export interface StockOrder {
  id: string;
  nomor: string;
  bsi_id: string;
  pengepul_id: string;
  dibuat_oleh: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  metode_bayar: PaymentMethod | null;
  catatan: string | null;
  dibayar_at: string | null;
  selesai_at: string | null;
  created_at: string;
  updated_at: string;
  bsi?: OrganizationBrief | null;
  pengepul?: OrganizationBrief | null;
  order_items?: OrderItemRecord[];
  pickups?: PickupRecord[];
}

export type ProductStatus = 'aktif' | 'nonaktif';
export type ProductCondition = 'bekas' | 'upcycle';
export type ProductOrderStatus =
  | 'menunggu_pembayaran'
  | 'dibayar'
  | 'dikirim'
  | 'selesai'
  | 'dibatalkan';

export interface ProductRecord {
  id: string;
  penjual_id: string;
  penjual_org_id: string | null;
  nama: string;
  deskripsi: string | null;
  kategori: string | null;
  kondisi: ProductCondition;
  harga: number;
  stok: number;
  satuan: string;
  foto_urls: string[];
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  penjual?: {
    id: string;
    nama: string;
    role: AppRole;
    avatar_url: string | null;
  } | null;
  org?: {
    id: string;
    nama: string;
    kota: string | null;
  } | null;
}

export interface ProductOrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  nama_produk: string;
  harga_satuan: number;
  jumlah: number;
  subtotal: number;
  kondisi_produk: ProductCondition;
  created_at: string;
  products?: { foto_urls: string[] } | null;
}

export interface ProductOrderParty {
  nama: string;
  alamat?: string | null;
  kota?: string | null;
  telepon?: string | null;
}

export interface ProductOrderRecord {
  id: string;
  nomor: string;
  pembeli_id: string;
  penjual_id: string;
  penjual_org_id: string | null;
  status: ProductOrderStatus;
  subtotal: number;
  total: number;
  metode_bayar: PaymentMethod | null;
  nomor_wa: string;
  alamat: string;
  catatan: string | null;
  dibayar_at: string | null;
  selesai_at: string | null;
  created_at: string;
  updated_at: string;
  pembeli?: { nama: string } | null;
  penjual?: { nama: string; role: AppRole } | null;
  penjual_org?: ProductOrderParty | null;
  product_order_items?: ProductOrderItemRecord[];
}

export type StatFormat = 'number' | 'currency' | 'weight';

export interface DashboardStat {
  key: string;
  label: string;
  value: number;
  format: StatFormat;
  hint: string;
  badge?: string;
}

export interface DashboardChartPoint {
  label: string;
  shortLabel: string;
  value: number;
  date: string;
}

export interface DashboardChartData {
  title: string;
  description: string;
  total: number;
  format: StatFormat;
  points: DashboardChartPoint[];
}

export type ChartRange = 7 | 30 | 90;
