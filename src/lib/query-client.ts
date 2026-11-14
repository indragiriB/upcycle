import { QueryCache, QueryClient } from '@tanstack/react-query';
import { captureError } from '@/lib/monitoring';

export const queryClient = new QueryClient({
  // Laporkan kegagalan query ke monitoring tanpa mengubah perilaku retry.
  queryCache: new QueryCache({
    onError: (error) => captureError(error, { source: 'react-query' }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
