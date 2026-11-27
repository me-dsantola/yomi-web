/**
 * Port fiel em TypeScript do `BackupCodec` (`lib/services/backup_codec.dart`) do app YOMI Flutter.
 * - Aceita JSON puro ou JSON codificado em Base64 (até 24 MB).
 * - Valida versão (1..4), favoritos, histórico, listas de leitura e perfil.
 * - Preserva integralmente chaves desconhecidas/legadas ao mesclar progresso do leitor web.
 * - Importante: Base64 NÃO é criptografia.
 */

export const CURRENT_BACKUP_VERSION = 4;
export const MAX_BACKUP_INPUT_LENGTH = 24 * 1024 * 1024;

export interface YomiMangaEntry {
  id: string;
  title: string;
  description?: string;
  status?: string;
  coverFileName?: string;
  directCoverUrl?: string;
  directHighResCoverUrl?: string;
  source?: string;
  updatedAt?: string;
  tags?: string[];
  isNsfw?: boolean;
  contentRatingKnown?: boolean;
  availableChaptersCount?: number;
  customHeaders?: Record<string, string>;
  preloadedChapters?: YomiChapterEntry[];
  [extraKey: string]: unknown;
}

export interface YomiChapterEntry {
  id: string;
  source?: string;
  chapterNumber?: string;
  title?: string;
  language?: string;
  scanlator?: string;
  externalArchiveId?: string;
  pages?: number;
  directPageUrls?: string[];
  [extraKey: string]: unknown;
}

export interface YomiRecentReadingItem {
  manga: YomiMangaEntry;
  chapter: YomiChapterEntry;
  timestamp?: string;
  [extraKey: string]: unknown;
}

export interface YomiReadingList {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  mangas?: YomiMangaEntry[];
  [extraKey: string]: unknown;
}

export interface YomiProfile {
  name?: string;
  bio?: string;
  favoriteGenre?: string;
  avatarImagePath?: string;
  bannerImagePath?: string;
  avatarBase64?: string;
  bannerBase64?: string;
  blobatarName?: string;
  blobatarSeed?: string;
  blobatarShape?: string;
  blobatarExpression?: string;
  blobatarBackground?: string;
  avatarIndex?: number;
  customAccentColor?: number | null;
  blobatarHue?: number | null;
  openOnProfileByDefault?: boolean;
  isConfigured?: boolean;
  useBlobatarAsAvatar?: boolean;
  blobatarAnimated?: boolean;
  blobatarInteractive?: boolean;
  [extraKey: string]: unknown;
}

export interface YomiBackupV4 {
  version?: number;
  favorites?: Record<string, YomiMangaEntry>;
  history?: Record<string, unknown>;
  settings?: {
    user_reading_lists?: YomiReadingList[];
    [key: string]: unknown;
  };
  profile?: YomiProfile;
  [legacyKey: string]: unknown;
}

export interface BackupSummary {
  version: number;
  favoritesCount: number;
  historyCount: number;
  recentReadsCount: number;
  readingListsCount: number;
  profileName: string;
  mascotName: string;
}

