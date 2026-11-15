import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockDocRecord {
  id: string;
  data: Record<string, unknown>;
}

const mockStore = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  nextId: 1,
  failAddDocWith: null as Error | null,
  failGetDocsWith: null as Error | null,
  txLock: Promise.resolve(),
}));

function cloneDocData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      out[key] = [...val];
    } else if (val && typeof val === 'object') {
      out[key] = { ...(val as Record<string, unknown>) };
    } else {
      out[key] = val;
    }
  }
  return out;
}

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClient: () => ({ db: { __mockDb: true } }),
}));

vi.mock('firebase/firestore', () => {
  const collection = (_db: unknown, name: string) => ({ name });
  const doc = (_db: unknown, name: string, id: string) => ({ name, id });
  const where = (field: string, op: string, value: unknown) => ({
    type: 'where',
    field,
    op,
    value,
  });
  const limit = (count: number) => ({ type: 'limit', count });
  const query = (colRef: { name: string }, ...constraints: Array<Record<string, unknown>>) => ({
    colRef,
    constraints,
  });

  const addDoc = async (
    _colRef: { name: string },
    payload: Record<string, unknown>
  ) => {
    if (mockStore.failAddDocWith) {
      throw mockStore.failAddDocWith;
    }
    const id = `doc_${mockStore.nextId++}`;
    mockStore.docs.set(id, cloneDocData(payload));
    return { id };
  };

  const getDoc = async (docRef: { id: string }) => {
    const data = mockStore.docs.get(docRef.id);
    return {
      id: docRef.id,
      exists: () => data !== undefined,
      data: () => (data ? cloneDocData(data) : undefined),
    };
  };

  const getDocs = async (q: {
    constraints: Array<{ type: string; field?: string; op?: string; value?: unknown; count?: number }>;
  }) => {
    if (mockStore.failGetDocsWith) {
      throw mockStore.failGetDocsWith;
    }
    const records: MockDocRecord[] = [];
    for (const [id, data] of mockStore.docs.entries()) {
      let matches = true;
      for (const c of q.constraints) {
        if (c.type === 'where' && c.field) {
          const val = data[c.field];
          if (c.op === '==') {
            matches = val === c.value;
          } else if (c.op === 'in' && Array.isArray(c.value)) {
            matches = c.value.includes(val);
          }
          if (!matches) break;
        }
      }
      if (matches) {
        records.push({ id, data: cloneDocData(data) });
      }
    }
    const limitConstraint = q.constraints.find((c) => c.type === 'limit');
    const limited =
      typeof limitConstraint?.count === 'number'
        ? records.slice(0, limitConstraint.count)
        : records;

    return {
      docs: limited.map((item) => ({
        id: item.id,
        data: () => item.data,
      })),
    };
  };

  const deleteDoc = async (docRef: { id: string }) => {
    mockStore.docs.delete(docRef.id);
  };

  const runTransaction = async <T>(
    _db: unknown,
    updater: (tx: {
      get: (docRef: { id: string }) => Promise<{
        id: string;
        exists: () => boolean;
        data: () => Record<string, unknown> | undefined;
      }>;
      update: (docRef: { id: string }, patch: Record<string, unknown>) => void;
    }) => Promise<T>
  ): Promise<T> => {
    let release!: () => void;
    const prev = mockStore.txLock;
    mockStore.txLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      const tx = {
        get: async (docRef: { id: string }) => getDoc(docRef),
        update: (docRef: { id: string }, patch: Record<string, unknown>) => {
          const existing = mockStore.docs.get(docRef.id) ?? {};
          mockStore.docs.set(docRef.id, {
            ...existing,
            ...cloneDocData(patch),
          });
        },
      };
      return await updater(tx);
    } finally {
      release();
    }
  };

  return {
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
  };
});

import {
  COMMENT_MAX_LENGTH,
  deleteComment,
  fetchComments,
  fetchCommentsPage,
  normalizeCommentTargetId,
  parseCreatedAtMs,
  postComment,
  readLocalCommentDrafts,
  removeLocalCommentDraft,
  saveLocalCommentDraft,
  toggleLikeComment,
} from '@/lib/firebase/comments';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

