import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { cleanMangaDexId } from '@/lib/mangadex/api';
import { getFirebaseClient } from './client';

export type CommentTargetType = 'manga' | 'chapter';

export const COMMENT_MAX_LENGTH = 800;
export const COMMENTS_PAGE_SIZE = 15;

export interface YomiComment {
  id: string;
  targetId: string;
  targetType: CommentTargetType;
  userId: string;
  userName: string;
  userPhotoUrl?: string | null;
  mascotColorId?: string;
  mascotExpressionId?: string;
  mascotShapeId?: string;
  text: string;
  isSpoiler: boolean;
  likes: number;
  likedBy: string[];
  createdAt: number;
  isLocalDraft?: boolean;
}

export interface CommentsPageResult {
  comments: YomiComment[];
  hasMore: boolean;
  nextCursor: number | null;
  totalCount: number;
}

export interface PostCommentInput {
  targetId: string;
  targetType: CommentTargetType;
  userId: string;
  userName: string;
  userPhotoUrl?: string | null;
  mascotColorId?: string;
  mascotExpressionId?: string;
  mascotShapeId?: string;
  text: string;
  isSpoiler: boolean;
}

const LOCAL_STORAGE_PREFIX = 'yomi-comments-v1:';
const LEGACY_CHAPTER_PREFIX_RE = /^(cmk_mdx_|hq_mdx_|ani_mdx_|mal_mdx_)+/i;

/**
 * Normaliza o `targetId` para garantir que Web e App Flutter apontem para
 * o mesmo documento alvo no Firestore, independentemente de prefixos legados.
 */
export function normalizeCommentTargetId(
  targetId: string,
  targetType: CommentTargetType = 'manga'
): string {
  const trimmed = String(targetId ?? '').trim();
  if (!trimmed) return '';
  if (targetType === 'manga') {
    return cleanMangaDexId(trimmed);
  }
  return trimmed.replace(LEGACY_CHAPTER_PREFIX_RE, '');
}

/**
 * Converte timestamps em epoch ms, Firestore Timestamp ou string ISO para epoch ms.
 */
export function parseCreatedAtMs(raw: unknown, fallbackMs = Date.now()): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Suporta eventuais timestamps em segundos (Unix epoch < 1e11)
    if (raw > 0 && raw < 100_000_000_000) {
      return Math.round(raw * 1000);
    }
    return Math.round(raw);
  }
  if (raw && typeof raw === 'object') {
    const maybeObj = raw as {
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
    };
    if (typeof maybeObj.toMillis === 'function') {
      const ms = maybeObj.toMillis();
      if (Number.isFinite(ms)) return Math.round(ms);
    }
    const secs =
      typeof maybeObj.seconds === 'number'
        ? maybeObj.seconds
        : typeof maybeObj._seconds === 'number'
          ? maybeObj._seconds
          : undefined;
    if (typeof secs === 'number' && Number.isFinite(secs)) {
      const ns = typeof maybeObj.nanoseconds === 'number' ? maybeObj.nanoseconds : 0;
      return Math.round(secs * 1000 + ns / 1_000_000);
    }
  }
  if (typeof raw === 'string' && raw.trim()) {
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) {
      return parseCreatedAtMs(asNum, fallbackMs);
    }
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallbackMs;
}

function normalizeLikedBy(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const val = String(item ?? '').trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      out.push(val);
    }
  }
  return out;
}

