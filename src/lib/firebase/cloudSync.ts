import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseClient } from './client';
import {
  CURRENT_BACKUP_VERSION,
  decodeKuroBackup,
  encodeKuroBackup,
  mergeHistoryIntoPayload,
  stripEphemeralCacheForCloud,
  summarizeBackup,
  type WebReaderProgressUpdate,
  type YomiBackupV4,
  type YomiChapterEntry,
  type YomiMangaEntry,
  type YomiProfile,
  type YomiReadingList,
  type YomiRecentReadingItem,
} from '@/lib/backup/kuroCodec';
import { cleanMangaDexId } from '@/lib/mangadex/api';

export interface ParsedYomiCloudState {
  uid: string;
  userEmail: string | null;
  userDisplayName: string | null;
  updatedAtLocal: string;
  appVersion: string;
  appBuild?: number;
  rawPayload: string;
  backup: YomiBackupV4;
  profile: YomiProfile;
  avatarDataUrl: string | null;
  bannerDataUrl: string | null;
  favorites: YomiMangaEntry[];
  recentReads: Array<YomiRecentReadingItem & { lastPageRead: number }>;
  readingLists: YomiReadingList[];
  favoritesCount: number;
  historyCount: number;
  readingListsCount: number;
  mascotName: string;
}

export interface ReaderRankInfo {
  title: string;
  levelLabel: string;
  rankName: string;
  progress: number;
  nextGoal: number;
  nextRankTitle: string | null;
  chaptersRemaining: number;
}

export function getReaderRankInfo(totalChaptersRead: number): ReaderRankInfo {
  const safeCount = Math.max(0, Math.floor(totalChaptersRead));
  if (safeCount >= 100) {
    return {
      title: 'Xogun das Letras • Nível S',
      levelLabel: 'Nível S',
      rankName: 'Xogun das Letras',
      progress: 100,
      nextGoal: 100,
      nextRankTitle: null,
      chaptersRemaining: 0,
    };
  }
  if (safeCount >= 40) {
    return {
      title: 'Mestre Ronin • Nível A',
      levelLabel: 'Nível A',
      rankName: 'Mestre Ronin',
      progress: Math.min(100, Math.max(0, Math.round(((safeCount - 40) / 60) * 100))),
      nextGoal: 100,
      nextRankTitle: 'Xogun das Letras (Nível S)',
      chaptersRemaining: 100 - safeCount,
    };
  }
  if (safeCount >= 15) {
    return {
      title: 'Espadachim Samurai • Nível B',
      levelLabel: 'Nível B',
      rankName: 'Espadachim Samurai',
      progress: Math.min(100, Math.max(0, Math.round(((safeCount - 15) / 25) * 100))),
      nextGoal: 40,
      nextRankTitle: 'Mestre Ronin (Nível A)',
      chaptersRemaining: 40 - safeCount,
    };
  }
  if (safeCount >= 3) {
    return {
      title: 'Caçador de Capítulos • Nível C',
      levelLabel: 'Nível C',
      rankName: 'Caçador de Capítulos',
      progress: Math.min(100, Math.max(0, Math.round(((safeCount - 3) / 12) * 100))),
      nextGoal: 15,
      nextRankTitle: 'Espadachim Samurai (Nível B)',
      chaptersRemaining: 15 - safeCount,
    };
  }
  return {
    title: 'Iniciado do Torii • Nível 1',
    levelLabel: 'Nível 1',
    rankName: 'Iniciado do Torii',
    progress: Math.min(100, Math.max(8, Math.round((safeCount / 3) * 100))),
    nextGoal: 3,
    nextRankTitle: 'Caçador de Capítulos (Nível C)',
    chaptersRemaining: 3 - safeCount,
  };
}

export function countReadChaptersFromHistory(
  historyMap?: Record<string, unknown>,
  fallbackRecentCount = 0
): number {
  if (!historyMap) return fallbackRecentCount;
  let count = 0;
  for (const [key, value] of Object.entries(historyMap)) {
    if (key.startsWith('read_') && value === true) {
      count += 1;
    }
  }
  return Math.max(count, fallbackRecentCount);
}

