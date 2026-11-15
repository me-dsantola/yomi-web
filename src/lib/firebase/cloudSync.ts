import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from './client';
import {
  decodeKuroBackup,
  mergeHistoryIntoPayload,
  summarizeBackup,
  type WebReaderProgressUpdate,
  type YomiBackupV4,
  type YomiMangaEntry,
  type YomiProfile,
  type YomiReadingList,
  type YomiRecentReadingItem,
} from '@/lib/backup/kuroCodec';

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

export function parseRawCloudDocData(
  data: Record<string, any>,
  expectedEmail?: string | null
): ParsedYomiCloudState {
  // Segurança de conta: valida que doc.userEmail pertence ao e-mail autenticado
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

  const recentReads = rawRecent.map((item) => {
    const chId = item.chapter?.id ?? '';
    const pageVal = historyMap[`page_${chId}`];
    const lastPageRead =
      typeof pageVal === 'number' && Number.isInteger(pageVal) && pageVal >= 0
        ? pageVal
        : 0;
    return {
      ...item,
      lastPageRead,
    };
  });

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
 * Retorna `null` caso o usuário ainda não tenha sincronizado o app móvel.
 */
export async function fetchUserCloudDoc(
  uid: string,
  userEmail: string | null
): Promise<ParsedYomiCloudState | null> {
  const { db } = getFirebaseClient();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return parseRawCloudDocData(snap.data(), userEmail);
}

/**
 * Fase 6: Grava progresso de leitura do Quick Reader Web dentro de `payload`
 * utilizando transação do Firestore, preservando `avatarBase64`, `bannerBase64`,
 * `profile` e chaves desconhecidas.
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
    if (!snap.exists()) {
      return;
    }
    const data = snap.data();
    if (
      data.userEmail &&
      userEmail &&
      String(data.userEmail).toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new Error('Conflito de e-mail na conta da nuvem.');
    }

    const currentPayload = typeof data.payload === 'string' ? data.payload : '';
    if (!currentPayload) return;

    const { nextPayload, historyCount } = mergeHistoryIntoPayload(
      currentPayload,
      update
    );

    tx.set(
      ref,
      {
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
 * Fase 6: Importa um arquivo `.kuro` validado para a nuvem usando transação,
 * preservando `avatarBase64` e `bannerBase64` já salvos no Firestore.
 */
export async function importKuroBackupToCloud(
  uid: string,
  userEmail: string | null,
  userDisplayName: string | null,
  rawKuroInput: string
): Promise<void> {
  const decoded = decodeKuroBackup(rawKuroInput);
  const summary = summarizeBackup(decoded);
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
        payload: rawKuroInput.trim(),
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
