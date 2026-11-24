export interface RatingSummary {
  workId: string;
  count: number;
  total: number;
  rankScore: number;
}
export function ratingRankScore(total: number, count: number): number {
  return (total + 17.5) / (count + 5);
}
export function nextRatingSummary(workId: string, current: RatingSummary | null, previous: number | null, score: number): RatingSummary {
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('Escolha uma nota de 1 a 5.');
  const count = (current?.count ?? 0) + (previous === null ? 1 : 0);
  const total = (current?.total ?? 0) + score - (previous ?? 0);
  return { workId, count, total, rankScore: ratingRankScore(total, count) };
}
export function compareRatings(a: RatingSummary, b: RatingSummary): number {
  return b.rankScore - a.rankScore || b.count - a.count || a.workId.localeCompare(b.workId);
}
