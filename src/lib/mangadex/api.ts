import type {
  MangaDexChapter,
  MangaDexChapterPages,
  MangaDexChaptersResult,
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

const MANGADEX_FEED_PAGE_LIMIT = 500;
const MAX_FEED_ITEMS_PER_LANGUAGE = 2500;
const MAX_CONCURRENT_FEED_REQUESTS = 2;
const CHAPTERS_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 350;

const LANGUAGE_PRIORITY: Record<string, number> = {
  'PT-BR': 0,
  PT: 1,
  EN: 2,
  ES: 3,
};

export class MangaDexFeedError extends Error {
  readonly status?: number;
  readonly failedLanguages: string[];

  constructor(
    message: string,
    options: { status?: number; failedLanguages?: string[] } = {}
  ) {
    super(message);
    this.name = 'MangaDexFeedError';
    this.status = options.status;
    this.failedLanguages = options.failedLanguages ?? [];
  }
}

interface CachedChaptersEntry {
  expiresAt: number;
  ascResult: MangaDexChaptersResult;
}

const chaptersMemoryCache = new Map<string, CachedChaptersEntry>();

export function clearMangaChaptersCache(mangaId?: string): void {
  if (!mangaId) {
    chaptersMemoryCache.clear();
    return;
  }
  const cleanId = cleanMangaDexId(mangaId);
  for (const key of chaptersMemoryCache.keys()) {
    if (key.startsWith(`${cleanId}:`)) {
      chaptersMemoryCache.delete(key);
    }
  }
}

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
    map['es'] ||
    map['ja-ro'] ||
    map['ko-ro'] ||
    Object.values(map)[0] ||
    fallback
  );
}

