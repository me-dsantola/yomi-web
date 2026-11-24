import { afterEach, expect, it, vi } from 'vitest';
import { readLocalCommentDrafts, removeLocalCommentDraft } from '@/lib/firebase/comments';

afterEach(() => vi.unstubAllGlobals());

it('recovers and removes legacy drafts from a canonical route without touching unrelated drafts', () => {
  const values = new Map([
    ['yomi-comments-v1:cmk_mdx_work-1', JSON.stringify([{ id: 'local_old', targetId: 'cmk_mdx_work-1', targetType: 'manga', userId: 'reader', text: 'Legacy draft', createdAt: 1700000000000 }])],
    ['yomi-comments-v1:work-2', JSON.stringify([{ id: 'local_other', text: 'Other draft' }])],
  ]);
  vi.stubGlobal('window', { localStorage: {
    get length() { return values.size; },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  const drafts = readLocalCommentDrafts('work-1', 'manga');
  expect(drafts).toHaveLength(1);
  expect(drafts[0]).toMatchObject({ id: 'local_old', text: 'Legacy draft', isLocalDraft: true });
  removeLocalCommentDraft('work-1', 'local_old', 'manga');
  expect(readLocalCommentDrafts('work-1', 'manga')).toEqual([]);
  expect(values.has('yomi-comments-v1:work-2')).toBe(true);
});
