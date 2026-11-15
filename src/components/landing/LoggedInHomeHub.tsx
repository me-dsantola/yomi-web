'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Compass,
  Heart,
  Library,
  Loader2,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import { HeroSectionAnimated } from '@/components/landing/HeroSectionAnimated';
import { FeaturedBillboardSection } from '@/components/landing/FeaturedBillboardSection';
import { AlternatingVerticalMarquee } from '@/components/landing/AlternatingVerticalMarquee';
import { BlobatarInteractiveShowcase } from '@/components/landing/BlobatarInteractiveShowcase';
import { ExperienceBentoSection } from '@/components/landing/ExperienceBentoSection';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';
import {
  countReadChaptersFromHistory,
  fetchUserCloudDoc,
  getReaderRankInfo,
  toggleCloudFavorite,
  type ParsedYomiCloudState,
} from '@/lib/firebase/cloudSync';
import { argbIntToHex, type YomiMangaEntry } from '@/lib/backup/kuroCodec';
import {
  buildWorkHref,
  cleanMangaDexId,
} from '@/lib/mangadex/api';
import { useResolvedCovers } from '@/lib/mangadex/useResolvedCovers';
import {
  CURATED_POPULAR_WORKS,
  findCuratedWorkById,
} from '@/lib/mangadex/curatedCatalog';
import { buildHomeRecommendations } from '@/lib/recommendations/homeRecommendations';
import type { YomiReleaseInfo } from '@/lib/github/releases';
import type { MangaDexWork } from '@/lib/mangadex/types';

interface LoggedInHomeHubProps {
  release: YomiReleaseInfo;
  showcaseWorks: MangaDexWork[];
  primaryApkUrl?: string;
}

const DISCOVERY_GENRE_FILTERS = [
  'Todos',
  'Ação',
  'Fantasia',
  'Webtoon',
  'Romance',
  'Drama',
];

function resolveFavoriteChapterBadge(
  manga: YomiMangaEntry,
  historyMap?: Record<string, unknown>
): string | null {
  const cleanId = cleanMangaDexId(manga.id);
  const directCount =
    typeof manga.availableChaptersCount === 'number' &&
    manga.availableChaptersCount > 0
      ? manga.availableChaptersCount
      : null;

  const historyCountRaw =
    historyMap?.[`chapters_count_${manga.id}`] ??
    historyMap?.[`chapters_count_${cleanId}`];
  const historyCount =
    typeof historyCountRaw === 'number' && historyCountRaw > 0
      ? historyCountRaw
      : null;

  const totalCount = directCount ?? historyCount;
  if (totalCount !== null) {
    return `${totalCount} caps`;
  }

  return null;
}

function resolveFavoriteTags(manga: YomiMangaEntry): string[] {
  if (Array.isArray(manga.tags) && manga.tags.length > 0) {
    return manga.tags.slice(0, 2);
  }
  const curated = findCuratedWorkById(cleanMangaDexId(manga.id));
  return curated ? curated.tags.slice(0, 2).map((t) => t.name) : [];
}

