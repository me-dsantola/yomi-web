import { cleanMangaDexId } from '@/lib/mangadex/api';
import {
  CURATED_POPULAR_WORKS,
  findCuratedWorkById,
} from '@/lib/mangadex/curatedCatalog';
import type { MangaDexWork } from '@/lib/mangadex/types';
import type { ParsedYomiCloudState } from '@/lib/firebase/cloudSync';

export type HomeRecommendationReasonType =
  | 'because_read'
  | 'similar_favorite'
  | 'favorite_genre'
  | 'discover_different';

export interface HomeRecommendationItem {
  work: MangaDexWork;
  reasonLabel: string;
  reasonType: HomeRecommendationReasonType;
  matchedGenres: string[];
}

export interface HomeRecommendationsResult {
  hasPersonalSignals: boolean;
  topGenres: string[];
  anchorWorkTitle: string | null;
  items: HomeRecommendationItem[];
  discoveryWorks: MangaDexWork[];
}

const DEFAULT_DISCOVERY_GENRES = [
  'Ação',
  'Fantasia',
  'Webtoon',
  'Romance',
  'Drama',
];

const GENRE_ALIAS_MAP: Record<string, string> = {
  action: 'Ação',
  acao: 'Ação',
  'ação': 'Ação',
  adventure: 'Aventura',
  aventura: 'Aventura',
  comedy: 'Comédia',
  comedia: 'Comédia',
  'comédia': 'Comédia',
  drama: 'Drama',
  fantasy: 'Fantasia',
  fantasia: 'Fantasia',
  'dark fantasy': 'Fantasia Sombria',
  'fantasia sombria': 'Fantasia Sombria',
  horror: 'Terror',
  terror: 'Terror',
  mystery: 'Mistério',
  misterio: 'Mistério',
  'mistério': 'Mistério',
  psychological: 'Psicológico',
  psicologico: 'Psicológico',
  'psicológico': 'Psicológico',
  romance: 'Romance',
  'sci-fi': 'Sci-Fi',
  scifi: 'Sci-Fi',
  'slice of life': 'Cotidiano',
  cotidiano: 'Cotidiano',
  sports: 'Esportes',
  esportes: 'Esportes',
  supernatural: 'Sobrenatural',
  sobrenatural: 'Sobrenatural',
  'long strip': 'Webtoon',
  webtoon: 'Webtoon',
  manhwa: 'Webtoon',
  isekai: 'Isekai',
  historical: 'Histórico',
  historico: 'Histórico',
  'histórico': 'Histórico',
  samurai: 'Samurai',
  seinen: 'Seinen',
};

