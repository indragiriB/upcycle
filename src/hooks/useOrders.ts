import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toNumber } from '@/lib/utils';
import { BSI_KEY } from '@/hooks/useBsi';
import type {
  OrderItemRecord,
  OrderStatus,
  PaymentMethod,
  PickupRecord,
  PickupStatus,
  StockOrder,
} from '@/types/database';

export const ORDERS_KEY = 'orders';

const ORDER_SELECT = `
  id, nomor, bsi_id, pengepul_id, dibuat_oleh, status, subtotal, total,
  metode_bayar, catatan, dibayar_at, selesai_at, created_at, updated_at,
  bsi:organizations!orders_bsi_id_fkey(nama, alamat, kota, telepon, lat, lng),
  pengepul:organizations!orders_pengepul_id_fkey(nama, alamat, kota, telepon, lat, lng),
  order_items(
    id, order_id, waste_type_id, berat_kg, harga_per_kg, subtotal, created_at,
    waste_types(nama, kode, kategori, ikon, warna, satuan)
  ),
  pickups(
    id, order_id, tipe, bsi_id, bsu_id, pengepul_id, jadwal, status, catatan,
    dibuat_oleh, selesai_at, created_at, updated_at,
    bsu:organizations!pickups_bsu_id_fkey(nama, alamat, kota, telepon, lat, lng),
    bsi:organizations!pickups_bsi_id_fkey(nama, alamat, kota, telepon, lat, lng),
    pengepul:organizations!pickups_pengepul_id_fkey(nama, alamat, kota, telepon, lat, lng)
  )
`;

function readableError(error: { message: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

function normalizeOrderItem(item: OrderItemRecord): OrderItemRecord {
  return {
    ...item,
    berat_kg: toNumber(item.berat_kg),
    harga_per_kg: toNumber(item.harga_per_kg),
    subtotal: toNumber(item.subtotal),
  };
}

function normalizePickup(pickup: PickupRecord): PickupRecord {
  return { ...pickup };
}

function normalizeOrder(order: StockOrder): StockOrder {
  return {
    ...order,
    subtotal: toNumber(order.subtotal),
    total: toNumber(order.total),
    order_items: [...(order.order_items ?? [])]
      .map(normalizeOrderItem)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    pickups: [...(order.pickups ?? [])]
      .map(normalizePickup)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
  };
}

const BSU_STOCK_PICKUP_SELECT = `
  id, order_id, tipe, bsi_id, bsu_id, pengepul_id, jadwal, status, catatan,
  dibuat_oleh, selesai_at, created_at, updated_at,
  bsi:organizations!pickups_bsi_id_fkey(nama),
  order:orders!pickups_order_id_fkey(nomor, total)
`;

export function useBsuStockPickups(orgId: string | null) {
  return useQuery({
    queryKey: [ORDERS_KEY, 'bsu-pickups', orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    queryFn: async (): Promise<PickupRecord[]> => {
      const { data, error } = await supabase
        .from('pickups')
        .select(BSU_STOCK_PICKUP_SELECT)
        .eq('bsu_id', orgId)
        .eq('tipe', 'bsi_ke_bsu')
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;

      return ((data ?? []) as unknown as PickupRecord[]).map((pickup) => ({
        ...pickup,
        order: pickup.order
          ? { ...pickup.order, total: toNumber(pickup.order.total) }
          : null,
      }));
    },
  });
}

export function useStockOrders(
  orgId: string | null,
  side: 'bsi' | 'pengepul',
) {
  return useQuery({
    queryKey: [ORDERS_KEY, side, orgId],
    enabled: Boolean(orgId),
    staleTime: 15_000,
    queryFn: async (): Promise<StockOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq(side === 'bsi' ? 'bsi_id' : 'pengepul_id', orgId)
        .order('created_at', { ascending: false })
        .limit(250);

      if (error) throw error;

      return ((data ?? []) as unknown as StockOrder[]).map(normalizeOrder);
    },
  });
}

export function useCreateStockOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      bsiId: string;
      items: Array<{ wasteTypeId: string; beratKg: number }>;
      catatan: string | null;
    }) => {
      const { data, error } = await supabase.rpc('create_stock_order', {
        p_bsi_id: input.bsiId,
        p_items: input.items.map((item) => ({
          waste_type_id: item.wasteTypeId,
          berat_kg: item.beratKg,
        })),
        p_catatan: input.catatan,
      });

      if (error) {
        throw readableError(error, 'Pesanan stok gagal dibuat.');
      }

      return data as { id: string; nomor: string } | null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: [BSI_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function usePayStockOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      metodeBayar: PaymentMethod;
    }) => {
      const { error } = await supabase.rpc('pay_stock_order', {
        p_order_id: input.orderId,
        p_metode_bayar: input.metodeBayar,
      });

      if (error) {
        throw readableError(error, 'Pembayaran pesanan gagal disimpan.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['cash'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCancelStockOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('cancel_stock_order', {
        p_order_id: orderId,
      });

      if (error) {
        throw readableError(error, 'Pesanan gagal dibatalkan.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: [BSI_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useScheduleOrderPickup(side: 'bsi' | 'pengepul') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { orderId: string; jadwal: string }) => {
      const { error } = await supabase.rpc(
        side === 'bsi'
          ? 'schedule_order_bsu_pickup'
          : 'schedule_order_pengepul_pickup',
        {
          p_order_id: input.orderId,
          p_jadwal: input.jadwal,
        },
      );

      if (error) {
        throw readableError(error, 'Jadwal pengambilan gagal disimpan.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: [BSI_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      pickupId: string;
      status: PickupStatus;
    }) => {
      const { error } = await supabase.rpc('update_pickup_status', {
        p_pickup_id: input.pickupId,
        p_status: input.status,
      });

      if (error) {
        throw readableError(error, 'Status pengambilan gagal diperbarui.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [BSI_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['deposits'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function activeOrderStatuses(): OrderStatus[] {
  return ['menunggu_pembayaran', 'dibayar', 'diproses'];
}