function mapRawCommentDoc(
  id: string,
  data: Record<string, unknown>,
  fallbackTargetId: string,
  isLocalDraft = false
): YomiComment {
  const targetType: CommentTargetType =
    data.targetType === 'chapter' ? 'chapter' : 'manga';
  const likedBy = normalizeLikedBy(data.likedBy);
  const rawLikes = Number(data.likes);
  const likes =
    Number.isFinite(rawLikes) && rawLikes >= likedBy.length
      ? Math.max(0, Math.floor(rawLikes))
      : likedBy.length;

  return {
    id,
    targetId: normalizeCommentTargetId(
      String(data.targetId ?? fallbackTargetId),
      targetType
    ),
    targetType,
    userId: String(data.userId ?? '').trim(),
    userName: String(data.userName ?? '').trim() || 'Leitor',
    userPhotoUrl:
      typeof data.userPhotoUrl === 'string' && data.userPhotoUrl.trim()
        ? data.userPhotoUrl.trim()
        : null,
    mascotColorId:
      typeof data.mascotColorId === 'string' && data.mascotColorId.trim()
        ? data.mascotColorId.trim()
        : undefined,
    mascotExpressionId:
      typeof data.mascotExpressionId === 'string' && data.mascotExpressionId.trim()
        ? data.mascotExpressionId.trim()
        : undefined,
    mascotShapeId:
      typeof data.mascotShapeId === 'string' && data.mascotShapeId.trim()
        ? data.mascotShapeId.trim()
        : undefined,
    text: String(data.text ?? ''),
    isSpoiler: Boolean(data.isSpoiler),
    likes,
    likedBy,
    createdAt: parseCreatedAtMs(data.createdAt),
    ...(isLocalDraft ? { isLocalDraft: true } : {}),
  };
}

function getLocalStorageKeys(
  targetId: string,
  targetType: CommentTargetType
): string[] {
  const raw = String(targetId ?? '').trim();
  const canonical = normalizeCommentTargetId(raw, targetType);
  const keys = new Set<string>();
  if (canonical) keys.add(`${LOCAL_STORAGE_PREFIX}${canonical}`);
  if (raw) keys.add(`${LOCAL_STORAGE_PREFIX}${raw}`);
  // Recover drafts saved under legacy target IDs when the current route is canonical.
  if (canonical && typeof window !== 'undefined') {
    try {
      const storage = window.localStorage;
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (
          key?.startsWith(LOCAL_STORAGE_PREFIX) &&
          normalizeCommentTargetId(key.slice(LOCAL_STORAGE_PREFIX.length), targetType) === canonical
        ) {
          keys.add(key);
        }
      }
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }
  return Array.from(keys);
}

/**
 * Lê rascunhos locais não publicados (incluindo eventuais itens legados de `yomi-comments-v1:*`)
 * preservando-os separados da lista pública do Firestore até o usuário publicar ou descartar.
 */
