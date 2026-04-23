'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError) {
              // Only toast if it's not a 401 (handled by client redirect)
              if (error.status !== 401) {
                toast.error(error.message);
              }
            } else {
              toast.error('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof ApiError) {
              if (error.status !== 401) {
                toast.error(error.message);
              }
            } else {
              toast.error('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            retry: 1,
            throwOnError: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