describe('Sistema de Comentários (Persistência Real, Segurança e Paginação)', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStore.docs.clear();
    mockStore.nextId = 1;
    mockStore.failAddDocWith = null;
    mockStore.failGetDocsWith = null;
    vi.stubGlobal('window', { localStorage: createMemoryStorage() });
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      vi.unstubAllGlobals();
    } else {
      vi.stubGlobal('window', originalWindow);
    }
  });

  it('normaliza targetId canônico para obra e capítulo e publica comentário no Firestore', async () => {
    const mangaTarget = normalizeCommentTargetId(
      'cmk_mdx_32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
      'manga'
    );
    expect(mangaTarget).toBe('32d76d19-8a05-4db0-9fc2-e0b0648fe9d0');

    const created = await postComment({
      targetId: 'cmk_mdx_32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
      targetType: 'manga',
      userId: 'uid-leitor-1',
      userName: 'Satoru',
      mascotColorId: '#FF2A55',
      text: 'Excelente adaptação visual!',
      isSpoiler: true,
    });

    expect(created.id).toBe('doc_1');
    expect(created.targetId).toBe(mangaTarget);
    expect(created.likes).toBe(0);
    expect(created.likedBy).toEqual([]);
    expect(created.isSpoiler).toBe(true);

    const fetched = await fetchComments(mangaTarget, 'manga');
    expect(fetched).toHaveLength(1);
    expect(fetched[0].text).toBe('Excelente adaptação visual!');
  });

  it('rejeita envio vazio, acima de 800 caracteres ou sem autenticação', async () => {
    await expect(
      postComment({
        targetId: 'manga-1',
        targetType: 'manga',
        userId: '',
        userName: 'Anon',
        text: 'Olá',
        isSpoiler: false,
      })
    ).rejects.toThrow(/autenticado/i);

    await expect(
      postComment({
        targetId: 'manga-1',
        targetType: 'manga',
        userId: 'uid-1',
        userName: 'Leitor',
        text: '   ',
        isSpoiler: false,
      })
    ).rejects.toThrow(/vazio/i);

    await expect(
      postComment({
        targetId: 'manga-1',
        targetType: 'manga',
        userId: 'uid-1',
        userName: 'Leitor',
        text: 'a'.repeat(COMMENT_MAX_LENGTH + 1),
        isSpoiler: false,
      })
    ).rejects.toThrow(/800/);
  });

  it('propaga falha do Firestore sem criar falso comentário publicado', async () => {
    mockStore.failAddDocWith = new Error('Firestore permission-denied');

    await expect(
      postComment({
        targetId: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
        targetType: 'manga',
        userId: 'uid-1',
        userName: 'Kuro',
        text: 'Texto que não deve sumir nem fingir envio',
        isSpoiler: false,
      })
    ).rejects.toThrow(/permission-denied/i);

    const fetched = await fetchComments(
      '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
      'manga'
    );
    expect(fetched).toHaveLength(0);
    expect(
      readLocalCommentDrafts('32d76d19-8a05-4db0-9fc2-e0b0648fe9d0', 'manga')
    ).toHaveLength(0);
  });

  it('preserva rascunhos locais separados dos comentários públicos e permite remoção após migração', () => {
    const draft = saveLocalCommentDraft({
      targetId: 'cmk_mdx_manga-abc',
      targetType: 'manga',
      userId: 'uid-1',
      userName: 'Kuro',
      text: 'Rascunho offline importante',
      isSpoiler: false,
    });

    expect(draft.id.startsWith('local_')).toBe(true);
    expect(draft.isLocalDraft).toBe(true);

    const drafts = readLocalCommentDrafts('manga-abc', 'manga');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].isLocalDraft).toBe(true);
    expect(drafts[0].text).toBe('Rascunho offline importante');

    removeLocalCommentDraft('manga-abc', draft.id, 'manga');
    expect(readLocalCommentDrafts('manga-abc', 'manga')).toHaveLength(0);
  });

  it('permite exclusão apenas ao autor (ou moderador) e bloqueia usuários não autorizados', async () => {
    const created = await postComment({
      targetId: 'manga-xyz',
      targetType: 'manga',
      userId: 'author-uid',
      userName: 'Autora',
      text: 'Meu comentário',
      isSpoiler: false,
    });

    await expect(
      deleteComment({
        commentId: created.id,
        targetId: 'manga-xyz',
        userId: 'intruder-uid',
        targetType: 'manga',
      })
    ).rejects.toThrow(/próprios comentários/i);

    expect(mockStore.docs.has(created.id)).toBe(true);

    await deleteComment({
      commentId: created.id,
      targetId: 'manga-xyz',
      userId: 'author-uid',
      targetType: 'manga',
    });

    expect(mockStore.docs.has(created.id)).toBe(false);
  });

  it('executa curtidas concorrentes via transação mantendo likes === likedBy.length', async () => {
    const created = await postComment({
      targetId: 'manga-like',
      targetType: 'manga',
      userId: 'author-uid',
      userName: 'Leitor',
      text: 'Capítulo incrível',
      isSpoiler: false,
    });

    const [res1, res2] = await Promise.all([
      toggleLikeComment({
        commentId: created.id,
        targetId: 'manga-like',
        userId: 'uid-A',
      }),
      toggleLikeComment({
        commentId: created.id,
        targetId: 'manga-like',
        userId: 'uid-B',
      }),
    ]);

    expect([res1.liked, res2.liked]).toEqual([true, true]);

    const stored = mockStore.docs.get(created.id)!;
    expect(stored.likes).toBe(2);
    expect(stored.likedBy).toEqual(['uid-A', 'uid-B']);

    const unlikeRes = await toggleLikeComment({
      commentId: created.id,
      targetId: 'manga-like',
      userId: 'uid-A',
    });
    expect(unlikeRes.liked).toBe(false);
    expect(unlikeRes.likes).toBe(1);
    expect(unlikeRes.likedBy).toEqual(['uid-B']);
  });

  it('suporta timestamps do Firestore/Flutter, ordenação decrescente e paginação por cursor', async () => {
    // Timestamp no formato Firestore/Flutter
    expect(parseCreatedAtMs({ toMillis: () => 1_700_000_000_123 })).toBe(
      1_700_000_000_123
    );
    expect(parseCreatedAtMs({ seconds: 1_700_000_000, nanoseconds: 0 })).toBe(
      1_700_000_000_000
    );

    const targetId = 'manga-paginado';
    for (let i = 1; i <= 25; i++) {
      mockStore.docs.set(`c_${String(i).padStart(2, '0')}`, {
        targetId,
        targetType: 'manga',
        userId: 'uid-x',
        userName: `Leitor ${i}`,
        text: `Comentário #${i}`,
        isSpoiler: i % 5 === 0,
        likes: 0,
        likedBy: [],
        createdAt: { toMillis: () => 1_700_000_000_000 + i * 1000 },
      });
    }

    const page1 = await fetchCommentsPage(targetId, {
      targetType: 'manga',
      pageSize: 15,
    });
    expect(page1.comments).toHaveLength(15);
    expect(page1.hasMore).toBe(true);
    expect(page1.totalCount).toBe(25);
    expect(page1.comments[0].text).toBe('Comentário #25');
    expect(page1.comments[0].isSpoiler).toBe(true);

    const page2 = await fetchCommentsPage(targetId, {
      targetType: 'manga',
      pageSize: 15,
      cursorCreatedAt: page1.nextCursor,
    });
    expect(page2.comments).toHaveLength(10);
    expect(page2.hasMore).toBe(false);
    expect(page2.comments[0].text).toBe('Comentário #10');
    expect(page2.comments[9].text).toBe('Comentário #1');
  });
});
