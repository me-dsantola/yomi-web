'use client';

import { useQuery } from '@tanstack/react-query';
import type { YomiReleaseInfo } from '@/lib/github/releases';

export function useLiveRelease(initialRelease?: YomiReleaseInfo) {
  const { data } = useQuery<YomiReleaseInfo>({
    queryKey: ['yomi-latest-release'],
    queryFn: async () => {
      const res = await fetch('/api/release/latest', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Falha ao atualizar versão');
      return res.json();
    },
    placeholderData: initialRelease,
    staleTime: 60_000,

    retry: 1,
  });

  return data ?? initialRelease;
}
