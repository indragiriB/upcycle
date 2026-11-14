import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDepositPhotoSignedUrl } from '@/lib/deposit-storage';
import { getPaymentProofSignedUrl } from '@/lib/payment-proof';
import type {
  DepositMethod,
  DepositRecord,
  PaymentMethod,
} from '@/types/database';

export const DEPOSITS_KEY = 'deposits';

const DEPOSIT_PAGE_SIZE = 30;

const DEPOSIT_SELECT = `
  *,
  profiles(nama),
  deposit_items(
    id, deposit_id, waste_type_id, berat_final_kg, harga_per_kg,
    harga_acuan_per_kg, alasan_penyesuaian, subtotal, created_at,
    waste_types(nama, kode, ikon, warna, satuan)
  )
`;

export interface CreateDepositInput {
  id: string;
  wargaId: string;
  bsuId: string;
  metode: DepositMethod;
  nomorWa: string;
  lokasiUrl: string | null;
  lat: number | null;
  lng: number | null;
  alamat: string | null;
  estimasiJenis: string;
  estimasiBeratKg: number;
  catatan: string | null;
  fotoUrl: string | null;
}

export interface WeighingItemPayload {
  waste_type_id: string;
  berat_final: number;
  harga_per_kg: number;
  alasan_penyesuaian: string | null;
}

function readableError(error: { message: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

// Pagination server-side: setiap halaman mengambil 30 baris memakai range().
// Halaman UI memanggil fetchNextPage saat tombol "Muat lebih banyak" ditekan.
export function useWargaDeposits(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [DEPOSITS_KEY, 'warga', userId],
    enabled: Boolean(userId),
    staleTime: 15_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * DEPOSIT_PAGE_SIZE;
      const { data, error } = await supabase
        .from('deposits')
        .select(DEPOSIT_SELECT)
        .eq('warga_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + DEPOSIT_PAGE_SIZE - 1);

      if (error) throw error;
      return (data ?? []) as unknown as DepositRecord[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < DEPOSIT_PAGE_SIZE ? undefined : allPages.length,
  });
}

export function useBsuDeposits(orgId: string | null) {
  return useInfiniteQuery({
    queryKey: [DEPOSITS_KEY, 'bsu', orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * DEPOSIT_PAGE_SIZE;
      const { data, error } = await supabase
        .from('deposits')
        .select(DEPOSIT_SELECT)
        .eq('bsu_id', orgId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + DEPOSIT_PAGE_SIZE - 1);

      if (error) throw error;
      return (data ?? []) as unknown as DepositRecord[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < DEPOSIT_PAGE_SIZE ? undefined : allPages.length,
  });
}

export function useDepositDetail(depositId: string | undefined) {
  return useQuery({
    queryKey: [DEPOSITS_KEY, 'detail', depositId],
    enabled: Boolean(depositId),
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposits')
        .select(DEPOSIT_SELECT)
        .eq('id', depositId)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as DepositRecord | null) ?? null;
    },
  });
}

export function useDepositPhoto(path: string | null | undefined) {
  return useQuery({
    queryKey: ['deposit-photo', path],
    enabled: Boolean(path),
    staleTime: 45 * 60_000,
    queryFn: () => getDepositPhotoSignedUrl(path as string),
  });
}

export function usePaymentProof(path: string | null | undefined) {
  return useQuery({
    queryKey: ['payment-proof', path],
    enabled: Boolean(path),
    staleTime: 45 * 60_000,
    queryFn: () => getPaymentProofSignedUrl(path as string),
  });
}

export function useSetPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { depositId: string; path: string }) => {
      const { error } = await supabase.rpc('set_deposit_payment_proof', {
        p_deposit_id: input.depositId,
        p_path: input.path,
      });

      if (error) throw readableError(error, 'Bukti pembayaran gagal disimpan.');
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({
        queryKey: [DEPOSITS_KEY, 'detail', variables.depositId],
      });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useConfirmPaymentReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      depositId: string;
      terima: boolean;
      alasan?: string | null;
    }) => {
      const { error } = await supabase.rpc('confirm_payment_received', {
        p_deposit_id: input.depositId,
        p_terima: input.terima,
        p_alasan: input.alasan ?? null,
      });

      if (error) {
        throw readableError(error, 'Konfirmasi pembayaran gagal disimpan.');
      }
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({
        queryKey: [DEPOSITS_KEY, 'detail', variables.depositId],
      });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDepositInput) => {
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          id: input.id,
          warga_id: input.wargaId,
          bsu_id: input.bsuId,
          metode: input.metode,
          nomor_wa: input.nomorWa,
          lokasi_url: input.lokasiUrl,
          lat: input.lat,
          lng: input.lng,
          alamat: input.alamat,
          estimasi_jenis: input.estimasiJenis,
          estimasi_berat_kg: input.estimasiBeratKg,
          catatan: input.catatan,
          foto_url: input.fotoUrl,
        })
        .select('id')
        .single();

      if (error) throw readableError(error, 'Setoran gagal dibuat.');
      return data as { id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSchedulePickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { depositId: string; jadwal: string }) => {
      const { error } = await supabase.rpc('schedule_deposit_pickup', {
        p_deposit_id: input.depositId,
        p_jadwal: input.jadwal,
      });

      if (error) throw readableError(error, 'Jadwal penjemputan gagal disimpan.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCompleteWeighing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      depositId: string;
      items: WeighingItemPayload[];
      metodeBayar: PaymentMethod;
      potongan: number;
      alasanPotongan: string | null;
    }) => {
      const { error } = await supabase.rpc('complete_deposit_weighing', {
        p_deposit_id: input.depositId,
        p_items: input.items,
        p_metode_bayar: input.metodeBayar,
        p_potongan: input.potongan,
        p_alasan_potongan: input.alasanPotongan,
      });

      if (error) throw readableError(error, 'Hasil timbang gagal disimpan.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
}

export function useConfirmDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (depositId: string) => {
      const { error } = await supabase.rpc('confirm_deposit', {
        p_deposit_id: depositId,
      });

      if (error) throw readableError(error, 'Konfirmasi setoran gagal.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useSendDepositToBsi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (depositId: string) => {
      const { error } = await supabase.rpc('send_deposit_to_bsi', {
        p_deposit_id: depositId,
      });

      if (error) throw readableError(error, 'Data setoran gagal dikirim ke BSI.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