function invalid(field: string): never {
  throw new Error(`Campo inválido no backup: ${field}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureMap(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    invalid(field);
  }
  return value;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function optionalCheck(
  obj: Record<string, unknown>,
  key: string,
  predicate: (val: unknown) => boolean
): void {
  if (obj[key] !== undefined && obj[key] !== null && !predicate(obj[key])) {
    invalid(key);
  }
}

function validateTree(value: unknown, depth = 0): void {
  if (depth > 32) invalid('profundidade');
  if (Array.isArray(value)) {
    if (value.length > 250000) invalid('quantidade de itens');
    for (const item of value) {
      validateTree(item, depth + 1);
    }
  } else if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length > 250000) invalid('quantidade de entradas');
    for (const k of keys) {
      validateTree(value[k], depth + 1);
    }
  } else if (typeof value === 'number' && !Number.isFinite(value)) {
    invalid('número');
  }
}

function validateChapter(raw: unknown): void {
  const value = ensureMap(raw, 'capítulo');
  for (const key of [
    'id',
    'source',
    'chapterNumber',
    'title',
    'language',
    'scanlator',
    'externalArchiveId',
  ]) {
    optionalCheck(value, key, (v) => typeof v === 'string');
  }
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    invalid('id do capítulo');
  }
  optionalCheck(value, 'pages', isNonNegativeInt);
  optionalCheck(value, 'directPageUrls', isStringArray);
}

function validateChapters(raw: unknown): void {
  if (!Array.isArray(raw)) invalid('lista de capítulos');
  for (const ch of raw) {
    validateChapter(ch);
  }
}

function validateManga(raw: unknown, field: string): void {
  const value = ensureMap(raw, field);
  if (
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.title !== 'string' ||
    value.title.trim().length === 0
  ) {
    invalid(field);
  }
  for (const key of [
    'description',
    'status',
    'coverFileName',
    'directCoverUrl',
    'directHighResCoverUrl',
    'source',
    'updatedAt',
  ]) {
    optionalCheck(value, key, (v) => typeof v === 'string');
  }
  optionalCheck(value, 'tags', isStringArray);
  optionalCheck(value, 'isNsfw', (v) => typeof v === 'boolean');
  optionalCheck(value, 'contentRatingKnown', (v) => typeof v === 'boolean');
  optionalCheck(
    value,
    'availableChaptersCount',
    (v) => typeof v === 'number' && Number.isInteger(v) && v >= -1
  );

  if (value.customHeaders !== undefined && value.customHeaders !== null) {
    const headers = ensureMap(value.customHeaders, 'customHeaders');
    if (Object.values(headers).some((v) => typeof v !== 'string')) {
      invalid('customHeaders');
    }
  }
  if (value.preloadedChapters !== undefined && value.preloadedChapters !== null) {
    validateChapters(value.preloadedChapters);
  }
}

function validateHistoryEntry(key: string, value: unknown): void {
  if (!key) invalid('chave do histórico');
  if (key.startsWith('page_') || key.startsWith('chapters_count_')) {
    if (!isNonNegativeInt(value)) invalid(key);
  } else if (key.startsWith('webtoon_anchor_')) {
    const anchor = ensureMap(value, key);
    if (
      !isNonNegativeInt(anchor.page) ||
      typeof anchor.fraction !== 'number' ||
      !Number.isFinite(anchor.fraction) ||
      anchor.fraction < 0 ||
      anchor.fraction > 1
    ) {
      invalid(key);
    }
  } else if (key.startsWith('webtoon_offset_')) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      invalid(key);
    }
  } else if (key.startsWith('reading_metric_')) {
    const event = ensureMap(value, key);
    if (typeof event.changedAt !== 'string') invalid(key);
    for (const field of ['readAt', 'mangaId', 'number']) {
      optionalCheck(event, field, v => typeof v === 'string');
    }
    optionalCheck(event, 'pages', isNonNegativeInt);
  } else if (key.startsWith('read_')) {
    if (typeof value !== 'boolean') invalid(key);
  } else if (key.startsWith('last_')) {
    validateChapter(value);
  } else if (key.startsWith('manga_meta_')) {
    validateManga(value, key);
  } else if (key.startsWith('chapters_')) {
    validateChapters(value);
  } else if (key === 'recent_reading_list' || key === 'reading_events_log') {
    if (!Array.isArray(value)) invalid(key);
    for (const raw of value) {
      const item = ensureMap(raw, key);
      if (key === 'recent_reading_list') {
        validateManga(item.manga, key);
        validateChapter(item.chapter);
        optionalCheck(item, 'timestamp', (v) => typeof v === 'string');
      } else {
        validateManga(item.mangaMap, key);
        validateChapter(item.chapterMap);
        optionalCheck(item, 'pages', isNonNegativeInt);
      }
    }
  }
}

function decodeBase64Utf8(base64Str: string): string {
  const normalized = base64Str.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('Formato do backup inválido');
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(normalized, 'base64').toString('utf-8');
  }
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function encodeBase64Utf8(jsonText: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(jsonText, 'utf-8').toString('base64');
  }
  const bytes = new TextEncoder().encode(jsonText);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Decodifica e valida uma string `.kuro` (JSON puro ou Base64).
 */
export function decodeKuroBackup(input: string): YomiBackupV4 {
  const raw = input.trim();
  if (!raw || raw.length > MAX_BACKUP_INPUT_LENGTH) {
    throw new Error('Backup vazio ou grande demais (máx. 24 MB)');
  }

  let jsonText: string;
  try {
    jsonText = raw.startsWith('{') ? raw : decodeBase64Utf8(raw);
  } catch {
    throw new Error('Formato do backup inválido');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Formato do backup inválido');
  }

  const data = ensureMap(parsed, 'backup');
  validateTree(data);

  const version = data.version;
  if (
    version !== undefined &&
    version !== null &&
    (typeof version !== 'number' ||
      !Number.isInteger(version) ||
      version < 1 ||
      version > CURRENT_BACKUP_VERSION)
  ) {
    throw new Error('Versão de backup incompatível');
  }

  if (
    !isPlainObject(data.favorites) &&
    !isPlainObject(data.history) &&
    !isPlainObject(data.profile)
  ) {
    throw new Error('Backup sem dados reconhecíveis');
  }

  for (const section of ['favorites', 'history', 'settings', 'profile']) {
    if (data[section] !== undefined && data[section] !== null) {
      ensureMap(data[section], section);
    }
  }

  if (isPlainObject(data.favorites)) {
    for (const [key, val] of Object.entries(data.favorites)) {
      if (!key) invalid('favoritos');
      validateManga(val, 'favorito');
    }
  }

  if (isPlainObject(data.history)) {
    for (const [key, val] of Object.entries(data.history)) {
      validateHistoryEntry(key, val);
    }
  }

  if (isPlainObject(data.profile)) {
    const profile = data.profile;
    for (const key of [
      'name',
      'bio',
      'favoriteGenre',
      'avatarImagePath',
      'bannerImagePath',
      'avatarBase64',
      'bannerBase64',
      'blobatarName',
      'blobatarSeed',
      'blobatarShape',
      'blobatarExpression',
      'blobatarBackground',
    ]) {
      optionalCheck(profile, key, (v) => typeof v === 'string');
    }
    optionalCheck(profile, 'avatarIndex', isNonNegativeInt);
    optionalCheck(
      profile,
      'customAccentColor',
      (v) => typeof v === 'number' && Number.isInteger(v)
    );
    optionalCheck(
      profile,
      'blobatarHue',
      (v) => typeof v === 'number' && Number.isFinite(v)
    );
  }

  if (isPlainObject(data.settings)) {
    const settings = data.settings;
    if (settings.user_reading_lists !== undefined && settings.user_reading_lists !== null) {
      if (!Array.isArray(settings.user_reading_lists)) {
        invalid('user_reading_lists');
      }
      for (const rawList of settings.user_reading_lists) {
        const item = ensureMap(rawList, 'user_reading_lists');
        if (
          typeof item.id !== 'string' ||
          !item.id ||
          typeof item.name !== 'string'
        ) {
          invalid('user_reading_lists');
        }
        if (item.mangas !== undefined && item.mangas !== null) {
          if (!Array.isArray(item.mangas)) invalid('mangas');
          for (const m of item.mangas) {
            validateManga(m, 'user_reading_lists.mangas');
          }
        }
      }
    }
  }

  return data as YomiBackupV4;
}

/**
 * Codifica um objeto `YomiBackupV4` no formato `.kuro` (Base64 UTF-8, idêntico ao app)
 * ou JSON formatado.
 */
export function encodeKuroBackup(data: YomiBackupV4, asBase64 = true): string {
  const jsonText = JSON.stringify({
    version: data.version ?? CURRENT_BACKUP_VERSION,
    ...data,
  });
  return asBase64 ? encodeBase64Utf8(jsonText) : jsonText;
}

/**
 * Gera resumo legível de um backup `.kuro` validado antes da confirmação de importação.
 */
export function summarizeBackup(backup: YomiBackupV4): BackupSummary {
  const favoritesCount = isPlainObject(backup.favorites)
    ? Object.keys(backup.favorites).length
    : 0;
  const historyMap = isPlainObject(backup.history) ? backup.history : {};
  const historyCount = Object.keys(historyMap).length;
  const recentList = Array.isArray(historyMap.recent_reading_list)
    ? historyMap.recent_reading_list
    : [];
  const readingLists = Array.isArray(backup.settings?.user_reading_lists)
    ? backup.settings!.user_reading_lists!
    : [];

  return {
    version: backup.version ?? CURRENT_BACKUP_VERSION,
    favoritesCount,
    historyCount,
    recentReadsCount: recentList.length,
    readingListsCount: readingLists.length,
    profileName:
      typeof backup.profile?.name === 'string' && backup.profile.name.trim()
        ? backup.profile.name
        : 'Leitor YOMI',
    mascotName:
      typeof backup.profile?.blobatarName === 'string' &&
      backup.profile.blobatarName.trim()
        ? backup.profile.blobatarName
        : 'Yomi Blob',
  };
}

export interface WebReaderProgressUpdate {
  manga: YomiMangaEntry;
  chapter: YomiChapterEntry;
  pageIndex?: number;
  lastPageRead?: number;
  completed: boolean;
  timestampIso?: string;
}

export function argbIntToHex(
  argb: number | undefined | null,
  fallback = '#FF2A55'
): string {
  if (typeof argb !== 'number' || !Number.isFinite(argb)) return fallback;
  const unsigned = argb >>> 0;
  const rgb = unsigned & 0xffffff;
  return `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`;
}

export function buildKuroFilename(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `yomi-backup-${yyyy}-${mm}-${dd}.kuro`;
}

/**
 * Remove caches efêmeros de capítulos e limita históricos extensos antes de
 * enviar para a nuvem, espelhando `BackupCodec.stripEphemeralCacheForCloud` do app Flutter.
 */
export function stripEphemeralCacheForCloud(data: YomiBackupV4): YomiBackupV4 {
  const result: YomiBackupV4 = { ...data };
  if (!isPlainObject(data.history)) {
    return result;
  }

  const cleanHistory: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data.history)) {
    if (key.startsWith('chapters_') && !key.startsWith('chapters_count_')) {
      continue;
    }
    if (key === 'recent_reading_list' && Array.isArray(value)) {
      cleanHistory[key] = value.slice(0, 30);
      continue;
    }
    if (key === 'reading_events_log' && Array.isArray(value)) {
      cleanHistory[key] = value.length > 150 ? value.slice(-150) : [...value];
      continue;
    }
    cleanHistory[key] = value;
  }

  result.history = cleanHistory;
  return result;
}

/**
 * Mescla o progresso de leitura do Quick Reader Web dentro do `payload` existente,
 * preservando TODAS as chaves desconhecidas, favoritos, configurações e perfil.
 */
export function mergeHistoryIntoPayload(
  rawPayloadString: string,
  update: WebReaderProgressUpdate
): { nextPayload: string; historyCount: number } {
  const decoded = decodeKuroBackup(rawPayloadString);
  const existingHistory: Record<string, unknown> = isPlainObject(decoded.history)
    ? { ...decoded.history }
    : {};

  const chapterId = update.chapter.id;
  const mangaId = update.manga.id;
  const nowIso = update.timestampIso ?? new Date().toISOString();
  const pageNum = update.pageIndex ?? update.lastPageRead ?? 0;

  existingHistory[`page_${chapterId}`] = Math.max(0, Math.floor(pageNum));
  if (update.completed) {
    const metricKey = `reading_metric_${chapterId}`;
    const previous = existingHistory[metricKey];
    if (existingHistory[`read_${chapterId}`] !== true ||
        (isPlainObject(previous) && !previous.readAt)) {
      existingHistory[metricKey] = {
        changedAt: nowIso, readAt: nowIso, mangaId,
        pages: isNonNegativeInt(update.chapter.pages) ? update.chapter.pages : 0, number: update.chapter.chapterNumber,
      };
    }
    existingHistory[`read_${chapterId}`] = true;
  }
  existingHistory[`last_${mangaId}`] = update.chapter;
  existingHistory[`manga_meta_${mangaId}`] = update.manga;

  const currentRecent = Array.isArray(existingHistory.recent_reading_list)
    ? (existingHistory.recent_reading_list as YomiRecentReadingItem[])
    : [];

  const filteredRecent = currentRecent.filter(
    (item) => item?.manga?.id !== mangaId
  );

  const nextRecent: YomiRecentReadingItem[] = [
    {
      manga: update.manga,
      chapter: update.chapter,
      timestamp: nowIso,
    },
    ...filteredRecent,
  ].slice(0, 30);

  existingHistory.recent_reading_list = nextRecent;

  const nextBackup = stripEphemeralCacheForCloud({
    ...decoded,
    version: decoded.version ?? CURRENT_BACKUP_VERSION,
    history: existingHistory,
  });

  // Mantém o mesmo formato (JSON puro se começava com '{', caso contrário Base64)
  const wasRawJson = rawPayloadString.trim().startsWith('{');
  const nextPayload = wasRawJson
    ? JSON.stringify(nextBackup)
    : encodeBase64Utf8(JSON.stringify(nextBackup));

  const nextHistory = isPlainObject(nextBackup.history) ? nextBackup.history : {};
  return {
    nextPayload,
    historyCount: Object.keys(nextHistory).length,
  };
}
