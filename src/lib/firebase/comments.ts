import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseClient } from './client';

export type CommentTargetType = 'manga' | 'chapter';

export interface YomiComment {
  id: string;
  targetId: string;
  targetType: CommentTargetType;
  userId: string;
  userName: string;
  text: string;
  isSpoiler: boolean;
  likes: number;
  likedBy: string[];
  createdAt: number;
}

const LOCAL_STORAGE_PREFIX = 'yomi-comments-v1:';

function readLocalComments(targetId: string): YomiComment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${targetId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalComments(targetId: string, list: YomiComment[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${targetId}`,
      JSON.stringify(list.slice(0, 80))
    );
  } catch {
    // Ignora cota cheia / ambiente restrito
  }
}

function mergeComments(
  remote: YomiComment[],
  local: YomiComment[]
): YomiComment[] {
  const byId = new Map<string, YomiComment>();
  for (const c of local) byId.set(c.id, c);
  for (const c of remote) byId.set(c.id, c);
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchComments(targetId: string): Promise<YomiComment[]> {
  try {
    const { db } = getFirebaseClient();
    const q = query(
      collection(db, 'comments'),
      where('targetId', '==', targetId),
      limit(60)
    );
    const snap = await getDocs(q);
    const remote: YomiComment[] = snap.docs.map((d) => {
      const data = d.data() ?? {};
      return {
        id: d.id,
        targetId: String(data.targetId ?? targetId),
        targetType: data.targetType === 'chapter' ? 'chapter' : 'manga',
        userId: String(data.userId ?? ''),
        userName: String(data.userName ?? 'Leitor'),
        text: String(data.text ?? ''),
        isSpoiler: Boolean(data.isSpoiler),
        likes: Number(data.likes ?? 0),
        likedBy: Array.isArray(data.likedBy) ? data.likedBy.map(String) : [],
        createdAt: Number(data.createdAt ?? Date.now()),
      };
    });
    return remote.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    throw new Error('Não foi possível carregar os comentários. Verifique a conexão e tente novamente.');
  }
}

export async function postComment(input: {
  targetId: string;
  targetType: CommentTargetType;
  userId: string;
  userName: string;
  text: string;
  isSpoiler: boolean;
}): Promise<YomiComment> {
  const trimmed = input.text.trim();
  if (!trimmed) {
    throw new Error('O comentário não pode estar vazio.');
  }

  const now = Date.now();
  const basePayload = {
    targetId: input.targetId,
    targetType: input.targetType,
    userId: input.userId,
    userName: input.userName.trim() || 'Leitor YOMI',
    text: trimmed.slice(0, 800),
    isSpoiler: input.isSpoiler,
    likes: 0,
    likedBy: [] as string[],
    createdAt: now,
  };

  const { db } = getFirebaseClient();
  const docRef = await addDoc(collection(db, 'comments'), basePayload);
  return { id: docRef.id, ...basePayload };
}

export async function toggleLikeComment(input: {
  commentId: string;
  targetId: string;
  userId: string;
  currentlyLiked: boolean;
}): Promise<void> {
  if (input.commentId.startsWith('local_')) {
    throw new Error('Este comentário não foi publicado no servidor.');
  }
  const { db } = getFirebaseClient();
  const ref = doc(db, 'comments', input.commentId);
  await updateDoc(ref, {
    likedBy: input.currentlyLiked
      ? arrayRemove(input.userId)
      : arrayUnion(input.userId),
    likes: increment(input.currentlyLiked ? -1 : 1),
  });
}

export async function deleteComment(input: {
  commentId: string;
  targetId: string;
}): Promise<void> {
  if (input.commentId.startsWith('local_')) {
    throw new Error('Este comentário não foi publicado no servidor.');
  }
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, 'comments', input.commentId));
}