export function createEmptyCloudState(
  uid: string,
  userEmail: string | null,
  userDisplayName?: string | null
): ParsedYomiCloudState {
  const resolvedName =
    userDisplayName?.trim() ||
    userEmail?.split('@')[0]?.trim() ||
    'Leitor YOMI';

  const profile: YomiProfile = {
    name: resolvedName,
    bio: 'Explorando universos de mangás, manhwas e webtoons.',
    favoriteGenre: 'Ação, Fantasia & Seinen',
    blobatarName: 'Kuro',
    blobatarShape: 'auto',
    blobatarExpression: 'happy',
    customAccentColor: 0xffff2a55,
    useBlobatarAsAvatar: true,
    isConfigured: true,
  };

  const backup: YomiBackupV4 = {
    version: CURRENT_BACKUP_VERSION,
    profile,
    favorites: {},
    history: {
      recent_reading_list: [],
    },
    settings: {
      user_reading_lists: [],
    },
  };

  const rawPayload = encodeKuroBackup(backup, true);

  return {
    uid,
    userEmail,
    userDisplayName: resolvedName,
    updatedAtLocal: '',
    appVersion: '1.2.8',
    rawPayload,
    backup,
    profile,
    avatarDataUrl: null,
    bannerDataUrl: null,
    favorites: [],
    recentReads: [],
    readingLists: [],
    favoritesCount: 0,
    historyCount: 0,
    readingListsCount: 0,
    mascotName: 'Kuro',
  };
}

export function parseRawCloudDocData(
  data: Record<string, any>,
  expectedEmail?: string | null
): ParsedYomiCloudState {
  if (
    data.userEmail &&
    expectedEmail &&
    String(data.userEmail).toLowerCase() !== expectedEmail.toLowerCase()
  ) {
    throw new Error(
      'Os dados na nuvem pertencem a outra conta de e-mail. Acesso bloqueado por segurança.'
    );
  }

  const rawPayload = typeof data.payload === 'string' ? data.payload.trim() : '';
  if (!rawPayload) {
    throw new Error('Documento na nuvem não contém um payload de backup válido.');
  }

  const backup = decodeKuroBackup(rawPayload);
  const profile: YomiProfile = {
    ...(backup.profile ?? {}),
    ...(typeof data.profile === 'object' && data.profile ? data.profile : {}),
  };

  const avatarBase64 =
    typeof data.avatarBase64 === 'string' && data.avatarBase64.trim()
      ? data.avatarBase64.trim()
      : typeof profile.avatarBase64 === 'string' && profile.avatarBase64.trim()
        ? profile.avatarBase64.trim()
        : null;

  const bannerBase64 =
    typeof data.bannerBase64 === 'string' && data.bannerBase64.trim()
      ? data.bannerBase64.trim()
      : typeof profile.bannerBase64 === 'string' && profile.bannerBase64.trim()
        ? profile.bannerBase64.trim()
        : null;

  const favoritesMap = backup.favorites ?? {};
  const favorites = Object.values(favoritesMap);

  const historyMap = backup.history ?? {};
  const rawRecent = Array.isArray(historyMap.recent_reading_list)
    ? (historyMap.recent_reading_list as YomiRecentReadingItem[])
    : [];

  const rawRecentWithIndex = rawRecent
    .filter(
      (item): item is YomiRecentReadingItem =>
        Boolean(
          item && typeof item === 'object' && item.manga?.id && item.chapter?.id
        )
    )
    .map((item, index) => {
      const parsedTs =
        typeof item.timestamp === 'string' && item.timestamp.trim()
          ? Date.parse(item.timestamp)
          : NaN;
      return {
        item,
        index,
        tsMs: Number.isFinite(parsedTs) ? parsedTs : null,
      };
    });

  rawRecentWithIndex.sort((a, b) => {
    if (a.tsMs !== null && b.tsMs !== null) {
      return b.tsMs - a.tsMs || a.index - b.index;
    }
    if (a.tsMs !== null) return -1;
    if (b.tsMs !== null) return 1;
    return a.index - b.index;
  });

  const seenRecentMangaIds = new Set<string>();
  const recentReads: Array<YomiRecentReadingItem & { lastPageRead: number }> = [];
  for (const { item } of rawRecentWithIndex) {
    const cleanId =
      cleanMangaDexId(item.manga?.id ?? '') || String(item.manga?.id ?? '');
    if (!cleanId || seenRecentMangaIds.has(cleanId)) continue;
    seenRecentMangaIds.add(cleanId);

    const chId = item.chapter?.id ?? '';
    const pageVal = historyMap[`page_${chId}`];
    const lastPageRead =
      typeof pageVal === 'number' && Number.isInteger(pageVal) && pageVal >= 0
        ? pageVal
        : 0;
    recentReads.push({
      ...item,
      lastPageRead,
    });
  }

  const readingLists = Array.isArray(backup.settings?.user_reading_lists)
    ? backup.settings!.user_reading_lists!
    : [];

  return {
    uid: String(data.uid ?? ''),
    userEmail: data.userEmail ? String(data.userEmail) : null,
    userDisplayName: data.userDisplayName ? String(data.userDisplayName) : null,
    updatedAtLocal: String(data.updatedAtLocal ?? ''),
    appVersion: String(data.appVersion ?? '1.2.8'),
    appBuild: typeof data.appBuild === 'number' ? data.appBuild : undefined,
    rawPayload,
    backup,
    profile,
    avatarDataUrl: avatarBase64 ? `data:image/jpeg;base64,${avatarBase64}` : null,
    bannerDataUrl: bannerBase64 ? `data:image/jpeg;base64,${bannerBase64}` : null,
    favorites,
    recentReads,
    readingLists,
    favoritesCount:
      typeof data.favoritesCount === 'number'
        ? data.favoritesCount
        : favorites.length,
    historyCount:
      typeof data.historyCount === 'number'
        ? data.historyCount
        : Object.keys(historyMap).length,
    readingListsCount:
      typeof data.readingListsCount === 'number'
        ? data.readingListsCount
        : readingLists.length,
    mascotName:
      typeof data.mascotName === 'string' && data.mascotName.trim()
        ? data.mascotName
        : profile.blobatarName || 'Yomi Blob',
  };
}

