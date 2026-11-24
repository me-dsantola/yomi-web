import { describe, expect, it } from 'vitest';
import { compareRatings, nextRatingSummary, ratingRankScore } from '@/lib/ratings/ranking';
describe('Community rating ranking', () => {
  it('creates one vote and updates its score without increasing the count', () => {
    const first = nextRatingSummary('work', null, null, 5);
    expect(first).toMatchObject({ count: 1, total: 5 });
    const edited = nextRatingSummary('work', first, 5, 2);
    expect(edited).toMatchObject({ count: 1, total: 2 });
    expect(edited.rankScore).toBe(ratingRankScore(2, 1));
  });
  it('adds distinct accounts while preserving the aggregate', () => {
    const first = nextRatingSummary('work', null, null, 5);
    const second = nextRatingSummary('work', first, null, 3);
    expect(second).toMatchObject({ count: 2, total: 8 });
  });
  it('balances averages against vote counts', () => {
    expect(ratingRankScore(460, 100)).toBeGreaterThan(ratingRankScore(5, 1));
    expect(ratingRankScore(500, 100)).toBeGreaterThan(ratingRankScore(460, 100));
  });
  it('rejects malformed scores', () => {
    for (const value of [0, 6, 2.5, NaN, Infinity]) expect(() => nextRatingSummary('work', null, null, value)).toThrow();
  });
  it('breaks ranking ties deterministically', () => {
    expect(compareRatings({workId:'a',count:2,total:8,rankScore:4}, {workId:'b',count:1,total:4,rankScore:4})).toBeLessThan(0);
  });
});
