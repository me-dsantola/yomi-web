import type {
  MangaDexChapter,
  MangaDexChapterPages,
  MangaDexWork,
} from './types';
import {
  CURATED_POPULAR_WORKS,
  findCuratedWorkById,
} from './curatedCatalog';

const TAG_TRANSLATIONS_PT: Record<string, string> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Comedy: 'Comédia',
  Drama: 'Drama',
  Fantasy: 'Fantasia',
  Horror: 'Terror',
  Mystery: 'Mistério',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Cotidiano',
  Sports: 'Esportes',
  Supernatural: 'Sobrenatural',
  Thriller: 'Suspense',
  'Long Strip': 'Webtoon',
  'Full Color': 'Colorido',
  Reincarnation: 'Reencarnação',
  'School Life': 'Escolar',
  Historical: 'Histórico',
  Monsters: 'Monstros',
  Demons: 'Demônios',
  'Martial Arts': 'Artes Marciais',
  Isekai: 'Isekai',
  'Award Winning': 'Premiado',
};

const PALETTE_SWATCHES = [
  '#FF2A55',
  '#8B5CF6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
];

function deterministicAccentFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return PALETTE_SWATCHES[Math.abs(hash) % PALETTE_SWATCHES.length];
}

function translateTagName(raw: string): string {
  return TAG_TRANSLATIONS_PT[raw] ?? raw;
}

function pickLocalizedString(
  map: Record<string, string> | undefined,
  fallback = ''
): string {
  if (!map || typeof map !== 'object') return fallback;
  return (
    map['pt-br'] ||
    map['pt'] ||
    map['en'] ||
    map['ja-ro'] ||
    map['ko-ro'] ||
    Object.values(map)[0] ||
    fallback
  );
}

/**
 * Resolve o título mais legível da obra buscando em `title` e `altTitles`
 * para evitar que obras como Solo Leveling apareçam apenas romanizadas (`Na Honjaman Level-Up`).
 */
export function resolveBestTitle(attr: {
  title?: Record<string, string>;
  altTitles?: Array<Record<string, string>>;
}): string {
  const titleMap = attr.title ?? {};
  if (titleMap['pt-br']?.trim()) return titleMap['pt-br'].trim();
  if (titleMap['en']?.trim()) return titleMap['en'].trim();

  const altList = Array.isArray(attr.altTitles) ? attr.altTitles : [];
  for (const alt of altList) {
    if (alt && typeof alt === 'object' && alt['en']?.trim()) {
      return alt['en'].trim();
    }
  }
  for (const alt of altList) {
    if (alt && typeof alt === 'object' && alt['pt-br']?.trim()) {
      return alt['pt-br'].trim();
    }
  }

  return (
    titleMap['pt']?.trim() ||
    titleMap['ja-ro']?.trim() ||
    titleMap['ko-ro']?.trim() ||
    Object.values(titleMap).find((v) => typeof v === 'string' && v.trim()) ||
    'Sem título'
  );
}

const LEGACY_ID_PREFIX_RE = /^(cmk_mdx_|hq_mdx_|ani_mdx_|mal_mdx_|cmk_title_)+/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanMangaDexId(rawId: string): string {
  return String(rawId ?? '').trim().replace(LEGACY_ID_PREFIX_RE, '');
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(String(value ?? '').trim());
}

export function buildWorkHref(mangaId: string, title?: string): string {
  const cleanId = cleanMangaDexId(mangaId) || String(mangaId ?? '').trim();
  const trimmedTitle = title?.trim();
  return trimmedTitle
    ? `/obra/${encodeURIComponent(cleanId)}?title=${encodeURIComponent(trimmedTitle)}`
    : `/obra/${encodeURIComponent(cleanId)}`;
}