/**
 * Busca o documento `users/{uid}` do Firestore e valida com o codec `.kuro` v4.
 * Caso o usuário ainda não tenha documento na nuvem, inicializa um estado padrão na sessão web.
 */
export async function fetchUserCloudDoc(
  uid: string,
  userEmail: string | null,
  userDisplayName?: string | null
): Promise<ParsedYomiCloudState> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return createEmptyCloudState(uid, userEmail, userDisplayName);
  }

  const data = snap.data();
  if (typeof data.payload !== 'string' || !data.payload.trim()) {
    const empty = createEmptyCloudState(uid, userEmail, userDisplayName);
    return {
      ...empty,
      profile: {
        ...empty.profile,
        ...(typeof data.profile === 'object' && data.profile ? data.profile : {}),
      },
      userDisplayName: data.userDisplayName
        ? String(data.userDisplayName)
        : empty.userDisplayName,
    };
  }

  return parseRawCloudDocData(data, userEmail);
}

function readTxBackupState(
  snap: DocumentSnapshot,
  uid: string,
  userEmail: string | null
): {
  docExists: boolean;
  existingData: Record<string, any>;
  rawPayload: string;
  decoded: YomiBackupV4;
  wasRawJson: boolean;
} {
  if (snap.exists()) {
    const data = snap.data() ?? {};
    if (
      data.userEmail &&
      userEmail &&
      String(data.userEmail).toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new Error('Os dados na nuvem pertencem a outra conta de e-mail.');
    }
    const existingPayload =
      typeof data.payload === 'string' && data.payload.trim()
        ? data.payload.trim()
        : createEmptyCloudState(uid, userEmail, data.userDisplayName).rawPayload;
    return {
      docExists: true,
      existingData: data,
      rawPayload: existingPayload,
      decoded: decodeKuroBackup(existingPayload),
      wasRawJson: existingPayload.startsWith('{'),
    };
  }

  const empty = createEmptyCloudState(uid, userEmail);
  return {
    docExists: false,
    existingData: {},
    rawPayload: empty.rawPayload,
    decoded: decodeKuroBackup(empty.rawPayload),
    wasRawJson: false,
  };
}

function enrichMangaMetadata(
  decoded: YomiBackupV4,
  manga: YomiMangaEntry
): YomiMangaEntry {
  const cleanId = cleanMangaDexId(manga.id);
  const favMatch =
    decoded.favorites?.[manga.id] ??
    decoded.favorites?.[cleanId] ??
    Object.values(decoded.favorites ?? {}).find(
      (f) => cleanMangaDexId(f.id) === cleanId
    );

  const historyMap = decoded.history ?? {};
  const metaCandidate =
    (historyMap[`manga_meta_${manga.id}`] as YomiMangaEntry | undefined) ??
    (historyMap[`manga_meta_${cleanId}`] as YomiMangaEntry | undefined);

  const recentList = Array.isArray(historyMap.recent_reading_list)
    ? (historyMap.recent_reading_list as YomiRecentReadingItem[])
    : [];
  const recentMatch = recentList.find(
    (item) => cleanMangaDexId(item?.manga?.id ?? '') === cleanId
  )?.manga;

  const base = favMatch ?? metaCandidate ?? recentMatch;
  return {
    ...(base ?? {}),
    ...manga,
    coverFileName: manga.coverFileName ?? base?.coverFileName,
    directCoverUrl: manga.directCoverUrl ?? base?.directCoverUrl,
    directHighResCoverUrl:
      manga.directHighResCoverUrl ?? base?.directHighResCoverUrl,
  };
}

