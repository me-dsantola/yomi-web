'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { YomiMangaEntry } from '@/lib/backup/kuroCodec';
import {
  buildMangaCoverUrl,
  cleanMangaDexId,
  fetchMangaCoversByIds,
  isUuid,
  resolveMangaEntryCoverUrl,
} from '@/lib/mangadex/api';

/**
 * Resolve em lote capas ausentes de entradas legadas/cloud (ex.: leituras web
 * antigas salvas sem coverFileName) consultando `/api/md/manga?ids[]=...`.
 */
export function useResolvedCovers(entries: YomiMangaEntry[]) {
  const missingUuidIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!entry?.id) continue;
      if (resolveMangaEntryCoverUrl(entry, false) !== '/brand/icon-1024.png') {
        continue;
      }
      const cleanId = cleanMangaDexId(entry.id);
      if (isUuid(cleanId)) {
        ids.add(cleanId);
      }
    }
    return Array.from(ids).sort();
  }, [entries]);

  const queryKeyId = missingUuidIds.join(',');

  const { data: resolvedMap } = useQuery({
    queryKey: ['yomi-missing-covers', queryKeyId],
    queryFn: () => fetchMangaCoversByIds(missingUuidIds),
    enabled: missingUuidIds.length > 0,
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const getCoverUrl = useCallback(
    (entry: YomiMangaEntry, highRes = false): string => {
      const direct = resolveMangaEntryCoverUrl(entry, highRes);
      if (direct !== '/brand/icon-1024.png') {
        return direct;
      }
      const cleanId = cleanMangaDexId(entry.id);
      const hit = resolvedMap?.[cleanId];
      if (hit?.coverFileName) {
        return buildMangaCoverUrl(cleanId, hit.coverFileName, highRes);
      }
      return '/brand/icon-1024.png';
    },
    [resolvedMap]
  );

  return { getCoverUrl };
}