function normalizeTitleKey(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function buildMangaCoverUrl(
  mangaId: string,
  coverFileName?: string,
  highRes = false
): string {
  const cleanId = cleanMangaDexId(mangaId);
  if (!cleanId || !coverFileName) {
    return '/brand/icon-1024.png';
  }
  const suffix = highRes ? '.512.jpg' : '.256.jpg';
  const upstreamUrl = `https://uploads.mangadex.org/covers/${cleanId}/${coverFileName}${suffix}`;
  return `/api/cover?url=${encodeURIComponent(upstreamUrl)}`;
}

export function resolveMangaEntryCoverUrl(
  manga?: {
    id?: string;
    title?: string;
    coverFileName?: string;
    directCoverUrl?: string;
    directHighResCoverUrl?: string;
  } | null,
  highRes = false
): string {
  if (!manga) {
    return '/brand/icon-1024.png';
  }

  const directRaw = (
    highRes
      ? manga.directHighResCoverUrl || manga.directCoverUrl
      : manga.directCoverUrl || manga.directHighResCoverUrl
  )?.trim();

  if (directRaw) {
    if (directRaw.startsWith('/api/cover') || directRaw.startsWith('/brand/')) {
      return directRaw;
    }
    if (directRaw.startsWith('https://')) {
      return `/api/cover?url=${encodeURIComponent(directRaw)}`;
    }
  }

  const cleanId = cleanMangaDexId(manga.id ?? '');
  if (manga.coverFileName && isUuid(cleanId)) {
    return buildMangaCoverUrl(cleanId, manga.coverFileName, highRes);
  }

  const curatedById = cleanId ? findCuratedWorkById(cleanId) : undefined;
  if (curatedById) {
    return highRes ? curatedById.coverHighResUrl : curatedById.coverUrl;
  }

  const titleKey = normalizeTitleKey(manga.title);
  if (titleKey) {
    const curatedByTitle = CURATED_POPULAR_WORKS.find(
      (item) =>
        normalizeTitleKey(item.title) === titleKey ||
        normalizeTitleKey(item.altTitle) === titleKey
    );
    if (curatedByTitle) {
      return highRes ? curatedByTitle.coverHighResUrl : curatedByTitle.coverUrl;
    }
  }

  return '/brand/icon-1024.png';
}

export function parseMangaDexEntity(raw: Record<string, any>): MangaDexWork {
  const id = String(raw.id ?? '');
  const attr = raw.attributes ?? {};
  const rels: Array<Record<string, any>> = Array.isArray(raw.relationships)
    ? raw.relationships
    : [];

  const curatedMatch = findCuratedWorkById(id);
  const title = curatedMatch?.title ?? resolveBestTitle(attr);

  const altTitles: Array<Record<string, string>> = Array.isArray(attr.altTitles)
    ? attr.altTitles
    : [];
  const altTitle =
    altTitles.find((t) => t['pt-br'])?.['pt-br'] ??
    altTitles.find((t) => t['en'])?.['en'];

  const description = pickLocalizedString(
    attr.description,
    curatedMatch?.description ?? 'Sinopse não informada na fonte.'
  );

  const coverRel = rels.find((r) => r.type === 'cover_art');
  const coverFileName: string | undefined =
    coverRel?.attributes?.fileName ?? curatedMatch?.coverFileName;

  const authorRel = rels.find((r) => r.type === 'author');
  const artistRel = rels.find((r) => r.type === 'artist');

  const tags: Array<{ id: string; name: string }> = Array.isArray(attr.tags)
    ? attr.tags
        .map((t: any) => ({
          id: String(t.id ?? ''),
          name: translateTagName(pickLocalizedString(t.attributes?.name, '')),
        }))
        .filter((t: { id: string; name: string }) => t.name.length > 0)
        .slice(0, 6)
    : curatedMatch?.tags ?? [];

  const lastCh = attr.lastChapter ? String(attr.lastChapter).trim() : '';

  return {
    id,
    title,
    altTitle,
    description,
    status: String(attr.status ?? curatedMatch?.status ?? 'ongoing'),
    year:
      typeof attr.year === 'number' ? attr.year : (curatedMatch?.year ?? null),
    contentRating: String(attr.contentRating ?? 'safe'),
    tags,
    author: String(
      authorRel?.attributes?.name ?? curatedMatch?.author ?? 'Autor desconhecido'
    ),
    artist: String(
      artistRel?.attributes?.name ??
        authorRel?.attributes?.name ??
        curatedMatch?.artist ??
        'Artista desconhecido'
    ),
    coverFileName,
    coverUrl: buildMangaCoverUrl(id, coverFileName, false),
    coverHighResUrl: buildMangaCoverUrl(id, coverFileName, true),
    accentColor: curatedMatch?.accentColor ?? deterministicAccentFromTitle(title),
    featuredChapterLabel:
      curatedMatch?.featuredChapterLabel ??
      (lastCh ? `Cap. ${lastCh}` : undefined),
  };
}

export interface SearchMangaOptions {
  query?: string;
  tagId?: string;
  order?: 'popular' | 'latest' | 'rating' | 'title';
  safeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function searchMangaCatalog(
  options: SearchMangaOptions = {}
): Promise<MangaDexWork[]> {
  const limit = options.limit ?? 48;
  const offset = options.offset ?? 0;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');
  params.set('hasAvailableChapters', 'true');

  if (options.safeOnly !== false) {
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
  } else {
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    params.append('contentRating[]', 'erotica');
  }

  const trimmedQuery = options.query?.trim() ?? '';
  if (trimmedQuery.length > 0) {
    params.set('title', trimmedQuery);
  }

  if (options.tagId) {
    params.append('includedTags[]', options.tagId);
  }

  const order = options.order ?? 'popular';
  if (order === 'popular') {
    params.set('order[followedCount]', 'desc');
  } else if (order === 'latest') {
    params.set('order[latestUploadedChapter]', 'desc');
  } else if (order === 'rating') {
    params.set('order[rating]', 'desc');
  } else if (order === 'title') {
    params.set('order[title]', 'asc');
  }

  try {
    const res = await fetch(`/api/md/manga?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const data = Array.isArray(json.data) ? json.data : [];
    const parsed = data.map(parseMangaDexEntity);

    if (
      !trimmedQuery &&
      !options.tagId &&
      order === 'popular' &&
      offset === 0
    ) {
      const merged: MangaDexWork[] = [...CURATED_POPULAR_WORKS];
      const seen = new Set(merged.map((w) => w.id));
      for (const work of parsed) {
        if (!seen.has(work.id)) {
          seen.add(work.id);
          merged.push(work);
        }
      }
      return merged.slice(0, limit);
    }

    return parsed;
  } catch (err) {
    // Fallback inteligente ao catálogo curado caso a API externa oscile
    const lowerQ = trimmedQuery.toLowerCase();
    let fallback = CURATED_POPULAR_WORKS;
    if (lowerQ) {
      fallback = fallback.filter(
        (w) =>
          w.title.toLowerCase().includes(lowerQ) ||
          (w.altTitle?.toLowerCase().includes(lowerQ) ?? false) ||
          w.author.toLowerCase().includes(lowerQ)
      );
    }
    if (options.tagId) {
      fallback = fallback.filter((w) =>
        w.tags.some((t) => t.id === options.tagId)
      );
    }
    if (fallback.length > 0) {
      return fallback.slice(offset, offset + limit);
    }
    throw err;
  }
}

export async function fetchMangaDetails(
  mangaId: string,
  fallbackTitle?: string
): Promise<MangaDexWork> {
  const cleanId = cleanMangaDexId(mangaId);

  if (isUuid(cleanId)) {
    const params = new URLSearchParams();
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');

    try {
      const res = await fetch(
        `/api/md/manga/${encodeURIComponent(cleanId)}?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          return parseMangaDexEntity(json.data);
        }
      }
    } catch {
      // Fallback below
    }
  }

  const curatedById = cleanId ? findCuratedWorkById(cleanId) : undefined;
  if (curatedById) {
    return curatedById;
  }

  const queryText = (
    fallbackTitle || (!isUuid(cleanId) ? cleanId.replace(/[_-]+/g, ' ') : '')
  ).trim();

  if (queryText) {
    const matches = await searchMangaCatalog({
      query: queryText,
      limit: 5,
      safeOnly: false,
    });
    if (matches.length > 0) {
      const targetKey = normalizeTitleKey(queryText);
      return (
        matches.find(
          (item) =>
            normalizeTitleKey(item.title) === targetKey ||
            normalizeTitleKey(item.altTitle) === targetKey
        ) ?? matches[0]
      );
    }
  }

  throw new Error('Obra não encontrada');
}

