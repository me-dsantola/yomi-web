import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from './client';
import { cleanMangaDexId, fetchMangaDetails, isUuid } from '@/lib/mangadex/api';
import { compareRatings, nextRatingSummary, type RatingSummary } from '@/lib/ratings/ranking';
import type { MangaDexWork } from '@/lib/mangadex/types';

function canonicalWorkId(raw: string): string {
  const id = cleanMangaDexId(raw).toLowerCase();
  if (!isUuid(id)) throw new Error('Esta obra ainda não está disponível para avaliações.');
  return id;
}
export async function fetchWorkRating(workId: string): Promise<RatingSummary | null> {
  const id = canonicalWorkId(workId);
  const snap = await getDoc(doc(getFirebaseClient().db, 'workRatings', id));
  return snap.exists() ? { ...snap.data(), workId: id } as RatingSummary : null;
}
export async function fetchMyRating(workId: string, userId: string): Promise<number | null> {
  if (!userId) return null;
  const snap = await getDoc(doc(getFirebaseClient().db, 'workRatings', canonicalWorkId(workId), 'votes', userId));
  return snap.exists() ? Number(snap.data().score) : null;
}
export async function saveWorkRating(workId: string, userId: string, score: number): Promise<void> {
  if (!userId) throw new Error('Entre na sua conta para avaliar.');
  const id = canonicalWorkId(workId);
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('Escolha uma nota de 1 a 5.');
  const { db } = getFirebaseClient();
  const summaryRef = doc(db, 'workRatings', id);
  const voteRef = doc(summaryRef, 'votes', userId);
  await runTransaction(db, async (tx) => {
    const [summarySnap, voteSnap] = await Promise.all([tx.get(summaryRef), tx.get(voteRef)]);
    const current = summarySnap.exists() ? { ...summarySnap.data(), workId: id } as RatingSummary : null;
    const previous = voteSnap.exists() ? Number(voteSnap.data().score) : null;
    const next = nextRatingSummary(id, current, previous, score);
    tx.set(voteRef, { score, updatedAt: serverTimestamp() });
    tx.set(summaryRef, { ...next, updatedAt: serverTimestamp() });
  });
}
export type CommunityRatedWork = MangaDexWork & { ratingSummary: RatingSummary };
export async function fetchCommunityTrending(): Promise<CommunityRatedWork[]> {
  const snap = await getDocs(query(collection(getFirebaseClient().db, 'workRatings'), orderBy('rankScore', 'desc'), limit(24)));
  const ranked = snap.docs.map((d) => ({ ...d.data(), workId: d.id } as RatingSummary))
    .filter((s) => isUuid(s.workId) && s.count > 0).sort(compareRatings);
  const works: CommunityRatedWork[] = [];
  for (let start = 0; start < ranked.length && works.length < 5; start += 2) {
    const resolved = await Promise.allSettled(ranked.slice(start, start + 2).map(async (summary) => ({
      ...await fetchMangaDetails(summary.workId), ratingSummary: summary,
    })));
    works.push(...resolved.flatMap((result) => result.status === 'fulfilled' && ['safe', 'suggestive'].includes(result.value.contentRating) ? [result.value] : []));
  }
  return works.slice(0, 5);
}