function collectLocalizedValues(
  map: Record<string, string> | undefined,
  altList: Array<Record<string, string>>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (val: unknown) => {
    if (typeof val !== 'string') return;
    const trimmed = val.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  if (map && typeof map === 'object') {
    for (const v of Object.values(map)) push(v);
  }
  for (const alt of altList) {
    if (alt && typeof alt === 'object') {
      for (const v of Object.values(alt)) push(v);
    }
  }
  return out;
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
  if (titleMap['pt']?.trim()) return titleMap['pt'].trim();
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
  for (const alt of altList) {
    if (alt && typeof alt === 'object' && alt['pt']?.trim()) {
      return alt['pt'].trim();
    }
  }

  return (
    titleMap['es']?.trim() ||
    titleMap['ja-ro']?.trim() ||
    titleMap['ko-ro']?.trim() ||
    altList
      .map((alt) => (alt && typeof alt === 'object' ? alt['es'] : undefined))
      .find((v) => typeof v === 'string' && v.trim()) ||
    Object.values(titleMap).find((v) => typeof v === 'string' && v.trim()) ||
    'Sem título'
  );
}

const LEGACY_ID_PREFIX_RE =
  /^(cmk_mdx_|hq_mdx_|ani_mdx_|mal_mdx_|cmk_title_|ani_title_|mal_title_|kitsu_)+/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanMangaDexId(rawId: string): string {
  const stripped = String(rawId ?? '')
    .trim()
    .replace(LEGACY_ID_PREFIX_RE, '');
  if (!stripped || UUID_RE.test(stripped)) {
    return stripped;
  }
  try {
    const decoded = decodeURIComponent(stripped)
      .trim()
      .replace(LEGACY_ID_PREFIX_RE, '');
    return decoded || stripped;
  } catch {
    return stripped;
  }
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

export function normalizeTitleForMatch(value?: string): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['":;!?.,()[\]{}\-–—_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeTitle(normalized: string): string[] {
  return normalized
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Verifica se uma obra corresponde de fato ao título pesquisado, avaliando `title`,
 * `altTitle` e todos os `altTitles` — evitando associação errada por similaridade solta.
 */
export function matchesWorkTitle(
  work: Pick<MangaDexWork, 'title' | 'altTitle' | 'altTitles'>,
  rawQuery: string
): boolean {
  const qNorm = normalizeTitleForMatch(rawQuery);
  if (!qNorm) return false;
  const qTokens = tokenizeTitle(qNorm);
  if (qTokens.length === 0) return false;

  const candidates = [work.title, work.altTitle, ...(work.altTitles ?? [])]
    .map((c) => normalizeTitleForMatch(c))
    .filter(Boolean);

  for (const cand of candidates) {
    if (cand === qNorm) return true;

    const cTokens = tokenizeTitle(cand);
    if (cTokens.length === 0) continue;

    if (qTokens.length === 1) {
      const target = qTokens[0];
      if (cand.startsWith(target)) return true;
      if (cTokens.includes(target) && cTokens.length <= 4) return true;
      continue;
    }

    let matched = 0;
    for (const qt of qTokens) {
      const hit = cTokens.some(
        (ct) =>
          ct === qt ||
          (qt.length >= 4 && (ct.startsWith(qt) || qt.startsWith(ct)))
      );
      if (hit) matched += 1;
    }

    const ratio = matched / qTokens.length;
    if (ratio >= 0.8) {
      return true;
    }
  }

  return false;
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

  const titleKey = normalizeTitleForMatch(manga.title);
  if (titleKey) {
    const curatedByTitle = CURATED_POPULAR_WORKS.find(
      (item) =>
        normalizeTitleForMatch(item.title) === titleKey ||
        normalizeTitleForMatch(item.altTitle) === titleKey
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

  const altTitlesRaw: Array<Record<string, string>> = Array.isArray(attr.altTitles)
    ? attr.altTitles
    : [];
  const altTitle =
    altTitlesRaw.find((t) => t['pt-br'])?.['pt-br'] ??
    altTitlesRaw.find((t) => t['en'])?.['en'] ??
    curatedMatch?.altTitle;

  const altTitles = collectLocalizedValues(attr.title, altTitlesRaw);
  if (curatedMatch?.altTitle && !altTitles.includes(curatedMatch.altTitle)) {
    altTitles.push(curatedMatch.altTitle);
  }

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

  const translatedLanguages: string[] | undefined = Array.isArray(
    attr.availableTranslatedLanguages
  )
    ? attr.availableTranslatedLanguages
        .map((lang: unknown) => String(lang ?? '').trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  const hasAvailableChapters =
    translatedLanguages !== undefined ? translatedLanguages.length > 0 : true;

  const lastCh = attr.lastChapter ? String(attr.lastChapter).trim() : '';

  return {
    id,
    title,
    altTitle,
    altTitles,
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
    hasAvailableChapters,
    ...(translatedLanguages ? { translatedLanguages } : {}),
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
    const parsed: MangaDexWork[] = data.map(parseMangaDexEntity);

    if (
      !trimmedQuery &&
      !options.tagId &&
      order === 'popular' &&
      offset === 0
    ) {
      // Prioriza dados reais da API quando a mesma obra existe no curado, preservando ordem curada
      const liveById = new Map(parsed.map((w) => [w.id, w]));
      const merged: MangaDexWork[] = CURATED_POPULAR_WORKS.map((curated) => {
        const live = liveById.get(curated.id);
        return live
          ? {
              ...curated,
              ...live,
              accentColor: curated.accentColor,
              featuredChapterLabel:
                live.featuredChapterLabel ?? curated.featuredChapterLabel,
            }
          : curated;
      });
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
    // Fallback controlado ao catálogo curado em buscas offline ou indisponibilidade externa
    const lowerQ = trimmedQuery.toLowerCase();
    let fallback = CURATED_POPULAR_WORKS;
    if (lowerQ) {
      fallback = fallback.filter(
        (w) =>
          matchesWorkTitle(w, trimmedQuery) ||
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
      const res = await fetchWithRetry(
        `/api/md/manga/${encodeURIComponent(cleanId)}?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          return parseMangaDexEntity(json.data);
        }
      }
    } catch {
      // Continua para os fallbacks seguros
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
      limit: 10,
      safeOnly: false,
    });

    const targetNorm = normalizeTitleForMatch(queryText);
    const exactMatch = matches.find(
      (item) =>
        normalizeTitleForMatch(item.title) === targetNorm ||
        normalizeTitleForMatch(item.altTitle) === targetNorm ||
        (item.altTitles ?? []).some(
          (alt) => normalizeTitleForMatch(alt) === targetNorm
        )
    );
    if (exactMatch) return exactMatch;

    const verifiedMatch = matches.find((item) =>
      matchesWorkTitle(item, queryText)
    );
    if (verifiedMatch) return verifiedMatch;

    const curatedByTitle = CURATED_POPULAR_WORKS.find((item) =>
      matchesWorkTitle(item, queryText)
    );
    if (curatedByTitle) return curatedByTitle;
  }

  throw new Error('Obra não encontrada');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    retryBaseDelayMs?: number;
  } = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer =
      controller && timeoutMs > 0
        ? setTimeout(() => controller.abort(), timeoutMs)
        : undefined;

    try {
      const res = await fetch(
        url,
        controller ? { signal: controller.signal } : undefined
      );
      if (timer) clearTimeout(timer);

      if (res.ok) {
        return res;
      }

      const retryableStatus =
        res.status === 429 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504;

      if (!retryableStatus || attempt === maxRetries) {
        throw new MangaDexFeedError(
          res.status === 429
            ? 'Limite de requisições da fonte externa excedido (HTTP 429).'
            : `Falha ao consultar capítulos (HTTP ${res.status}).`,
          { status: res.status }
        );
      }

      const retryAfterRaw = res.headers?.get?.('Retry-After');
      const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : NaN;
      const waitMs =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, retryBaseDelayMs * 6)
          : retryBaseDelayMs * Math.pow(2, attempt);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastError = err;
      if (err instanceof MangaDexFeedError && err.status && err.status < 500 && err.status !== 429) {
        throw err;
      }
      if (attempt === maxRetries) {
        if (err instanceof MangaDexFeedError) throw err;
        throw new MangaDexFeedError(
          err instanceof Error
            ? err.message
            : 'Erro de rede ao consultar capítulos.'
        );
      }
      const waitMs = retryBaseDelayMs * Math.pow(2, attempt);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new MangaDexFeedError('Falha ao consultar capítulos.');
}

/**
 * Normaliza números de capítulo preservando `"0"` como capítulo zero legítimo
 * e distinguindo capítulos sem número (`null` / `""` -> `canonicalNumber: null`).
 */
export function normalizeChapterNumber(raw: unknown): {
  canonicalNumber: string | null;
  displayLabel: string;
  numericValue: number | null;
} {
  if (raw === null || raw === undefined) {
    return {
      canonicalNumber: null,
      displayLabel: 'Especial',
      numericValue: null,
    };
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return {
      canonicalNumber: null,
      displayLabel: 'Especial',
      numericValue: null,
    };
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      const normalized = String(parsed);
      return {
        canonicalNumber: normalized,
        displayLabel: normalized,
        numericValue: parsed,
      };
    }
  }

  return {
    canonicalNumber: trimmed.toLowerCase(),
    displayLabel: trimmed,
    numericValue: null,
  };
}

function normalizeLanguageCode(rawLang: unknown): string {
  const lower = String(rawLang ?? 'en').trim().toLowerCase();
  if (lower === 'pt-br') return 'PT-BR';
  if (lower === 'pt') return 'PT';
  if (lower === 'en') return 'EN';
  if (lower === 'es' || lower === 'es-la') return 'ES';
  return lower.toUpperCase() || 'EN';
}

function parseChapterList(
  rawList: Array<Record<string, any>>
): MangaDexChapter[] {
  const out: MangaDexChapter[] = [];
  for (const item of rawList) {
    const id = String(item.id ?? '').trim();
    if (!id) continue;

    const attr = item.attributes ?? {};
    const pages = Number(attr.pages ?? 0);
    const externalUrl = attr.externalUrl ? String(attr.externalUrl).trim() : null;
    if (pages <= 0) continue;

    const rels: Array<Record<string, any>> = Array.isArray(item.relationships)
      ? item.relationships
      : [];
    const groupRel = rels.find((r) => r.type === 'scanlation_group');
    const language = normalizeLanguageCode(attr.translatedLanguage);
    const title = String(attr.title ?? '').trim();
    const volume = attr.volume ? String(attr.volume).trim() : null;

    const { canonicalNumber, displayLabel } = normalizeChapterNumber(
      attr.chapter
    );
    const isSpecial = canonicalNumber === null;

    let canonicalKey: string;
    if (canonicalNumber !== null) {
      canonicalKey = `num:${canonicalNumber}`;
    } else {
      const titleNorm = normalizeTitleForMatch(title);
      const isOneshot = titleNorm.includes('oneshot') || titleNorm.includes('one shot');
      canonicalKey = titleNorm
        ? `special:${volume || 'nv'}:${titleNorm}`
        : `special:${volume || 'nv'}:id_${id}`;
      // Diferencia oneshot explícito de outros capítulos especiais
      if (isOneshot) {
        canonicalKey = `special:${volume || 'nv'}:oneshot:${titleNorm}`;
      }
    }

    const chapterNumber =
      canonicalNumber !== null
        ? displayLabel
        : title.toLowerCase().includes('oneshot')
          ? 'Oneshot'
          : 'Especial';

    out.push({
      id,
      chapterNumber,
      title,
      volume,
      language,
      pages,
      publishAt: String(attr.publishAt ?? ''),
      scanlationGroup: String(
        groupRel?.attributes?.name ?? 'Grupo de Tradução'
      ),
      externalUrl,
      isSpecial,
      canonicalKey,
    });
  }
  return out;
}

function shouldReplaceChapterCandidate(
  existing: MangaDexChapter,
  candidate: MangaDexChapter
): boolean {
  const existingRank = LANGUAGE_PRIORITY[existing.language] ?? 4;
  const candidateRank = LANGUAGE_PRIORITY[candidate.language] ?? 4;

  if (candidateRank !== existingRank) {
    return candidateRank < existingRank;
  }

  // Mesmo idioma: prioriza versão legível internamente sem externalUrl e com mais páginas
  const existingInternal = existing.pages > 0 && !existing.externalUrl;
  const candidateInternal = candidate.pages > 0 && !candidate.externalUrl;
  if (existingInternal !== candidateInternal) {
    return candidateInternal;
  }

  if (candidate.pages !== existing.pages) {
    return candidate.pages > existing.pages;
  }

  if (!existing.title && candidate.title) {
    return true;
  }

  return false;
}

function sortMergedChapters(
  chapters: MangaDexChapter[],
  direction: 'asc' | 'desc'
): MangaDexChapter[] {
  return [...chapters].sort((a, b) => {
    const aIsSpecial = Boolean(a.isSpecial);
    const bIsSpecial = Boolean(b.isSpecial);
    if (aIsSpecial !== bIsSpecial) {
      // Em ordem crescente, capítulos especiais sem número vão para o final; em decrescente, também ao fim
      return aIsSpecial ? 1 : -1;
    }

    if (!aIsSpecial && !bIsSpecial) {
      const na = Number(normalizeChapterNumber(a.chapterNumber).canonicalNumber);
      const nb = Number(normalizeChapterNumber(b.chapterNumber).canonicalNumber);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
        return direction === 'asc' ? na - nb : nb - na;
      }
    }

    const va = Number(a.volume ?? NaN);
    const vb = Number(b.volume ?? NaN);
    if (Number.isFinite(va) && Number.isFinite(vb) && va !== vb) {
      return direction === 'asc' ? va - vb : vb - va;
    }

    const ta = Date.parse(a.publishAt || '') || 0;
    const tb = Date.parse(b.publishAt || '') || 0;
    if (ta !== tb) {
      return direction === 'asc' ? ta - tb : tb - ta;
    }

    return a.id.localeCompare(b.id);
  });
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const next = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  };

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => next()
  );
  await Promise.all(workers);
  return results;
}

export interface FetchMangaChaptersOptions {
  direction?: 'asc' | 'desc';
  includeSpanishFallback?: boolean;
  forceRefresh?: boolean;
  retryBaseDelayMs?: number;
  requestTimeoutMs?: number;
}

/**
 * Busca todos os capítulos da obra com paginação completa (`limit=500`, avançando `offset`),
 * preenchimento de lacunas por idioma (`PT-BR -> EN -> ES`), deduplicação sem perda
 * de capítulos especiais/oneshots e cache em memória com TTL.
 */
export async function fetchMangaChaptersWithMeta(
  mangaId: string,
  options: FetchMangaChaptersOptions = {}
): Promise<MangaDexChaptersResult> {
  const cleanId = cleanMangaDexId(mangaId);
  const direction = options.direction ?? 'asc';
  const includeSpanishFallback = options.includeSpanishFallback !== false;

  if (!isUuid(cleanId)) {
    return {
      chapters: [],
      languagesUsed: [],
      hasLanguageFallback: false,
      usedSpanishFallback: false,
      totalFeedRecords: 0,
      partialFailureLanguages: [],
    };
  }

  const cacheKey = `${cleanId}:${includeSpanishFallback ? 'with-es' : 'no-es'}`;
  if (!options.forceRefresh) {
    const cached = chaptersMemoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.ascResult,
        chapters: sortMergedChapters(cached.ascResult.chapters, direction),
      };
    }
  }

  const fetchLanguagePaginated = async (
    lang: string
  ): Promise<{ chapters: MangaDexChapter[]; totalFeedRecords: number }> => {
    const collected: MangaDexChapter[] = [];
    let offset = 0;
    let totalFeedRecords = 0;
    let totalExpected = Infinity;

    while (offset < totalExpected && offset < MAX_FEED_ITEMS_PER_LANGUAGE) {
      const params = new URLSearchParams();
      params.set('limit', String(MANGADEX_FEED_PAGE_LIMIT));
      params.set('offset', String(offset));
      params.append('translatedLanguage[]', lang);
      params.append('includes[]', 'scanlation_group');
      params.set('order[chapter]', 'asc');
      params.set('includeExternalUrl', '0');
      params.append('contentRating[]', 'safe');
      params.append('contentRating[]', 'suggestive');
      params.append('contentRating[]', 'erotica');

      const res = await fetchWithRetry(
        `/api/md/manga/${encodeURIComponent(cleanId)}/feed?${params.toString()}`,
        {
          timeoutMs: options.requestTimeoutMs,
          retryBaseDelayMs: options.retryBaseDelayMs,
        }
      );

      const json = await res.json();
      const rawBatch = Array.isArray(json?.data) ? json.data : [];
      totalFeedRecords += rawBatch.length;
      collected.push(...parseChapterList(rawBatch));

      const reportedTotal = Number(json?.total);
      if (Number.isFinite(reportedTotal) && reportedTotal >= 0) {
        totalExpected = reportedTotal;
      }

      offset += rawBatch.length;

      if (rawBatch.length === 0) break;
      if (
        !Number.isFinite(reportedTotal) &&
        rawBatch.length < MANGADEX_FEED_PAGE_LIMIT
      ) {
        break;
      }
    }

    return { chapters: collected, totalFeedRecords };
  };

  const langsToQuery = includeSpanishFallback
    ? ['pt-br', 'en', 'es']
    : ['pt-br', 'en'];

  type LangAttemptResult =
    | { lang: string; ok: true; chapters: MangaDexChapter[]; totalFeedRecords: number }
    | { lang: string; ok: false; error: unknown };

  const attemptResults = await runWithConcurrency<string, LangAttemptResult>(
    langsToQuery,
    MAX_CONCURRENT_FEED_REQUESTS,
    async (lang) => {
      try {
        const res = await fetchLanguagePaginated(lang);
        return { lang, ok: true, ...res };
      } catch (error) {
        return { lang, ok: false, error };
      }
    }
  );

  const succeeded = attemptResults.filter(
    (r): r is Extract<LangAttemptResult, { ok: true }> => r.ok
  );
  const failed = attemptResults.filter(
    (r): r is Extract<LangAttemptResult, { ok: false }> => !r.ok
  );

  if (succeeded.length === 0) {
    const firstErr = failed[0]?.error;
    if (firstErr instanceof MangaDexFeedError) {
      throw new MangaDexFeedError(firstErr.message, {
        status: firstErr.status,
        failedLanguages: failed.map((f) => f.lang.toUpperCase()),
      });
    }
    throw new MangaDexFeedError(
      'Não foi possível carregar os capítulos da obra no momento.',
      { failedLanguages: failed.map((f) => f.lang.toUpperCase()) }
    );
  }

  const byCanonicalKey = new Map<string, MangaDexChapter>();
  const seenIds = new Set<string>();
  let totalFeedRecords = 0;

  for (const res of succeeded) {
    totalFeedRecords += res.totalFeedRecords;
    for (const candidate of res.chapters) {
      if (seenIds.has(candidate.id)) continue;
      seenIds.add(candidate.id);

      const key = candidate.canonicalKey || `id_${candidate.id}`;
      const existing = byCanonicalKey.get(key);
      if (!existing || shouldReplaceChapterCandidate(existing, candidate)) {
        byCanonicalKey.set(key, candidate);
      }
    }
  }

  const mergedAsc = sortMergedChapters(
    Array.from(byCanonicalKey.values()),
    'asc'
  );

  // Se não veio capítulo nenhum e alguma busca de idioma falhou, não mascaramos erro como lista vazia
  if (mergedAsc.length === 0 && failed.length > 0) {
    const firstErr = failed[0]?.error;
    throw new MangaDexFeedError(
      firstErr instanceof Error
        ? firstErr.message
        : 'Falha parcial ao consultar idiomas disponíveis.',
      {
        status: firstErr instanceof MangaDexFeedError ? firstErr.status : undefined,
        failedLanguages: failed.map((f) => f.lang.toUpperCase()),
      }
    );
  }

  const langSet = new Set<string>();
  for (const ch of mergedAsc) {
    langSet.add(ch.language);
  }
  const languagesUsed = Array.from(langSet).sort(
    (a, b) => (LANGUAGE_PRIORITY[a] ?? 9) - (LANGUAGE_PRIORITY[b] ?? 9)
  );

  const ascResult: MangaDexChaptersResult = {
    chapters: mergedAsc,
    languagesUsed,
    hasLanguageFallback: languagesUsed.length > 1,
    usedSpanishFallback: langSet.has('ES'),
    totalFeedRecords,
    partialFailureLanguages: failed.map((f) => f.lang.toUpperCase()),
  };

  chaptersMemoryCache.set(cacheKey, {
    expiresAt: Date.now() + CHAPTERS_CACHE_TTL_MS,
    ascResult,
  });

  return {
    ...ascResult,
    chapters:
      direction === 'asc'
        ? ascResult.chapters
        : sortMergedChapters(ascResult.chapters, direction),
  };
}

export async function fetchMangaChapters(
  mangaId: string,
  directionOrOptions: 'asc' | 'desc' | FetchMangaChaptersOptions = 'asc'
): Promise<MangaDexChapter[]> {
  const options: FetchMangaChaptersOptions =
    typeof directionOrOptions === 'string'
      ? { direction: directionOrOptions }
      : directionOrOptions;
  const result = await fetchMangaChaptersWithMeta(mangaId, options);
  return result.chapters;
}

export async function fetchMangaCoversByIds(
  mangaIds: string[]
): Promise<Record<string, { coverFileName: string; coverUrl: string; title: string }>> {
  const uniqueIds = Array.from(
    new Set(mangaIds.map((id) => cleanMangaDexId(id)).filter((id) => isUuid(id)))
  ).slice(0, 100);

  if (uniqueIds.length === 0) return {};

  const params = new URLSearchParams();
  params.set('limit', String(uniqueIds.length));
  params.append('includes[]', 'cover_art');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('contentRating[]', 'erotica');
  params.append('contentRating[]', 'pornographic');
  for (const id of uniqueIds) {
    params.append('ids[]', id);
  }

  try {
    const res = await fetchWithRetry(`/api/md/manga?${params.toString()}`);
    if (!res.ok) return {};
    const json = await res.json();
    const list: Array<Record<string, any>> = Array.isArray(json?.data)
      ? json.data
      : [];
    const result: Record<
      string,
      { coverFileName: string; coverUrl: string; title: string }
    > = {};
    for (const entity of list) {
      const id = String(entity?.id ?? '').trim();
      if (!id) continue;
      const rels: Array<Record<string, any>> = Array.isArray(entity?.relationships)
        ? entity.relationships
        : [];
      const coverRel = rels.find((r) => r.type === 'cover_art');
      const fileName = String(coverRel?.attributes?.fileName ?? '').trim();
      if (!fileName) continue;
      result[id] = {
        coverFileName: fileName,
        coverUrl: buildMangaCoverUrl(id, fileName, false),
        title: resolveBestTitle(entity?.attributes ?? {}),
      };
    }
    return result;
  } catch {
    return {};
  }
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
  const cleanChapterId = cleanMangaDexId(chapterId);
  const [metaRes, serverRes] = await Promise.all([
    fetchWithRetry(
      `/api/md/chapter/${encodeURIComponent(
        cleanChapterId
      )}?includes[]=scanlation_group&includes[]=manga`
    ).catch(() => null),
    fetchWithRetry(
      `/api/md/at-home/server/${encodeURIComponent(cleanChapterId)}?forcePort443=true`
    ),
  ]);

  if (!serverRes.ok) {
    throw new Error(`Servidor de páginas indisponível (${serverRes.status})`);
  }

  const serverJson = await serverRes.json();
  const metaJson = metaRes && metaRes.ok ? await metaRes.json() : null;

  const attr = metaJson?.data?.attributes ?? {};
  const rels: Array<Record<string, any>> = Array.isArray(
    metaJson?.data?.relationships
  )
    ? metaJson.data.relationships
    : [];
  const groupRel = rels.find((r) => r.type === 'scanlation_group');
  const mangaRel = rels.find((r) => r.type === 'manga');
  const { displayLabel } = normalizeChapterNumber(attr.chapter ?? '1');

  const mangaId = mangaRel?.id ? String(mangaRel.id) : undefined;
  let mangaTitle = mangaRel?.attributes
    ? resolveBestTitle(mangaRel.attributes)
    : undefined;
  let mangaCoverFileName: string | undefined;

  if (mangaId && isUuid(mangaId)) {
    try {
      const mangaRes = await fetchWithRetry(
        `/api/md/manga/${encodeURIComponent(mangaId)}?includes[]=cover_art`
      );
      if (mangaRes.ok) {
        const mangaJson = await mangaRes.json();
        const mangaData = mangaJson?.data;
        if (mangaData) {
          const mangaRels: Array<Record<string, any>> = Array.isArray(
            mangaData.relationships
          )
            ? mangaData.relationships
            : [];
          const coverRel = mangaRels.find((r) => r.type === 'cover_art');
          const fileName = String(coverRel?.attributes?.fileName ?? '').trim();
          if (fileName) {
            mangaCoverFileName = fileName;
          }
          if (mangaData.attributes) {
            mangaTitle = resolveBestTitle(mangaData.attributes);
          }
        }
      }
    } catch {
      // O leitor continua funcionando mesmo se o lookup secundário de capa falhar
    }
  }

  return {
    pages: {
      chapterId: cleanChapterId,
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
      id: cleanChapterId,
      chapterNumber: displayLabel,
      title: String(attr.title ?? ''),
      language: normalizeLanguageCode(attr.translatedLanguage ?? 'pt-br'),
      scanlationGroup: String(
        groupRel?.attributes?.name ?? 'Grupo de Tradução'
      ),
      mangaId,
      mangaTitle,
      mangaCoverFileName,
    },
  };
}