/**
 * Grava progresso de leitura do Quick Reader Web dentro de `payload`
 * utilizando transação do Firestore, preservando capas, perfil e chaves desconhecidas.
 */
export async function saveWebReaderProgressToCloud(
  uid: string,
  userEmail: string | null,
  update: WebReaderProgressUpdate
): Promise<void> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const { docExists, rawPayload, decoded } = readTxBackupState(
      snap,
      uid,
      userEmail
    );

    const enrichedUpdate: WebReaderProgressUpdate = {
      ...update,
      manga: enrichMangaMetadata(decoded, update.manga),
    };

    const { nextPayload, historyCount } = mergeHistoryIntoPayload(
      rawPayload,
      enrichedUpdate
    );

    const baseFields = docExists
      ? {}
      : {
          uid,
          userEmail,
          userDisplayName: decoded.profile?.name ?? 'Leitor YOMI',
          profile: decoded.profile ?? {},
          favoritesCount: 0,
          readingListsCount: 0,
          mascotName: decoded.profile?.blobatarName || 'Kuro',
        };

    tx.set(
      ref,
      {
        ...baseFields,
        payload: nextPayload,
        historyCount,
        updatedAt: serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
      },
      { merge: true }
    );
  });
}

/**
 * Alterna uma obra nos favoritos da nuvem usando transação segura no Firestore.
 */
export async function toggleCloudFavorite(
  uid: string,
  userEmail: string | null,
  manga: YomiMangaEntry
): Promise<{ isFavorite: boolean }> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);
  let nextState = false;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const { docExists, decoded, wasRawJson } = readTxBackupState(
      snap,
      uid,
      userEmail
    );

    const nextFavorites: Record<string, YomiMangaEntry> = {
      ...(decoded.favorites ?? {}),
    };

    const cleanTarget = cleanMangaDexId(manga.id);
    const matchingKey = Object.keys(nextFavorites).find(
      (k) => k === manga.id || cleanMangaDexId(k) === cleanTarget
    );

    if (matchingKey) {
      delete nextFavorites[matchingKey];
      nextState = false;
    } else {
      nextFavorites[manga.id] = enrichMangaMetadata(decoded, manga);
      nextState = true;
    }

    const nextBackup = stripEphemeralCacheForCloud({
      ...decoded,
      version: decoded.version ?? CURRENT_BACKUP_VERSION,
      favorites: nextFavorites,
    });

    const nextPayload = encodeKuroBackup(nextBackup, !wasRawJson);
    const summary = summarizeBackup(nextBackup);

    const baseFields = docExists
      ? {}
      : {
          uid,
          userEmail,
          userDisplayName: decoded.profile?.name ?? 'Leitor YOMI',
          profile: decoded.profile ?? {},
          historyCount: summary.historyCount,
          readingListsCount: summary.readingListsCount,
          mascotName: summary.mascotName,
        };

    tx.set(
      ref,
      {
        ...baseFields,
        payload: nextPayload,
        favoritesCount: summary.favoritesCount,
        updatedAt: serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  return { isFavorite: nextState };
}

/**
 * Salva as coleções personalizadas (`user_reading_lists`) na nuvem.
 */
export async function saveCloudReadingLists(
  uid: string,
  userEmail: string | null,
  readingLists: YomiReadingList[]
): Promise<void> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const { docExists, decoded, wasRawJson } = readTxBackupState(
      snap,
      uid,
      userEmail
    );

    const nextBackup = stripEphemeralCacheForCloud({
      ...decoded,
      version: decoded.version ?? CURRENT_BACKUP_VERSION,
      settings: {
        ...(decoded.settings ?? {}),
        user_reading_lists: readingLists,
      },
    });

    const nextPayload = encodeKuroBackup(nextBackup, !wasRawJson);
    const summary = summarizeBackup(nextBackup);

    const baseFields = docExists
      ? {}
      : {
          uid,
          userEmail,
          userDisplayName: decoded.profile?.name ?? 'Leitor YOMI',
          profile: decoded.profile ?? {},
          favoritesCount: summary.favoritesCount,
          historyCount: summary.historyCount,
          mascotName: summary.mascotName,
        };

    tx.set(
      ref,
      {
        ...baseFields,
        payload: nextPayload,
        readingListsCount: readingLists.length,
        updatedAt: serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
      },
      { merge: true }
    );
  });
}

/**
 * Atualiza perfil e personalização do mascote Blobatar diretamente na nuvem.
 */