function normalizeGenreLabel(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const mapped = GENRE_ALIAS_MAP[cleaned.toLowerCase()];
  if (mapped) return mapped;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function normalizeTagKey(label: string): string {
  return normalizeGenreLabel(label).toLowerCase();
}

function resolveUserMangaTags(
  mangaId: string,
  explicitTags?: string[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const pushTag = (raw: string) => {
    const normalized = normalizeGenreLabel(raw);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(normalized);
    }
  };

  for (const tag of explicitTags ?? []) {
    pushTag(tag);
  }

  if (out.length === 0) {
    const cleanId = cleanMangaDexId(mangaId);
    const curated = cleanId ? findCuratedWorkById(cleanId) : undefined;
    for (const tag of curated?.tags ?? []) {
      pushTag(tag.name);
    }
  }

  return out;
}

/**
 * Gera recomendações personalizadas ou estado honesto de descoberta usando exclusivamente
 * histórico real, favoritos, listas de leitura e gêneros preferidos do usuário na nuvem.
 */
export function buildHomeRecommendations(
  cloudState: ParsedYomiCloudState | null | undefined,
  showcaseWorks: MangaDexWork[],
  catalogPool: MangaDexWork[] = CURATED_POPULAR_WORKS,
  maxItems = 5
): HomeRecommendationsResult {
  const showcaseIds = new Set(
    showcaseWorks.map((w) => cleanMangaDexId(w.id) || w.id)
  );

  const nonShowcasePool = catalogPool.filter((work) => {
    const cleanId = cleanMangaDexId(work.id) || work.id;
    return !showcaseIds.has(cleanId);
  });

  if (!cloudState) {
    return {
      hasPersonalSignals: false,
      topGenres: DEFAULT_DISCOVERY_GENRES,
      anchorWorkTitle: null,
      items: [],
      discoveryWorks: (nonShowcasePool.length > 0
        ? nonShowcasePool
        : catalogPool
      ).slice(0, 10),
    };
  }

  const recentReads = cloudState.recentReads ?? [];
  const favorites = cloudState.favorites ?? [];
  const readingListMangas = (cloudState.readingLists ?? []).flatMap(
    (list) => list.mangas ?? []
  );

  const hasCustomFavoriteGenre =
    Boolean(cloudState.updatedAtLocal?.trim()) &&
    Boolean(cloudState.profile?.favoriteGenre?.trim());

  const excludeIds = new Set<string>();
  for (const item of recentReads) {
    const cid = cleanMangaDexId(item.manga?.id ?? '');
    if (cid) excludeIds.add(cid);
  }
  for (const fav of favorites) {
    const cid = cleanMangaDexId(fav.id ?? '');
    if (cid) excludeIds.add(cid);
  }
  for (const item of readingListMangas) {
    const cid = cleanMangaDexId(item.id ?? '');
    if (cid) excludeIds.add(cid);
  }

  const genreData = new Map<
    string,
    {
      label: string;
      score: number;
      readSourceTitle?: string;
      favSourceTitle?: string;
      fromProfileGenre?: boolean;
    }
  >();

  const bumpGenre = (
    rawLabel: string,
    weight: number,
    meta: {
      readSourceTitle?: string;
      favSourceTitle?: string;
      fromProfileGenre?: boolean;
    }
  ) => {
    const label = normalizeGenreLabel(rawLabel);
    if (!label) return;
    const key = label.toLowerCase();
    const existing = genreData.get(key) ?? { label, score: 0 };
    existing.score += weight;
    if (meta.readSourceTitle && !existing.readSourceTitle) {
      existing.readSourceTitle = meta.readSourceTitle;
    }
    if (meta.favSourceTitle && !existing.favSourceTitle) {
      existing.favSourceTitle = meta.favSourceTitle;
    }
    if (meta.fromProfileGenre) {
      existing.fromProfileGenre = true;
    }
    genreData.set(key, existing);
  };

  for (const item of recentReads) {
    const tags = resolveUserMangaTags(item.manga.id, item.manga.tags);
    for (const tag of tags) {
      bumpGenre(tag, 3, { readSourceTitle: item.manga.title });
    }
  }

  for (const fav of favorites) {
    const tags = resolveUserMangaTags(fav.id, fav.tags);
    for (const tag of tags) {
      bumpGenre(tag, 2, { favSourceTitle: fav.title });
    }
  }

  for (const item of readingListMangas) {
    const tags = resolveUserMangaTags(item.id, item.tags);
    for (const tag of tags) {
      bumpGenre(tag, 1.5, { favSourceTitle: item.title });
    }
  }

  if (hasCustomFavoriteGenre && cloudState.profile?.favoriteGenre) {
    const parts = cloudState.profile.favoriteGenre
      .split(/[,/|&•·]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      bumpGenre(part, 1.5, { fromProfileGenre: true });
    }
  }

  const discoveryCandidates = nonShowcasePool.filter((work) => {
    const cid = cleanMangaDexId(work.id) || work.id;
    return !excludeIds.has(cid);
  });
  const baseDiscovery =
    discoveryCandidates.length >= 5
      ? discoveryCandidates
      : nonShowcasePool.length > 0
        ? nonShowcasePool
        : catalogPool;

  if (genreData.size === 0) {
    return {
      hasPersonalSignals: false,
      topGenres: DEFAULT_DISCOVERY_GENRES,
      anchorWorkTitle: null,
      items: [],
      discoveryWorks: baseDiscovery.slice(0, 10),
    };
  }

  const rankedGenres = Array.from(genreData.values()).sort(
    (a, b) => b.score - a.score
  );
  const topGenres = rankedGenres.slice(0, 5).map((g) => g.label);
  const anchorWorkTitle =
    recentReads[0]?.manga?.title ?? favorites[0]?.title ?? null;

  const candidateWorks = catalogPool.filter((work) => {
    const cid = cleanMangaDexId(work.id) || work.id;
    return !excludeIds.has(cid);
  });

  const scored = candidateWorks
    .map((work) => {
      const cid = cleanMangaDexId(work.id) || work.id;
      const inShowcase = showcaseIds.has(cid);
      const workTags = work.tags.map((t) => normalizeGenreLabel(t.name));
      const matchedEntries: Array<{
        label: string;
        score: number;
        readSourceTitle?: string;
        favSourceTitle?: string;
        fromProfileGenre?: boolean;
      }> = [];

      let affinityScore = 0;
      for (const tagLabel of workTags) {
        const entry = genreData.get(normalizeTagKey(tagLabel));
        if (entry) {
          affinityScore += entry.score;
          matchedEntries.push({
            label: tagLabel,
            score: entry.score,
            readSourceTitle: entry.readSourceTitle,
            favSourceTitle: entry.favSourceTitle,
            fromProfileGenre: entry.fromProfileGenre,
          });
        }
      }

      matchedEntries.sort((a, b) => b.score - a.score);
      const primaryMatch = matchedEntries[0];

      let reasonType: HomeRecommendationReasonType = 'favorite_genre';
      let reasonLabel = '';
      if (primaryMatch?.readSourceTitle) {
        reasonType = 'because_read';
        reasonLabel = `Porque você leu ${primaryMatch.readSourceTitle}`;
      } else if (primaryMatch?.favSourceTitle) {
        reasonType = 'similar_favorite';
        reasonLabel = `Semelhante a ${primaryMatch.favSourceTitle}`;
      } else if (primaryMatch) {
        reasonType = 'favorite_genre';
        reasonLabel = `Baseado em ${primaryMatch.label}`;
      }

      return {
        work,
        inShowcase,
        affinityScore,
        matchedGenres: matchedEntries.map((m) => m.label),
        reasonType,
        reasonLabel,
      };
    })
    .filter((entry) => entry.affinityScore > 0);

  scored.sort((a, b) => {
    if (a.inShowcase !== b.inShowcase) return a.inShowcase ? 1 : -1;
    return b.affinityScore - a.affinityScore;
  });

  const targetAffinityCount = Math.max(1, maxItems - 1);
  const pickedItems: HomeRecommendationItem[] = scored
    .slice(0, targetAffinityCount)
    .map((entry) => ({
      work: entry.work,
      reasonLabel: entry.reasonLabel,
      reasonType: entry.reasonType,
      matchedGenres: entry.matchedGenres,
    }));

  const pickedIds = new Set(
    pickedItems.map((i) => cleanMangaDexId(i.work.id) || i.work.id)
  );

  // Seleciona 1 sugestão de diversidade de gêneros menos explorados (fora de favoritos/showcase)
  const topGenreKeys = new Set(topGenres.slice(0, 2).map(normalizeTagKey));
  const diversityPool = candidateWorks.filter((work) => {
    const cid = cleanMangaDexId(work.id) || work.id;
    return !pickedIds.has(cid);
  });

  diversityPool.sort((a, b) => {
    const aCid = cleanMangaDexId(a.id) || a.id;
    const bCid = cleanMangaDexId(b.id) || b.id;
    const aShowcase = showcaseIds.has(aCid) ? 1 : 0;
    const bShowcase = showcaseIds.has(bCid) ? 1 : 0;
    if (aShowcase !== bShowcase) return aShowcase - bShowcase;

    const aOverlap = a.tags.filter((t) =>
      topGenreKeys.has(normalizeTagKey(t.name))
    ).length;
    const bOverlap = b.tags.filter((t) =>
      topGenreKeys.has(normalizeTagKey(t.name))
    ).length;
    return aOverlap - bOverlap;
  });

  const diversityPick = diversityPool[0];
  if (diversityPick && pickedItems.length < maxItems) {
    pickedItems.push({
      work: diversityPick,
      reasonType: 'discover_different',
      reasonLabel: `Descubra algo diferente • ${
        diversityPick.tags[0]?.name || 'Catálogo'
      }`,
      matchedGenres: diversityPick.tags.slice(0, 2).map((t) => t.name),
    });
  }

  if (pickedItems.length === 0) {
    return {
      hasPersonalSignals: false,
      topGenres: DEFAULT_DISCOVERY_GENRES,
      anchorWorkTitle: null,
      items: [],
      discoveryWorks: baseDiscovery.slice(0, 10),
    };
  }

  return {
    hasPersonalSignals: true,
    topGenres,
    anchorWorkTitle,
    items: pickedItems.slice(0, maxItems),
    discoveryWorks: baseDiscovery.slice(0, 10),
  };
}