export function readLocalCommentDrafts(
  targetId: string,
  targetType: CommentTargetType = 'manga'
): YomiComment[] {
  if (typeof window === 'undefined') return [];
  const canonical = normalizeCommentTargetId(targetId, targetType);
  const byId = new Map<string, YomiComment>();

  for (const key of getLocalStorageKeys(targetId, targetType)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const id = String((item as { id?: unknown }).id ?? '').trim();
        const text = String((item as { text?: unknown }).text ?? '').trim();
        if (!id || !text) continue;
        byId.set(
          id,
          mapRawCommentDoc(id, item as Record<string, unknown>, canonical, true)
        );
      }
    } catch {
      // Ignora JSON inválido sem quebrar a página
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function saveLocalCommentDraft(
  input: Omit<PostCommentInput, 'isSpoiler'> & { isSpoiler?: boolean }
): YomiComment {
  const canonicalTargetId = normalizeCommentTargetId(
    input.targetId,
    input.targetType
  );
  const trimmed = input.text.trim();
  if (!trimmed) {
    throw new Error('O rascunho não pode estar vazio.');
  }

  const now = Date.now();
  const draft: YomiComment = {
    id: `local_${now}_${Math.random().toString(36).slice(2, 8)}`,
    targetId: canonicalTargetId,
    targetType: input.targetType,
    userId: input.userId.trim(),
    userName: input.userName.trim() || 'Leitor YOMI',
    ...(input.userPhotoUrl ? { userPhotoUrl: input.userPhotoUrl } : {}),
    ...(input.mascotColorId ? { mascotColorId: input.mascotColorId } : {}),
    ...(input.mascotExpressionId
      ? { mascotExpressionId: input.mascotExpressionId }
      : {}),
    ...(input.mascotShapeId ? { mascotShapeId: input.mascotShapeId } : {}),
    text: trimmed.slice(0, COMMENT_MAX_LENGTH),
    isSpoiler: Boolean(input.isSpoiler),
    likes: 0,
    likedBy: [],
    createdAt: now,
    isLocalDraft: true,
  };

  if (typeof window !== 'undefined' && canonicalTargetId) {
    try {
      const existing = readLocalCommentDrafts(canonicalTargetId, input.targetType);
      const next = [draft, ...existing.filter((d) => d.id !== draft.id)].slice(
        0,
        40
      );
      window.localStorage.setItem(
        `${LOCAL_STORAGE_PREFIX}${canonicalTargetId}`,
        JSON.stringify(next)
      );
    } catch {
      // Ignora limite de quota do localStorage
    }
  }

  return draft;
}

export function removeLocalCommentDraft(
  targetId: string,
  draftId: string,
  targetType: CommentTargetType = 'manga'
): void {
  if (typeof window === 'undefined') return;
  for (const key of getLocalStorageKeys(targetId, targetType)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      const filtered = parsed.filter(
        (item) => String((item as { id?: unknown })?.id ?? '') !== draftId
      );
      if (filtered.length === 0) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {
      // Ignora erro de armazenamento local
    }
  }
}

export async function fetchCommentsPage(
  targetId: string,
  options: {
    targetType?: CommentTargetType;
    pageSize?: number;
    cursorCreatedAt?: number | null;
  } = {}
): Promise<CommentsPageResult> {
  const targetType = options.targetType ?? 'manga';
  const pageSize = Math.max(1, Math.min(options.pageSize ?? COMMENTS_PAGE_SIZE, 100));
  const rawTrimmed = String(targetId ?? '').trim();
  const canonicalId = normalizeCommentTargetId(rawTrimmed, targetType);

  if (!canonicalId) {
    return {
      comments: [],
      hasMore: false,
      nextCursor: null,
      totalCount: 0,
    };
  }

  const targetCandidates = Array.from(
    new Set([canonicalId, rawTrimmed].filter(Boolean))
  );

  const { db } = getFirebaseClient();
  const constraints: QueryConstraint[] = [
    targetCandidates.length > 1
      ? where('targetId', 'in', targetCandidates.slice(0, 10))
      : where('targetId', '==', canonicalId),
    limit(300),
  ];

  const q = query(collection(db, 'comments'), ...constraints);
  const snap = await getDocs(q);

  const byId = new Map<string, YomiComment>();
  for (const d of snap.docs) {
    const rawData = (d.data() ?? {}) as Record<string, unknown>;
    const mapped = mapRawCommentDoc(d.id, rawData, canonicalId, false);
    if (mapped.targetType === targetType || rawData.targetType == null) {
      byId.set(d.id, mapped);
    }
  }

  const allSorted = Array.from(byId.values()).sort((a, b) => {
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return b.id.localeCompare(a.id);
  });

  const filteredByCursor =
    typeof options.cursorCreatedAt === 'number' &&
    Number.isFinite(options.cursorCreatedAt)
      ? allSorted.filter((c) => c.createdAt < options.cursorCreatedAt!)
      : allSorted;

  const pageItems = filteredByCursor.slice(0, pageSize);
  const hasMore = filteredByCursor.length > pageItems.length;
  const nextCursor =
    hasMore && pageItems.length > 0
      ? pageItems[pageItems.length - 1].createdAt
      : null;

  return {
    comments: pageItems,
    hasMore,
    nextCursor,
    totalCount: allSorted.length,
  };
}

export async function fetchComments(
  targetId: string,
  targetType: CommentTargetType = 'manga'
): Promise<YomiComment[]> {
  const result = await fetchCommentsPage(targetId, {
    targetType,
    pageSize: 100,
  });
  return result.comments;
}

export async function postComment(
  input: PostCommentInput
): Promise<YomiComment> {
  const userId = String(input.userId ?? '').trim();
  if (!userId) {
    throw new Error('Você precisa estar autenticado para publicar um comentário.');
  }

  const canonicalTargetId = normalizeCommentTargetId(
    input.targetId,
    input.targetType
  );
  if (!canonicalTargetId) {
    throw new Error('Destino do comentário inválido.');
  }

  const trimmed = String(input.text ?? '').trim();
  if (!trimmed) {
    throw new Error('O comentário não pode estar vazio.');
  }
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    throw new Error(
      `O comentário excede o limite de ${COMMENT_MAX_LENGTH} caracteres.`
    );
  }

  const now = Date.now();
  const payload: Record<string, unknown> = {
    targetId: canonicalTargetId.slice(0, 160),
    targetType: input.targetType,
    userId,
    userName: (input.userName.trim() || 'Leitor YOMI').slice(0, 100),
    text: trimmed,
    isSpoiler: Boolean(input.isSpoiler),
    likes: 0,
    likedBy: [] as string[],
    createdAt: now,
  };

  if (input.userPhotoUrl?.trim()) {
    payload.userPhotoUrl = input.userPhotoUrl.trim();
  }
  if (input.mascotColorId?.trim()) {
    payload.mascotColorId = input.mascotColorId.trim();
  }
  if (input.mascotExpressionId?.trim()) {
    payload.mascotExpressionId = input.mascotExpressionId.trim();
  }
  if (input.mascotShapeId?.trim()) {
    payload.mascotShapeId = input.mascotShapeId.trim();
  }

  const { db } = getFirebaseClient();
  const docRef = await addDoc(collection(db, 'comments'), payload);

  return {
    id: docRef.id,
    targetId: canonicalTargetId,
    targetType: input.targetType,
    userId,
    userName: String(payload.userName),
    userPhotoUrl:
      typeof payload.userPhotoUrl === 'string' ? payload.userPhotoUrl : null,
    mascotColorId:
      typeof payload.mascotColorId === 'string'
        ? payload.mascotColorId
        : undefined,
    mascotExpressionId:
      typeof payload.mascotExpressionId === 'string'
        ? payload.mascotExpressionId
        : undefined,
    mascotShapeId:
      typeof payload.mascotShapeId === 'string'
        ? payload.mascotShapeId
        : undefined,
    text: trimmed,
    isSpoiler: Boolean(input.isSpoiler),
    likes: 0,
    likedBy: [],
    createdAt: now,
  };
}

