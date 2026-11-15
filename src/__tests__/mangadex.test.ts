import { describe, expect, it } from 'vitest';
import {
  buildMangaCoverUrl,
  resolveBestTitle,
} from '@/lib/mangadex/api';
import {
  CURATED_POPULAR_WORKS,
  selectTimeWindowFeaturedWorks,
} from '@/lib/mangadex/curatedCatalog';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('Catálogo Curado & Normalização MangaDex', () => {
  it('contém 24 obras válidas com UUIDs, capas via /api/cover e gêneros em português', () => {
    expect(CURATED_POPULAR_WORKS).toHaveLength(24);

    const ids = new Set<string>();
    for (const work of CURATED_POPULAR_WORKS) {
      expect(work.id).toMatch(UUID_REGEX);
      expect(ids.has(work.id)).toBe(false);
      ids.add(work.id);

      expect(work.title.trim().length).toBeGreaterThan(0);
      expect(work.coverUrl.startsWith('/api/cover?url=')).toBe(true);
      expect(work.coverHighResUrl.startsWith('/api/cover?url=')).toBe(true);
      expect(work.tags.length).toBeGreaterThanOrEqual(2);
    }

    const titles = CURATED_POPULAR_WORKS.map((w) => w.title);
    expect(titles).toContain('Solo Leveling');
    expect(titles).toContain('Berserk');
    expect(titles).toContain('One Piece');
  });

  it('prioriza títulos legíveis (en/pt-br em title ou altTitles) em vez de romanizações como Na Honjaman Level-Up', () => {
    const resolvedSolo = resolveBestTitle({
      title: { 'ko-ro': 'Na Honjaman Level-Up' },
      altTitles: [{ ko: '나 혼자만 레벨업' }, { en: 'Solo Leveling' }],
    });
    expect(resolvedSolo).toBe('Solo Leveling');

    const resolvedPtBr = resolveBestTitle({
      title: { 'pt-br': 'Solo Leveling BR', en: 'Solo Leveling' },
      altTitles: [],
    });
    expect(resolvedPtBr).toBe('Solo Leveling BR');

    const fallbackJaRo = resolveBestTitle({
      title: { 'ja-ro': 'Kagurabachi' },
      altTitles: [],
    });
    expect(fallbackJaRo).toBe('Kagurabachi');
  });

  it('seleciona 5 destaques distintos de forma determinística por janela de 45 minutos e varia ao trocar a janela', () => {
    const slot0A = selectTimeWindowFeaturedWorks(
      CURATED_POPULAR_WORKS,
      5,
      1_700_000_000_000,
      45
    );
    const slot0B = selectTimeWindowFeaturedWorks(
      CURATED_POPULAR_WORKS,
      5,
      1_700_000_000_000 + 60_000,
      45
    );
    const slotNext = selectTimeWindowFeaturedWorks(
      CURATED_POPULAR_WORKS,
      5,
      1_700_000_000_000 + 46 * 60_000,
      45
    );

    expect(slot0A).toHaveLength(5);
    expect(new Set(slot0A.map((w) => w.id)).size).toBe(5);
    expect(slot0A.map((w) => w.id)).toEqual(slot0B.map((w) => w.id));
    expect(slot0A.map((w) => w.id)).not.toEqual(slotNext.map((w) => w.id));
  });

  it('gera URLs de capa proxied quando coverFileName é fornecido e fallback seguro quando ausente', () => {
    const valid = buildMangaCoverUrl(
      '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
      'e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg',
      true
    );
    expect(valid.startsWith('/api/cover?url=')).toBe(true);
    expect(decodeURIComponent(valid)).toContain('.512.jpg');

    const fallback = buildMangaCoverUrl('', undefined);
    expect(fallback).toBe('/brand/icon-1024.png');
  });
});
