import { describe, expect, it } from 'vitest';
import {
  createEmptyCloudState,
  getReaderRankInfo,
  parseRawCloudDocData,
} from '@/lib/firebase/cloudSync';
import { getDemoCloudDocument } from '@/lib/firebase/demoFixture';
import { encodeKuroBackup, type YomiBackupV4 } from '@/lib/backup/kuroCodec';
import { CURATED_POPULAR_WORKS } from '@/lib/mangadex/curatedCatalog';
import { buildHomeRecommendations } from '@/lib/recommendations/homeRecommendations';

describe('getReaderRankInfo', () => {
  it('computes level labels, next rank milestone and remaining chapters accurately', () => {
    const lvl1 = getReaderRankInfo(0);
    expect(lvl1.levelLabel).toBe('Nível 1');
    expect(lvl1.rankName).toBe('Iniciado do Torii');
    expect(lvl1.nextRankTitle).toBe('Caçador de Capítulos (Nível C)');
    expect(lvl1.chaptersRemaining).toBe(3);

    const lvlC = getReaderRankInfo(12);
    expect(lvlC.levelLabel).toBe('Nível C');
    expect(lvlC.chaptersRemaining).toBe(3);

    const lvlA = getReaderRankInfo(40);
    expect(lvlA.levelLabel).toBe('Nível A');
    expect(lvlA.nextRankTitle).toBe('Xogun das Letras (Nível S)');
    expect(lvlA.chaptersRemaining).toBe(60);

    const lvlS = getReaderRankInfo(125);
    expect(lvlS.levelLabel).toBe('Nível S');
    expect(lvlS.progress).toBe(100);
    expect(lvlS.nextRankTitle).toBeNull();
    expect(lvlS.chaptersRemaining).toBe(0);
  });
});

describe('buildHomeRecommendations', () => {
  const showcaseWorks = CURATED_POPULAR_WORKS.slice(0, 5);

  it('returns honest discovery state for a brand new empty cloud state without inventing signals', () => {
    const emptyState = createEmptyCloudState('uid-1', 'novo@yomi.app', 'Novo');
    const result = buildHomeRecommendations(
      emptyState,
      showcaseWorks,
      CURATED_POPULAR_WORKS,
      5
    );

    expect(result.hasPersonalSignals).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.discoveryWorks.length).toBeGreaterThan(0);
    const showcaseIds = new Set(showcaseWorks.map((w) => w.id));
    expect(result.discoveryWorks.some((w) => showcaseIds.has(w.id))).toBe(false);
  });

  it('builds personalized recommendations with truthful reasons while excluding favorites, recent reads and showcase works', () => {
    const demoState = parseRawCloudDocData(
      getDemoCloudDocument(),
      'leitor@yomi.app'
    );
    const result = buildHomeRecommendations(
      demoState,
      showcaseWorks,
      CURATED_POPULAR_WORKS,
      5
    );

    expect(result.hasPersonalSignals).toBe(true);
    expect(result.items).toHaveLength(5);
    expect(result.topGenres).toContain('Ação');

    const userWorkIds = new Set([
      ...demoState.favorites.map((f) => f.id),
      ...demoState.recentReads.map((r) => r.manga.id),
    ]);
    for (const item of result.items) {
      expect(userWorkIds.has(item.work.id)).toBe(false);
      expect(item.reasonLabel.trim().length).toBeGreaterThan(0);
    }

    expect(
      result.items.some((i) => i.reasonType === 'because_read')
    ).toBe(true);
    expect(
      result.items.some((i) => i.reasonType === 'discover_different')
    ).toBe(true);

    const showcaseIds = new Set(showcaseWorks.map((w) => w.id));
    expect(result.items.some((i) => showcaseIds.has(i.work.id))).toBe(false);
  });

  it('falls back to discovery mode if history entries lack genre tags and user has no custom genre preference', () => {
    const minimalBackup: YomiBackupV4 = {
      version: 4,
      profile: { name: 'Leitor' },
      favorites: {
        'custom-untagged-1': {
          id: 'custom-untagged-1',
          title: 'Obra Externa Sem Tags',
        },
      },
      history: {
        recent_reading_list: [],
      },
    };
    const parsed = parseRawCloudDocData({
      uid: 'uid-2',
      payload: encodeKuroBackup(minimalBackup, true),
      updatedAtLocal: '2026-11-15T00:00:00Z',
    });

    const result = buildHomeRecommendations(
      parsed,
      showcaseWorks,
      CURATED_POPULAR_WORKS,
      5
    );
    expect(result.hasPersonalSignals).toBe(false);
    expect(result.items).toHaveLength(0);
  });
});

describe('parseRawCloudDocData recentReads ordering & dedupe', () => {
  it('sorts recent reads descending by ISO timestamp and deduplicates same manga', () => {
    const backup: YomiBackupV4 = {
      version: 4,
      favorites: {},
      history: {
        'page_ch-new': 9,
        recent_reading_list: [
          {
            manga: { id: 'm-1', title: 'Manga Antigo' },
            chapter: { id: 'ch-old', chapterNumber: '1' },
            timestamp: '2026-11-10T10:00:00.000Z',
          },
          {
            manga: { id: 'm-2', title: 'Manga Mais Novo' },
            chapter: { id: 'ch-new', chapterNumber: '12' },
            timestamp: '2026-11-14T18:00:00.000Z',
          },
          {
            manga: { id: 'cmk_mdx_m-1', title: 'Manga Antigo Duplicado' },
            chapter: { id: 'ch-older-dup', chapterNumber: '1' },
            timestamp: '2026-11-08T08:00:00.000Z',
          },
        ],
      },
    };

    const parsed = parseRawCloudDocData({
      uid: 'uid-3',
      payload: encodeKuroBackup(backup, true),
    });

    expect(parsed.recentReads).toHaveLength(2);
    expect(parsed.recentReads[0].manga.id).toBe('m-2');
    expect(parsed.recentReads[0].lastPageRead).toBe(9);
    expect(parsed.recentReads[1].manga.id).toBe('m-1');
  });
});
