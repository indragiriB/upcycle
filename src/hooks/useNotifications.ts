import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types/database';

export const NOTIFICATIONS_KEY = 'notifications';

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = [NOTIFICATIONS_KEY, userId];

  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, judul, pesan, tipe, link, dibaca, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ dibaca: true })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
      queryClient.setQueryData<AppNotification[]>(queryKey, (current) =>
        (current ?? []).map((item) =>
          item.id === id ? { ...item, dibaca: true } : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from('notifications')
        .update({ dibaca: true })
        .eq('user_id', userId)
        .eq('dibaca', false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
      queryClient.setQueryData<AppNotification[]>(queryKey, (current) =>
        (current ?? []).map((item) => ({ ...item, dibaca: true })),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((item) => !item.dibaca).length;

  return {
    ...query,
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  };
}
