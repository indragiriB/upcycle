import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  OFFLINE_QUEUE_EVENT,
  flushOfflineDeposits,
  listOfflineDeposits,
  type OfflineDeposit,
} from '@/lib/offline-deposits';

export function useOfflineDeposits(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<OfflineDeposit[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    try {
      setItems(await listOfflineDeposits(userId));
    } catch {
      setItems([]);
    }
  }, [userId]);

  const flush = useCallback(async () => {
    if (!userId || isFlushing) return;
    setIsFlushing(true);
    setMessage(null);
    try {
      const result = await flushOfflineDeposits(userId);
      await refresh();

      if (result.sent > 0) {
        void queryClient.invalidateQueries({ queryKey: ['deposits'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setMessage(
          `${result.sent} setoran offline berhasil dikirim${
            result.remaining > 0
              ? `, ${result.remaining} masih menunggu.`
              : '.'
          }`,
        );
      } else if (result.remaining > 0) {
        setMessage(
          'Setoran masih menunggu koneksi. Data tetap tersimpan di perangkat ini.',
        );
      }
    } catch {
      setMessage('Setoran offline belum bisa dikirim. Coba lagi nanti.');
    } finally {
      setIsFlushing(false);
    }
  }, [isFlushing, queryClient, refresh, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener(OFFLINE_QUEUE_EVENT, onChange);
    window.addEventListener('online', onChange);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_EVENT, onChange);
      window.removeEventListener('online', onChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    void flush();
    // Sengaja hanya saat pengguna berganti; pengiriman ulang berikutnya
    // dipicu event online atau tombol manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    items,
    count: items.length,
    isFlushing,
    message,
    flush,
    refresh,
  };
}