export async function toggleLikeComment(input: {
  commentId: string;
  targetId: string;
  userId: string;
  currentlyLiked?: boolean;
}): Promise<{
  commentId: string;
  liked: boolean;
  likes: number;
  likedBy: string[];
}> {
  const userId = String(input.userId ?? '').trim();
  if (!userId) {
    throw new Error('Você precisa entrar na sua conta para curtir comentários.');
  }

  const commentId = String(input.commentId ?? '').trim();
  if (!commentId) {
    throw new Error('Comentário inválido.');
  }
  if (commentId.startsWith('local_')) {
    throw new Error('Publique o rascunho local antes de curtir.');
  }

  const { db } = getFirebaseClient();
  const ref = doc(db, 'comments', commentId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error('Este comentário não está mais disponível.');
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const currentLikedBy = normalizeLikedBy(data.likedBy);
    const alreadyLiked = currentLikedBy.includes(userId);
    const nextLikedBy = alreadyLiked
      ? currentLikedBy.filter((uid) => uid !== userId)
      : [...currentLikedBy, userId];

    const nextLikes = nextLikedBy.length;
    tx.update(ref, {
      likedBy: nextLikedBy,
      likes: nextLikes,
    });

    return {
      commentId,
      liked: !alreadyLiked,
      likes: nextLikes,
      likedBy: nextLikedBy,
    };
  });
}

export async function deleteComment(input: {
  commentId: string;
  targetId: string;
  userId: string;
  targetType?: CommentTargetType;
  isModerator?: boolean;
}): Promise<void> {
  const commentId = String(input.commentId ?? '').trim();
  if (!commentId) {
    throw new Error('Comentário inválido.');
  }

  if (commentId.startsWith('local_')) {
    removeLocalCommentDraft(
      input.targetId,
      commentId,
      input.targetType ?? 'manga'
    );
    return;
  }

  const userId = String(input.userId ?? '').trim();
  if (!userId) {
    throw new Error('Você precisa entrar na sua conta para excluir comentários.');
  }

  const { db } = getFirebaseClient();
  const ref = doc(db, 'comments', commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Comentário não encontrado.');
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const authorId = String(data.userId ?? '').trim();
  if (authorId !== userId && input.isModerator !== true) {
    throw new Error('Você só pode excluir seus próprios comentários.');
  }

  await deleteDoc(ref);
}