export function LoggedInHomeHub({
  release,
  showcaseWorks,
  primaryApkUrl = '/download',
}: LoggedInHomeHubProps) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const queryClient = useQueryClient();
  const { user } = useYomiAuth();

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [favNotice, setFavNotice] = useState<string | null>(null);
  const [discoveryGenre, setDiscoveryGenre] = useState<string>('Todos');

  const confirmTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const {
    data: cloudState,
    isLoading,
    isError,
    refetch,
  } = useQuery<ParsedYomiCloudState | null>({
    queryKey: ['yomi-cloud-doc', user?.uid],
    queryFn: () =>
      user
        ? fetchUserCloudDoc(user.uid, user.email, user.displayName)
        : Promise.resolve(null),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const recommendations = useMemo(
    () =>
      buildHomeRecommendations(
        cloudState,
        showcaseWorks,
        CURATED_POPULAR_WORKS,
        5
      ),
    [cloudState, showcaseWorks]
  );

  const filteredDiscoveryWorks = useMemo(() => {
    if (discoveryGenre === 'Todos') {
      return recommendations.discoveryWorks.slice(0, 5);
    }
    const targetLower = discoveryGenre.toLowerCase();
    const matches = recommendations.discoveryWorks.filter((work) =>
      work.tags.some((tag) => tag.name.toLowerCase().includes(targetLower))
    );
    if (matches.length > 0) {
      return matches.slice(0, 5);
    }
    const curatedFallback = CURATED_POPULAR_WORKS.filter((work) =>
      work.tags.some((tag) => tag.name.toLowerCase().includes(targetLower))
    );
    return curatedFallback.slice(0, 5);
  }, [discoveryGenre, recommendations.discoveryWorks]);

  const coverEntriesForLookup = useMemo(
    () => [
      ...(cloudState?.recentReads ?? []).slice(0, 4).map((r) => r.manga),
      ...(cloudState?.favorites ?? []).slice(0, 12),
    ],
    [cloudState?.recentReads, cloudState?.favorites]
  );
  const { getCoverUrl } = useResolvedCovers(coverEntriesForLookup);

  // Visitante não autenticado: mantém fluxo completo da landing page
  if (!user) {
    return (
      <>
        <HeroSectionAnimated release={release} showcaseWorks={showcaseWorks} />
        <FeaturedBillboardSection initialWorks={showcaseWorks} />
        <AlternatingVerticalMarquee />
        <BlobatarInteractiveShowcase />
        <ExperienceBentoSection
          latestVersion={release.tagName}
          downloadUrl={primaryApkUrl}
        />
      </>
    );
  }

  const showSkeleton = isLoading && !cloudState;

  const profileName =
    cloudState?.profile?.name ||
    cloudState?.userDisplayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Leitor';

  const profileAccent = cloudState?.profile?.customAccentColor
    ? argbIntToHex(cloudState.profile.customAccentColor)
    : undefined;

  const hasCustomAvatar = Boolean(
    cloudState?.avatarDataUrl && !cloudState?.profile?.useBlobatarAsAvatar
  );

  const historyMap = cloudState?.backup?.history;
  const readChaptersCount = countReadChaptersFromHistory(
    historyMap,
    cloudState?.recentReads?.length ?? 0
  );
  const rankInfo = getReaderRankInfo(readChaptersCount);
  const recentReads = (cloudState?.recentReads ?? []).slice(0, 4);
  const favorites = (cloudState?.favorites ?? []).slice(0, 12);

  const scheduleNotice = (message: string) => {
    setFavNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setFavNotice(null);
    }, 2800);
  };

  const handleFavoriteAction = async (manga: YomiMangaEntry) => {
    const cleanId = cleanMangaDexId(manga.id) || manga.id;
    if (removingId === cleanId) return;

    // Proteção em 2 cliques contra remoção acidental direto da Home
    if (confirmRemoveId !== cleanId) {
      setConfirmRemoveId(cleanId);
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
      confirmTimerRef.current = window.setTimeout(() => {
        setConfirmRemoveId((curr) => (curr === cleanId ? null : curr));
      }, 3500);
      return;
    }

    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current);
    }
    setConfirmRemoveId(null);
    setRemovingId(cleanId);
    try {
      const res = await toggleCloudFavorite(user.uid, user.email, manga);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      scheduleNotice(
        res.isFavorite
          ? `"${manga.title}" adicionado aos favoritos.`
          : `"${manga.title}" removido dos favoritos.`
      );
    } catch {
      scheduleNotice('Não foi possível atualizar os favoritos.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Iluminação discreta no topo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-44 left-1/2 h-[380px] w-[780px] -translate-x-1/2 rounded-full opacity-20 blur-[130px]"
        style={{
          background:
            'radial-gradient(circle, var(--yomi-accent) 0%, transparent 70%)',
        }}
      />

      {/* Seções 1 e 2: Boas-vindas + Continuar de onde parou */}
      <section className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-4 sm:pb-6 space-y-6 sm:space-y-8">
        {isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>
                Não foi possível sincronizar seus dados da nuvem neste momento.
              </span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500/25"
            >
              <RefreshCw className="h-3 w-3" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* 1. Boas-vindas e progresso do leitor */}
        {showSkeleton ? (
          <div className="rounded-3xl border border-white/10 bg-[#0E0E14]/90 p-5 sm:p-6 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-2xl bg-white/10 shrink-0" />
                <div className="space-y-2.5 flex-1">
                  <div className="h-5 w-40 rounded-full bg-white/10" />
                  <div className="h-7 w-56 rounded-lg bg-white/10" />
                  <div className="h-2 w-64 rounded-full bg-white/10" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="h-10 w-36 rounded-full bg-white/10" />
                <div className="h-10 w-28 rounded-full bg-white/10" />
                <div className="h-10 w-36 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-white/10 bg-[#0E0E14]/90 p-4 sm:p-6 shadow-xl"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Área esquerda: Mascote, Saudação e Sistema de Progressão */}
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <div className="shrink-0 rounded-2xl border border-white/10 bg-black/40 p-1.5">
                  {hasCustomAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cloudState!.avatarDataUrl!}
                      alt={profileName}
                      className="h-16 w-16 sm:h-[68px] sm:w-[68px] rounded-xl object-cover"
                    />
                  ) : (
                    <BlobatarCompanion
                      mascotName={cloudState?.mascotName || 'Kuro'}
                      seed={cloudState?.profile?.blobatarSeed}
                      expression={cloudState?.profile?.blobatarExpression}
                      shape={cloudState?.profile?.blobatarShape}
                      accentColor={profileAccent}
                      size={66}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--yomi-accent)]/30 bg-[var(--yomi-accent)]/12 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--yomi-accent)]" />
                      <span>{rankInfo.levelLabel}</span>
                      <span className="text-white/45">•</span>
                      <span>{rankInfo.rankName}</span>
                    </span>
                    <span className="hidden sm:inline-block text-[11px] text-white/45">
                      Mascote: {cloudState?.mascotName || 'Kuro'}
                    </span>
                  </div>

                  <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white truncate leading-tight">
                    Olá, {profileName}
                  </h1>

                  <div className="max-w-md space-y-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--yomi-accent)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={{ width: `${rankInfo.progress}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-[11px] text-white/55">
                      <span className="font-medium text-white/75">
                        {readChaptersCount}{' '}
                        {readChaptersCount === 1
                          ? 'capítulo lido'
                          : 'capítulos lidos'}
                      </span>
                      <span>
                        {rankInfo.nextRankTitle
                          ? `Faltam ${rankInfo.chaptersRemaining} caps para ${rankInfo.nextRankTitle}`
                          : 'Marco máximo alcançado • Nível S'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Área direita: Biblioteca, Catálogo e Perfil/Mascote */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  href="/biblioteca"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-full bg-[var(--yomi-accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_var(--yomi-accent-glow)] hover:brightness-110 transition"
                >
                  <Library className="h-3.5 w-3.5" />
                  <span>Minha Biblioteca</span>
                </Link>
                <Link
                  href="/explorar"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/12 transition"
                >
                  <Compass className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                  <span>Catálogo</span>
                </Link>
                <Link
                  href="/conta"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/12 transition"
                >
                  <UserIcon className="h-3.5 w-3.5 text-white/75" />
                  <span>Perfil &amp; Mascote</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. Continuar de onde parou */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--yomi-accent)]" />
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Continuar de onde parou
              </h2>
            </div>
            <Link
              href="/biblioteca"
              className="text-xs font-semibold text-white/60 hover:text-white transition-colors"
            >
              Ver histórico →
            </Link>
          </div>

          {showSkeleton ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[156px] animate-pulse rounded-2xl border border-white/[0.08] bg-[#0E0E14]"
                />
              ))}
            </div>
          ) : recentReads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-display text-sm font-bold text-white">
                  Nenhuma leitura em andamento
                </div>
                <p className="text-xs text-white/55">
                  Abra qualquer capítulo no navegador ou sincronize seu aparelho
                  Android para retomar da última página salva.
                </p>
              </div>
              <Link
                href="/explorar"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90 transition"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Descobrir obras
              </Link>
            </div>
          ) : (
            <div
              className={
                recentReads.length > 1
                  ? 'flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-1 md:grid md:grid-cols-2 xl:grid-cols-4 md:overflow-visible md:pb-0'
                  : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5'
              }
            >
              {recentReads.map((item, idx) => {
                const chapterPages =
                  typeof item.chapter.pages === 'number' &&
                  item.chapter.pages > 0
                    ? item.chapter.pages
                    : null;
                const isCompleted =
                  historyMap?.[`read_${item.chapter.id}`] === true;
                const progressPercent = isCompleted
                  ? 100
                  : chapterPages
                    ? Math.min(
                        100,
                        Math.max(
                          8,
                          Math.round(((item.lastPageRead + 1) / chapterPages) * 100)
                        )
                      )
                    : Math.min(85, Math.max(16, (item.lastPageRead + 1) * 10));

                return (
                  <div
                    key={`${item.manga.id}-${item.chapter.id}-${idx}`}
                    className={`${
                      recentReads.length > 1
                        ? 'snap-start min-w-[275px] max-w-[320px] sm:min-w-[300px] md:min-w-0 md:max-w-none'
                        : ''
                    } h-full flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-3.5 sm:p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 motion-reduce:hover:translate-y-0`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link
                        href={buildWorkHref(item.manga.id, item.manga.title)}
                        className="shrink-0 block aspect-[3/4] w-16 overflow-hidden rounded-xl border border-white/10 bg-white/5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(item.manga, false)}
                          alt={item.manga.title}
                          loading="eager"
                          decoding="async"
                          className="h-full w-full object-cover object-top"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                      </Link>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={buildWorkHref(item.manga.id, item.manga.title)}
                          className="font-display text-sm font-bold text-white hover:text-[var(--yomi-accent)] transition-colors line-clamp-2 leading-snug"
                        >
                          {item.manga.title}
                        </Link>
                        <div className="text-xs font-medium text-white/70 truncate">
                          Cap. {item.chapter.chapterNumber || '1'}
                          {item.chapter.title ? ` — ${item.chapter.title}` : ''}
                        </div>
                        <div className="text-[11px] text-white/45 truncate">
                          Página {item.lastPageRead + 1}
                          {chapterPages ? ` de ${chapterPages}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-0.5">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-[var(--yomi-accent)] transition-[width] duration-500 motion-reduce:transition-none"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <Link
                        href={`/ler/${encodeURIComponent(item.chapter.id)}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--yomi-accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Continuar lendo</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. Em alta no YOMI (preservado, espaçamento integrado) */}
      <FeaturedBillboardSection
        initialWorks={showcaseWorks}
        compactSpacing
      />

      {/* 4. Seus Favoritos */}
      <section
        aria-labelledby="home-favorites-heading"
        className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-[var(--yomi-accent)]" />
            <h2
              id="home-favorites-heading"
              className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-white"
            >
              Seus Favoritos
            </h2>
            {!showSkeleton && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-white/65">
                {cloudState?.favoritesCount ?? favorites.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {favNotice && (
              <span className="text-xs font-medium text-emerald-300">
                {favNotice}
              </span>
            )}
            <Link
              href="/biblioteca"
              className="text-xs font-semibold text-white/60 hover:text-white transition-colors"
            >
              Gerenciar favoritos →
            </Link>
          </div>
        </div>

        {showSkeleton ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4.8] animate-pulse rounded-2xl border border-white/[0.08] bg-[#0E0E14]"
              />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-display text-sm font-bold text-white">
                Sua galeria de favoritos está vazia
              </div>
              <p className="text-xs text-white/55">
                Adicione seus mangás e webtoons preferidos no catálogo para
                acompanhá-los por aqui.
              </p>
            </div>
            <Link
              href="/explorar"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white hover:bg-white/12 transition"
            >
              <Compass className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div
            className={
              favorites.length > 2
                ? 'flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-1 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0'
                : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'
            }
          >
            {favorites.map((manga) => {
              const cleanId = cleanMangaDexId(manga.id) || manga.id;
              const isConfirming = confirmRemoveId === cleanId;
              const isBusy = removingId === cleanId;
              const chapterBadge = resolveFavoriteChapterBadge(manga, historyMap);
              const tags = resolveFavoriteTags(manga);

              return (
                <div
                  key={manga.id}
                  className={`${
                    favorites.length > 2
                      ? 'snap-start w-[155px] shrink-0 sm:w-auto sm:shrink'
                      : ''
                  } group relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition duration-200 hover:-translate-y-0.5 hover:border-white/25 motion-reduce:hover:translate-y-0`}
                >
                  {/* Botão de remover favorito com proteção contra clique acidental */}
                  <button
                    type="button"
                    onClick={() => handleFavoriteAction(manga)}
                    disabled={isBusy}
                    aria-label={
                      isConfirming
                        ? `Confirmar remoção de ${manga.title}`
                        : `Remover ${manga.title} dos favoritos`
                    }
                    title={
                      isConfirming
                        ? 'Clique novamente para remover dos favoritos'
                        : 'Remover dos favoritos'
                    }
                    className={`absolute top-2.5 right-2.5 z-20 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 ${
                      isConfirming
                        ? 'border-rose-400/60 bg-rose-600/90 text-white shadow-lg'
                        : 'border-white/15 bg-[#070709]/80 text-[var(--yomi-accent)] hover:border-white/30 hover:bg-[#070709]'
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    ) : isConfirming ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Confirmar?</span>
                      </>
                    ) : (
                      <Heart className="h-3 w-3 fill-current" />
                    )}
                  </button>

                  <Link
                    href={buildWorkHref(manga.id, manga.title)}
                    className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-2xl"
                  >
                    <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCoverUrl(manga, false)}
                        alt={manga.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/brand/icon-1024.png';
                        }}
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#070709]/85 via-[#070709]/30 to-transparent"
                      />
                      {chapterBadge && (
                        <span className="absolute bottom-2 left-2.5 z-10 rounded-full border border-white/15 bg-[#070709]/85 px-2 py-0.5 text-[10px] font-medium text-white/85">
                          {chapterBadge}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-3 flex flex-col justify-between gap-1">
                      <div className="font-display text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-[var(--yomi-accent)] transition-colors">
                        {manga.title}
                      </div>
                      {tags.length > 0 && (
                        <div className="text-[11px] text-white/45 truncate">
                          {tags.join(' · ')}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Recomendado para você (ou descoberta honesta quando sem sinais) */}
      <section
        aria-labelledby="home-recommendations-heading"
        className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[var(--yomi-accent)]" />
              <h2
                id="home-recommendations-heading"
                className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-white"
              >
                {recommendations.hasPersonalSignals
                  ? 'Recomendado para você'
                  : 'Explore por gênero'}
              </h2>
            </div>
            {recommendations.hasPersonalSignals &&
              recommendations.topGenres.length > 0 && (
                <p className="text-xs text-white/50">
                  {recommendations.topGenres.slice(0, 3).join(' · ')}
                </p>
              )}
          </div>

          <Link
            href="/explorar"
            className="inline-flex items-center gap-1 self-start sm:self-auto text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <span>Abrir catálogo completo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {showSkeleton ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4.8] animate-pulse rounded-2xl border border-white/[0.08] bg-[#0E0E14]"
              />
            ))}
          </div>
        ) : recommendations.hasPersonalSignals ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
            {recommendations.items.map((item) => {
              const { work, reasonLabel } = item;
              return (
                <Link
                  key={work.id}
                  href={buildWorkHref(work.id, work.title)}
                  className="snap-start w-[178px] shrink-0 sm:w-auto sm:shrink group flex flex-col rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition duration-200 hover:-translate-y-0.5 hover:border-white/25 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={work.coverUrl || work.coverHighResUrl}
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/brand/icon-1024.png';
                      }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070709]/90 via-[#070709]/35 to-transparent"
                    />
                    <span className="absolute bottom-2.5 left-2.5 right-2.5 z-10 inline-flex items-center truncate rounded-full border border-white/15 bg-[#070709]/85 px-2.5 py-0.5 text-[10px] font-medium text-white/90">
                      <span className="truncate">{reasonLabel}</span>
                    </span>
                  </div>

                  <div className="flex-1 p-3 flex flex-col justify-between gap-1.5">
                    <div className="font-display text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-[var(--yomi-accent)] transition-colors">
                      {work.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {work.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-white/60"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {DISCOVERY_GENRE_FILTERS.map((genre) => {
                const active = discoveryGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setDiscoveryGenre(genre)}
                    aria-pressed={active}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-[var(--yomi-accent)]/60 bg-[var(--yomi-accent)]/20 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>

            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
              {filteredDiscoveryWorks.map((work) => (
                <Link
                  key={work.id}
                  href={buildWorkHref(work.id, work.title)}
                  className="snap-start w-[178px] shrink-0 sm:w-auto sm:shrink group flex flex-col rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition duration-200 hover:-translate-y-0.5 hover:border-white/25 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={work.coverUrl || work.coverHighResUrl}
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/brand/icon-1024.png';
                      }}
                    />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between gap-1">
                    <div className="font-display text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-[var(--yomi-accent)] transition-colors">
                      {work.title}
                    </div>
                    <div className="text-[11px] text-white/50 truncate">
                      {work.tags
                        .slice(0, 2)
                        .map((t) => t.name)
                        .join(' · ') || work.author}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 6. Milhares de obras (porta de entrada do catálogo) */}
      <AlternatingVerticalMarquee compactSpacing />
    </div>
  );
}