function parseChapterList(
  rawList: Array<Record<string, any>>
): MangaDexChapter[] {
  const out: MangaDexChapter[] = [];
  for (const item of rawList) {
    const attr = item.attributes ?? {};
    const pages = Number(attr.pages ?? 0);
    if (pages <= 0) continue;

    const rels: Array<Record<string, any>> = Array.isArray(item.relationships)
      ? item.relationships
      : [];
    const groupRel = rels.find((r) => r.type === 'scanlation_group');
    const lang = String(attr.translatedLanguage ?? 'pt-br').toLowerCase();
    const num = String(attr.chapter ?? '0').trim();

    out.push({
      id: String(item.id),
      chapterNumber: num,
      title: String(attr.title ?? '').trim(),
      volume: attr.volume ? String(attr.volume) : null,
      language: lang === 'pt-br' ? 'PT-BR' : lang.toUpperCase(),
      pages,
      publishAt: String(attr.publishAt ?? ''),
      scanlationGroup: String(
        groupRel?.attributes?.name ?? 'Grupo de Tradução'
      ),
      externalUrl: attr.externalUrl ? String(attr.externalUrl) : null,
    });
  }
  return out;
}

/**
 * Busca capítulos utilizando preenchimento inteligente de lacunas (Smart Gap Filling)
 * idêntico ao aplicativo YOMI: prioriza PT-BR e preenche capítulos ausentes com EN (e ES fallback).
 */