export async function updateCloudUserProfile(
  uid: string,
  userEmail: string | null,
  profilePatch: Partial<YomiProfile>
): Promise<void> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const { docExists, existingData, decoded, wasRawJson } = readTxBackupState(
      snap,
      uid,
      userEmail
    );

    const nextProfile: YomiProfile = {
      ...(decoded.profile ?? {}),
      ...(typeof existingData.profile === 'object' && existingData.profile
        ? existingData.profile
        : {}),
      ...profilePatch,
      isConfigured: true,
    };

    const nextBackup = stripEphemeralCacheForCloud({
      ...decoded,
      version: decoded.version ?? CURRENT_BACKUP_VERSION,
      profile: nextProfile,
    });

    const nextPayload = encodeKuroBackup(nextBackup, !wasRawJson);
    const summary = summarizeBackup(nextBackup);

    const baseFields = docExists
      ? {}
      : {
          uid,
          userEmail,
          favoritesCount: summary.favoritesCount,
          historyCount: summary.historyCount,
          readingListsCount: summary.readingListsCount,
        };

    tx.set(
      ref,
      {
        ...baseFields,
        payload: nextPayload,
        profile: nextProfile,
        userDisplayName:
          nextProfile.name || existingData.userDisplayName || 'Leitor YOMI',
        mascotName: nextProfile.blobatarName || 'Kuro',
        updatedAt: serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
      },
      { merge: true }
    );
  });
}

/**
 * Marca ou desmarca um capítulo como lido no histórico sincronizado na nuvem.
 */
export async function toggleChapterReadInCloud(
  uid: string,
  userEmail: string | null,
  manga: YomiMangaEntry,
  chapter: YomiChapterEntry,
  markRead: boolean
): Promise<void> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const { docExists, rawPayload, decoded, wasRawJson } = readTxBackupState(
      snap,
      uid,
      userEmail
    );

    let nextPayload: string;
    let historyCount: number;

    if (markRead) {
      const merged = mergeHistoryIntoPayload(rawPayload, {
        manga: enrichMangaMetadata(decoded, manga),
        chapter,
        pageIndex: Math.max(0, (chapter.pages ?? 1) - 1),
        completed: true,
      });
      nextPayload = merged.nextPayload;
      historyCount = merged.historyCount;
    } else {
      const nextHistory: Record<string, unknown> = {
        ...(decoded.history ?? {}),
      };
      nextHistory[`read_${chapter.id}`] = false;
      const nextBackup = stripEphemeralCacheForCloud({
        ...decoded,
        version: decoded.version ?? CURRENT_BACKUP_VERSION,
        history: nextHistory,
      });
      nextPayload = encodeKuroBackup(nextBackup, !wasRawJson);
      historyCount = Object.keys(nextBackup.history ?? {}).length;
    }

    const baseFields = docExists
      ? {}
      : {
          uid,
          userEmail,
          userDisplayName: decoded.profile?.name ?? 'Leitor YOMI',
          profile: decoded.profile ?? {},
          favoritesCount: 0,
          readingListsCount: 0,
          mascotName: decoded.profile?.blobatarName || 'Kuro',
        };

    tx.set(
      ref,
      {
        ...baseFields,
        payload: nextPayload,
        historyCount,
        updatedAt: serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
      },
      { merge: true }
    );
  });
}

/**
 * Importa um arquivo `.kuro` validado para a nuvem usando transação,
 * preservando `avatarBase64` e `bannerBase64` já salvos no Firestore.
 */
export async function importKuroBackupToCloud(
  uid: string,
  userEmail: string | null,
  userDisplayName: string | null,
  rawKuroInput: string
): Promise<void> {
  const decoded = stripEphemeralCacheForCloud(decodeKuroBackup(rawKuroInput));
  const summary = summarizeBackup(decoded);
  const wasRawJson = rawKuroInput.trim().startsWith('{');
  const compactPayload = encodeKuroBackup(decoded, !wasRawJson);
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const existing = snap.data();
      if (
        existing.userEmail &&
        userEmail &&
        String(existing.userEmail).toLowerCase() !== userEmail.toLowerCase()
      ) {
        throw new Error('Os dados na nuvem pertencem a outra conta de e-mail.');
      }
    }

    tx.set(
      ref,
      {
        uid,
        userEmail,
        userDisplayName,
        payload: compactPayload,
        profile: decoded.profile ?? {},
        favoritesCount: summary.favoritesCount,
        historyCount: summary.historyCount,
        readingListsCount: summary.readingListsCount,
        mascotName: summary.mascotName,
        updatedAt: serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
      },
      { merge: true }
    );
  });
}
