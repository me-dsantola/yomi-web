import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMangaCoverUrl,
  clearMangaChaptersCache,
  fetchMangaChaptersWithMeta,
  fetchMangaDetails,
  MangaDexFeedError,
  matchesWorkTitle,
  normalizeChapterNumber,
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

function makeRawChapter(
  id: string,
  chapter: string | null,
  lang: string,
  options: { title?: string; volume?: string | null; pages?: number } = {}
) {
  return {
    id,
    attributes: {
      chapter,
      title: options.title ?? '',
      volume: options.volume ?? null,
      translatedLanguage: lang,
      pages: options.pages ?? 18,
      publishAt: '2026-11-01T12:00:00Z',
    },
    relationships: [
      { type: 'scanlation_group', attributes: { name: `Scan ${lang.toUpperCase()}` } },
    ],
  };
}

describe('Recuperação Paginada de Capítulos, Idiomas, Deduplicação e Erros', () => {
  beforeEach(() => {
    clearMangaChaptersCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pagina corretamente obras com mais de 1.500 capítulos avançando offset até total', async () => {
    const mangaId = '11111111-1111-4111-8111-111111111111';
    const totalChapters = 1650;
    const allPtChapters = Array.from({ length: totalChapters }, (_, idx) =>
      makeRawChapter(`pt-ch-${idx + 1}`, String(idx + 1), 'pt-br')
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://yomi.local');
      const langs = url.searchParams.getAll('translatedLanguage[]');
      const offset = Number(url.searchParams.get('offset') ?? '0');
      const limit = Number(url.searchParams.get('limit') ?? '500');

      if (langs.includes('pt-br')) {
        return new Response(
          JSON.stringify({
            data: allPtChapters.slice(offset, offset + limit),
            total: totalChapters,
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchMangaChaptersWithMeta(mangaId, {
      direction: 'asc',
      includeSpanishFallback: true,
    });

    expect(res.chapters).toHaveLength(1650);
    expect(res.chapters[0].chapterNumber).toBe('1');
    expect(res.chapters[1649].chapterNumber).toBe('1650');
    expect(res.languagesUsed).toEqual(['PT-BR']);
    expect(res.totalFeedRecords).toBe(1650);
    // 4 páginas para pt-br (0, 500, 1000, 1500) + 1 para en + 1 para es = 6
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('aplica prioridade PT-BR -> EN -> ES preenchendo lacunas e respeita toggle sem ES', async () => {
    const mangaId = '22222222-2222-4222-8222-222222222222';
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://yomi.local');
      const lang = url.searchParams.getAll('translatedLanguage[]')[0];

      if (lang === 'pt-br') {
        return new Response(
          JSON.stringify({
            data: [
              makeRawChapter('ch-1-pt', '1', 'pt-br'),
              makeRawChapter('ch-3-pt', '3', 'pt-br'),
            ],
            total: 2,
          }),
          { status: 200 }
        );
      }
      if (lang === 'en') {
        return new Response(
          JSON.stringify({
            data: [
              makeRawChapter('ch-1-en', '1', 'en'),
              makeRawChapter('ch-2-en', '2', 'en'),
            ],
            total: 2,
          }),
          { status: 200 }
        );
      }
      if (lang === 'es') {
        return new Response(
          JSON.stringify({
            data: [
              makeRawChapter('ch-2-es', '2', 'es'),
              makeRawChapter('ch-4-es', '4', 'es'),
            ],
            total: 2,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ data: [], total: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const withEs = await fetchMangaChaptersWithMeta(mangaId, {
      includeSpanishFallback: true,
    });
    expect(withEs.chapters.map((c) => `${c.chapterNumber}:${c.language}`)).toEqual([
      '1:PT-BR',
      '2:EN',
      '3:PT-BR',
      '4:ES',
    ]);
    expect(withEs.hasLanguageFallback).toBe(true);
    expect(withEs.usedSpanishFallback).toBe(true);

    const withoutEs = await fetchMangaChaptersWithMeta(mangaId, {
      includeSpanishFallback: false,
    });
    expect(
      withoutEs.chapters.map((c) => `${c.chapterNumber}:${c.language}`)
    ).toEqual(['1:PT-BR', '2:EN', '3:PT-BR']);
    expect(withoutEs.usedSpanishFallback).toBe(false);
  });

  it('preserva capítulo 0 legítimo e não sobrescreve múltiplos especiais/oneshots sem número', async () => {
    expect(normalizeChapterNumber('0').canonicalNumber).toBe('0');
    expect(normalizeChapterNumber('01.0').canonicalNumber).toBe('1');
    expect(normalizeChapterNumber(null).canonicalNumber).toBeNull();

    const mangaId = '33333333-3333-4333-8333-333333333333';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), 'https://yomi.local');
        const lang = url.searchParams.getAll('translatedLanguage[]')[0];
        if (lang === 'pt-br') {
          return new Response(
            JSON.stringify({
              data: [
                makeRawChapter('ch-0', '0', 'pt-br', { title: 'Prólogo' }),
                makeRawChapter('ch-01-a', '01', 'pt-br', { pages: 12 }),
                makeRawChapter('ch-01-b', '1.0', 'pt-br', { pages: 24 }),
                makeRawChapter('sp-1', null, 'pt-br', {
                  volume: '1',
                  title: 'Bastidores Vol. 1',
                }),
                makeRawChapter('sp-2', null, 'pt-br', {
                  volume: '2',
                  title: 'Capítulo Bônus',
                }),
                makeRawChapter('sp-oneshot', '', 'pt-br', {
                  title: 'Oneshot Piloto',
                }),
              ],
              total: 6,
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ data: [], total: 0 }), { status: 200 });
      })
    );

    const res = await fetchMangaChaptersWithMeta(mangaId, {
      includeSpanishFallback: false,
    });

    // Cap. 0 + Cap. 1 (dedup 01/1.0 mantendo maior páginas = ch-01-b) + 3 especiais distintos = 5
    expect(res.chapters).toHaveLength(5);
    expect(res.chapters[0].chapterNumber).toBe('0');
    expect(res.chapters[1].id).toBe('ch-01-b');
    const specials = res.chapters.filter((c) => c.isSpecial);
    expect(specials).toHaveLength(3);
    expect(specials.map((s) => s.id)).toEqual(['sp-1', 'sp-2', 'sp-oneshot']);
  });

  it('executa retry em HTTP 429 e propaga MangaDexFeedError quando todas as fontes falham', async () => {
    const mangaId = '44444444-4444-4444-8444-444444444444';
    let ptAttempts = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), 'https://yomi.local');
        const lang = url.searchParams.getAll('translatedLanguage[]')[0];
        if (lang === 'pt-br') {
          ptAttempts += 1;
          if (ptAttempts === 1) {
            return new Response(JSON.stringify({ error: 'rate limit' }), {
              status: 429,
              headers: { 'Retry-After': '0' },
            });
          }
          return new Response(
            JSON.stringify({
              data: [makeRawChapter('ok-1', '1', 'pt-br')],
              total: 1,
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ data: [], total: 0 }), { status: 200 });
      })
    );

    const recovered = await fetchMangaChaptersWithMeta(mangaId, {
      includeSpanishFallback: false,
      retryBaseDelayMs: 1,
    });
    expect(ptAttempts).toBe(2);
    expect(recovered.chapters).toHaveLength(1);

    clearMangaChaptersCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 503 }))
    );

    await expect(
      fetchMangaChaptersWithMeta(mangaId, {
        includeSpanishFallback: false,
        retryBaseDelayMs: 1,
      })
    ).rejects.toThrow(MangaDexFeedError);
  });

  it('evita associar obra errada por similaridade solta em fetchMangaDetails e trata altTitles', async () => {
    expect(
      matchesWorkTitle(
        {
          title: 'Na Honjaman Level-Up',
          altTitle: 'Solo Leveling',
          altTitles: ['Solo Leveling', 'Eu Sozinho Subo de Nível'],
        },
        'Solo Leveling'
      )
    ).toBe(true);

    expect(
      matchesWorkTitle(
        {
          title: 'Isekai Nonbiri Nouka',
          altTitle: 'Farming Life in Another World',
          altTitles: [],
        },
        'Vagabond'
      )
    ).toBe(false);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: '99999999-9999-4999-8999-999999999999',
                attributes: {
                  title: { en: 'Totalmente Outra Obra' },
                  altTitles: [],
                  description: { en: 'Nada a ver' },
                  tags: [],
                },
                relationships: [],
              },
            ],
          }),
          { status: 200 }
        )
      )
    );

    await expect(
      fetchMangaDetails('obra-inexistente-xyz', 'Obra Completamente Desconhecida')
    ).rejects.toThrow(/Obra não encontrada/i);
  });
});