export async function fetchMangaChapters(
  mangaId: string,
  direction: 'asc' | 'desc' = 'asc'
): Promise<MangaDexChapter[]> {
  const cleanId = cleanMangaDexId(mangaId);
  if (!isUuid(cleanId)) {
    return [];
  }

  const fetchLangFeed = async (lang?: string): Promise<MangaDexChapter[]> => {
    const params = new URLSearchParams();
    params.set('limit', '500');
    if (lang) {
      params.append('translatedLanguage[]', lang);
    }
    params.append('includes[]', 'scanlation_group');
    params.set('order[chapter]', direction);
    params.set('includeExternalUrl', '0');
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    params.append('contentRating[]', 'erotica');

    const res = await fetch(
      `/api/md/manga/${encodeURIComponent(cleanId)}/feed?${params.toString()}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    return parseChapterList(Array.isArray(json.data) ? json.data : []);
  };

  const [ptChapters, enChapters] = await Promise.all([
    fetchLangFeed('pt-br'),
    fetchLangFeed('en'),
  ]);

  const byChapterNum = new Map<string, MangaDexChapter>();
  for (const ch of ptChapters) {
    if (!byChapterNum.has(ch.chapterNumber)) {
      byChapterNum.set(ch.chapterNumber, ch);
    }
  }
  for (const ch of enChapters) {
    if (!byChapterNum.has(ch.chapterNumber)) {
      byChapterNum.set(ch.chapterNumber, ch);
    }
  }

  // Fallback adicional em espanhol/outros idiomas se PT-BR + EN vierem vazios
  if (byChapterNum.size === 0) {
    const esChapters = await fetchLangFeed('es');
    for (const ch of esChapters) {
      if (!byChapterNum.has(ch.chapterNumber)) {
        byChapterNum.set(ch.chapterNumber, ch);
      }
    }
  }

  const list = Array.from(byChapterNum.values());
  list.sort((a, b) => {
    const na = parseFloat(a.chapterNumber) || 0;
    const nb = parseFloat(b.chapterNumber) || 0;
    return direction === 'asc' ? na - nb : nb - na;
  });

  return list;
}

export async function fetchChapterMetaAndPages(
  chapterId: string
): Promise<{
  pages: MangaDexChapterPages;
  chapterInfo: {
    id: string;
    chapterNumber: string;
    title: string;
    language: string;
    scanlationGroup: string;
    mangaId?: string;
    mangaTitle?: string;
    mangaCoverFileName?: string;
  };
}> {
  const [metaRes, serverRes] = await Promise.all([
    fetch(
      `/api/md/chapter/${encodeURIComponent(
        chapterId
      )}?includes[]=scanlation_group&includes[]=manga`
    ),
    fetch(`/api/md/at-home/server/${encodeURIComponent(chapterId)}`),
  ]);

  if (!serverRes.ok) {
    throw new Error(`Servidor de páginas indisponível (${serverRes.status})`);
  }

  const serverJson = await serverRes.json();
  const metaJson = metaRes.ok ? await metaRes.json() : null;

  const attr = metaJson?.data?.attributes ?? {};
  const rels: Array<Record<string, any>> = Array.isArray(
    metaJson?.data?.relationships
  )
    ? metaJson.data.relationships
    : [];
  const groupRel = rels.find((r) => r.type === 'scanlation_group');
  const mangaRel = rels.find((r) => r.type === 'manga');

  return {
    pages: {
      chapterId,
      baseUrl: String(serverJson.baseUrl ?? 'https://uploads.mangadex.org'),
      hash: String(serverJson.chapter?.hash ?? ''),
      data: Array.isArray(serverJson.chapter?.data)
        ? serverJson.chapter.data
        : [],
      dataSaver: Array.isArray(serverJson.chapter?.dataSaver)
        ? serverJson.chapter.dataSaver
        : [],
    },
    chapterInfo: {
      id: chapterId,
      chapterNumber: String(attr.chapter ?? '1'),
      title: String(attr.title ?? ''),
      language:
        String(attr.translatedLanguage ?? 'pt-br').toLowerCase() === 'pt-br'
          ? 'PT-BR'
          : String(attr.translatedLanguage ?? 'EN').toUpperCase(),
      scanlationGroup: String(
        groupRel?.attributes?.name ?? 'Grupo de Tradução'
      ),
      mangaId: mangaRel?.id ? String(mangaRel.id) : undefined,
      mangaTitle: mangaRel?.attributes
        ? resolveBestTitle(mangaRel.attributes)
        : undefined,
    },
  };
}
