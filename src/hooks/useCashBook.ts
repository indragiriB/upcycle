import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toNumber } from '@/lib/utils';
import type { CashBalance, LedgerEntry } from '@/types/database';

export const CASH_KEY = 'cash';

export interface CashBookData {
  balance: CashBalance | null;
  entries: LedgerEntry[];
}

function readableError(error: { message: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

export function useCashBook(orgId: string | null) {
  return useQuery({
    queryKey: [CASH_KEY, orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    queryFn: async (): Promise<CashBookData> => {
      const [balanceResult, entriesResult] = await Promise.all([
        supabase
          .from('v_org_cash_balance')
          .select('org_id, org_nama, tipe, total_masuk, total_keluar, saldo')
          .eq('org_id', orgId)
          .maybeSingle(),
        supabase
          .from('ledger_entries')
          .select(
            'id, org_id, arah, kategori, jumlah, ref_type, ref_id, keterangan, dicatat_oleh, tanggal, created_at, profiles(nama)',
          )
          .eq('org_id', orgId)
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(400),
      ]);

      if (balanceResult.error) throw balanceResult.error;
      if (entriesResult.error) throw entriesResult.error;

      const rawBalance = balanceResult.data as
        | {
            org_id: string;
            org_nama: string;
            tipe: CashBalance['tipe'];
            total_masuk: unknown;
            total_keluar: unknown;
            saldo: unknown;
          }
        | null;

      return {
        balance: rawBalance
          ? {
              ...rawBalance,
              total_masuk: toNumber(rawBalance.total_masuk),
              total_keluar: toNumber(rawBalance.total_keluar),
              saldo: toNumber(rawBalance.saldo),
            }
          : null,
        entries: (entriesResult.data ?? []) as unknown as LedgerEntry[],
      };
    },
  });
}

export function useAddOperationalExpense(
  orgId: string | null,
  userId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      jumlah: number;
      tanggal: string;
      keterangan: string;
    }) => {
      if (!orgId) throw new Error('Akun ini belum terhubung ke organisasi.');

      const { error } = await supabase.from('ledger_entries').insert({
        org_id: orgId,
        arah: 'keluar',
        kategori: 'operasional',
        jumlah: input.jumlah,
        ref_type: null,
        ref_id: null,
        keterangan: input.keterangan,
        dicatat_oleh: userId,
        tanggal: input.tanggal,
      });

      if (error) throw readableError(error, 'Biaya operasional gagal dicatat.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CASH_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCorrectLedgerEntry(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { entryId: string; alasan: string }) => {
      const { error } = await supabase.rpc('correct_ledger_entry', {
        p_entry_id: input.entryId,
        p_alasan: input.alasan,
      });

      if (error) throw readableError(error, 'Koreksi kas gagal disimpan.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CASH_KEY, orgId] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
