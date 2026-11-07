import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  ActiveWastePrice,
  PriceKind,
  WastePriceEntry,
  WasteType,
} from '@/types/database';

export const PRICES_KEY = 'prices';
export const WASTE_TYPES_KEY = 'waste-types';

export function useActivePrices(
  orgId: string | null | undefined,
  tipe: PriceKind,
) {
  return useQuery({
    queryKey: [PRICES_KEY, 'active', tipe, orgId ?? 'all'],
    staleTime: 30_000,
    queryFn: async () => {
      let request = supabase
        .from('v_active_waste_prices')
        .select(
          'id, waste_type_id, waste_nama, waste_kode, kategori, ikon, warna, satuan, org_id, org_nama, org_tipe, org_status, tipe, harga_per_kg, berlaku_mulai',
        )
        .eq('tipe', tipe)
        .eq('org_status', 'verified')
        .order('waste_nama', { ascending: true })
        .order('harga_per_kg', { ascending: false });

      if (orgId) request = request.eq('org_id', orgId);

      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as ActiveWastePrice[];
    },
  });
}

export function useActiveBuyPrices(orgId?: string | null) {
  return useActivePrices(orgId, 'beli');
}

export function useActiveSellPrices(orgId?: string | null) {
  return useActivePrices(orgId, 'jual');
}

export function useWasteTypes() {
  return useQuery({
    queryKey: [WASTE_TYPES_KEY, 'active'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_types')
        .select(
          'id, nama, kode, kategori, deskripsi, ikon, warna, satuan, aktif, created_at, updated_at',
        )
        .eq('aktif', true)
        .order('nama', { ascending: true });

      if (error) throw error;
      return (data ?? []) as WasteType[];
    },
  });
}

export function useOrgPriceHistory(
  orgId: string | null,
  tipe: PriceKind,
) {
  return useQuery({
    queryKey: [PRICES_KEY, 'history', tipe, orgId],
    enabled: Boolean(orgId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_prices')
        .select(
          'id, waste_type_id, org_id, tipe, harga_per_kg, berlaku_mulai, dibuat_oleh, created_at, waste_types(nama, kode, kategori, ikon, warna, satuan), profiles(nama)',
        )
        .eq('org_id', orgId)
        .eq('tipe', tipe)
        .order('berlaku_mulai', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) throw error;
      return (data ?? []) as unknown as WastePriceEntry[];
    },
  });
}

export function useBsuPriceHistory(orgId: string | null) {
  return useOrgPriceHistory(orgId, 'beli');
}

export function useCreateWastePrice(
  orgId: string | null,
  userId: string,
  tipe: PriceKind = 'beli',
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      wasteTypeId: string;
      hargaPerKg: number;
      berlakuMulai: string;
    }) => {
      if (!orgId) {
        throw new Error('Akun ini belum terhubung ke organisasi.');
      }

      const { error } = await supabase.from('waste_prices').insert({
        waste_type_id: input.wasteTypeId,
        org_id: orgId,
        tipe,
        harga_per_kg: input.hargaPerKg,
        berlaku_mulai: input.berlakuMulai,
        dibuat_oleh: userId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRICES_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}
