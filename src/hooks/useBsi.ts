import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toNumber } from '@/lib/utils';
import type {
  BsiIncomingDeposit,
  BsiStockLot,
  BsiStockSummary,
  DepositItem,
} from '@/types/database';

export const BSI_KEY = 'bsi';

const INCOMING_SELECT = `
  id, warga_id, warga_nama, bsu_id, bsu_nama, bsi_id, metode, metode_bayar,
  estimasi_jenis, estimasi_berat_kg, status, total, potongan, alasan_potongan,
  jadwal, created_at, updated_at, dicek_at, dibayar_at, dikonfirmasi_at,
  dikirim_ke_bsi_at, dipublikasikan_at, diambil_bsi_at, diambil_pengepul_at
`;

const INCOMING_ITEM_SELECT = `
  id, deposit_id, waste_type_id, berat_final_kg, harga_per_kg,
  harga_acuan_per_kg, alasan_penyesuaian, subtotal, created_at,
  waste_types(nama, kode, ikon, warna, satuan)
`;

const STOCK_SUMMARY_SELECT = `
  bsi_id, bsi_nama, waste_type_id, waste_nama, waste_kode, kategori, ikon,
  warna, satuan, berat_tersedia_kg, jumlah_bsu, harga_jual_per_kg
`;

const STOCK_LOT_SELECT = `
  id, bsi_id, bsu_id, deposit_id, deposit_item_id, waste_type_id,
  berat_awal_kg, berat_tersedia_kg, status, published_at, created_at,
  updated_at, waste_types(nama, kode, kategori, ikon, warna, satuan),
  bsu:organizations!bsi_stock_bsu_id_fkey(nama, alamat, kota, telepon, lat, lng)
`;

function readableError(error: { message: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

function normalizeIncoming(
  row: Omit<BsiIncomingDeposit, 'berat_final_kg'>,
  beratFinal: number,
): BsiIncomingDeposit {
  return {
    ...row,
    estimasi_berat_kg: toNumber(row.estimasi_berat_kg),
    total: toNumber(row.total),
    potongan: toNumber(row.potongan),
    berat_final_kg: beratFinal,
  };
}

function normalizeStockSummary(row: BsiStockSummary): BsiStockSummary {
  return {
    ...row,
    berat_tersedia_kg: toNumber(row.berat_tersedia_kg),
    jumlah_bsu: toNumber(row.jumlah_bsu),
    harga_jual_per_kg:
      row.harga_jual_per_kg === null ? null : toNumber(row.harga_jual_per_kg),
  };
}

export function useBsiIncomingDeposits(orgId: string | null) {
  return useQuery({
    queryKey: [BSI_KEY, 'incoming', orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    queryFn: async (): Promise<BsiIncomingDeposit[]> => {
      const { data, error } = await supabase
        .from('v_bsi_incoming_deposits')
        .select(INCOMING_SELECT)
        .eq('bsi_id', orgId)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<
        Omit<BsiIncomingDeposit, 'berat_final_kg'>
      >;
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      const itemsResult = await supabase
        .from('deposit_items')
        .select('deposit_id, berat_final_kg')
        .in('deposit_id', ids);

      if (itemsResult.error) throw itemsResult.error;

      const weightByDeposit = new Map<string, number>();
      for (const item of (itemsResult.data ?? []) as Array<{
        deposit_id: string;
        berat_final_kg: unknown;
      }>) {
        weightByDeposit.set(
          item.deposit_id,
          (weightByDeposit.get(item.deposit_id) ?? 0) +
            toNumber(item.berat_final_kg),
        );
      }

      return rows.map((row) =>
        normalizeIncoming(
          row,
          weightByDeposit.get(row.id) ?? toNumber(row.estimasi_berat_kg),
        ),
      );
    },
  });
}

export function useBsiIncomingDeposit(depositId: string | undefined) {
  return useQuery({
    queryKey: [BSI_KEY, 'incoming-detail', depositId],
    enabled: Boolean(depositId),
    staleTime: 15_000,
    queryFn: async (): Promise<BsiIncomingDeposit | null> => {
      const { data, error } = await supabase
        .from('v_bsi_incoming_deposits')
        .select(INCOMING_SELECT)
        .eq('id', depositId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as Omit<BsiIncomingDeposit, 'berat_final_kg'>;
      const itemsResult = await supabase
        .from('deposit_items')
        .select('berat_final_kg')
        .eq('deposit_id', depositId);

      if (itemsResult.error) throw itemsResult.error;

      const finalWeight = (itemsResult.data ?? []).reduce(
        (total, item) => total + toNumber(item.berat_final_kg),
        0,
      );

      return normalizeIncoming(
        row,
        finalWeight > 0 ? finalWeight : toNumber(row.estimasi_berat_kg),
      );
    },
  });
}

export function useBsiDepositItems(depositId: string | undefined) {
  return useQuery({
    queryKey: [BSI_KEY, 'incoming-items', depositId],
    enabled: Boolean(depositId),
    staleTime: 15_000,
    queryFn: async (): Promise<DepositItem[]> => {
      const { data, error } = await supabase
        .from('deposit_items')
        .select(INCOMING_ITEM_SELECT)
        .eq('deposit_id', depositId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return ((data ?? []) as unknown as DepositItem[]).map((item) => ({
        ...item,
        berat_final_kg: toNumber(item.berat_final_kg),
        harga_per_kg: toNumber(item.harga_per_kg),
        harga_acuan_per_kg: toNumber(item.harga_acuan_per_kg),
        subtotal: toNumber(item.subtotal),
      }));
    },
  });
}

export function usePublishDepositToStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (depositId: string) => {
      const { error } = await supabase.rpc('publish_deposit_to_stock', {
        p_deposit_id: depositId,
      });

      if (error) {
        throw readableError(error, 'Stok gagal dipublikasikan.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BSI_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['deposits'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useBsiStockSummary(orgId: string | null) {
  return useQuery({
    queryKey: ['stock', 'summary', orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    queryFn: async (): Promise<BsiStockSummary[]> => {
      const { data, error } = await supabase
        .from('v_bsi_stock_summary')
        .select(STOCK_SUMMARY_SELECT)
        .eq('bsi_id', orgId)
        .order('berat_tersedia_kg', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as BsiStockSummary[]).map(
        normalizeStockSummary,
      );
    },
  });
}

export function useBsiStockCatalog() {
  return useQuery({
    queryKey: ['stock', 'catalog'],
    staleTime: 15_000,
    queryFn: async (): Promise<BsiStockSummary[]> => {
      const { data, error } = await supabase
        .from('v_bsi_stock_summary')
        .select(STOCK_SUMMARY_SELECT)
        .order('bsi_nama', { ascending: true })
        .order('berat_tersedia_kg', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as BsiStockSummary[]).map(
        normalizeStockSummary,
      );
    },
  });
}

export function useBsiStockLots(orgId: string | null) {
  return useQuery({
    queryKey: ['stock', 'lots', orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    queryFn: async (): Promise<BsiStockLot[]> => {
      const { data, error } = await supabase
        .from('bsi_stock')
        .select(STOCK_LOT_SELECT)
        .eq('bsi_id', orgId)
        .order('published_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      return ((data ?? []) as unknown as BsiStockLot[]).map((lot) => ({
        ...lot,
        berat_awal_kg: toNumber(lot.berat_awal_kg),
        berat_tersedia_kg: toNumber(lot.berat_tersedia_kg),
      }));
    },
  });
}
