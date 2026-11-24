'use client';
import { fetchCommunityTrending } from '@/lib/firebase/ratings';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
} from 'lucide-react';
import {
  CURATED_POPULAR_WORKS,
  selectTimeWindowFeaturedWorks,
} from '@/lib/mangadex/curatedCatalog';
import { buildWorkHref, cleanMangaDexId } from '@/lib/mangadex/api';
import type { MangaDexWork } from '@/lib/mangadex/types';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  fetchUserCloudDoc,
  toggleCloudFavorite,
} from '@/lib/firebase/cloudSync';
import type {
  YomiChapterEntry,
  YomiMangaEntry,
} from '@/lib/backup/kuroCodec';

interface FeaturedBillboardSectionProps {
  initialWorks?: MangaDexWork[];
  compactSpacing?: boolean;
}

const AUTOPLAY_MS = 6500;

/**
 * Cache em memória para evitar reprocessamento de paleta das capas já analisadas.
 */
const coverPaletteCache = new Map<string, string>();

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function extractDominantCoverAccent(
  imageUrl: string,
  fallbackHex: string
): Promise<string> {
  if (!imageUrl || typeof window === 'undefined') {
    return Promise.resolve(fallbackHex);
  }
  const cached = coverPaletteCache.get(imageUrl);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    let settled = false;

    const finish = (color: string) => {
      if (settled) return;
      settled = true;
      coverPaletteCache.set(imageUrl, color);
      resolve(color);
    };

    const timeout = window.setTimeout(() => finish(fallbackHex), 2500);

    img.onload = () => {
      window.clearTimeout(timeout);
      try {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          finish(fallbackHex);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Agrupa pixels vibrantes em buckets de matiz para encontrar a cor predominante
        const buckets = new Map<
          number,
          { weight: number; hSum: number; sSum: number }
        >();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 180) continue;
          const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
          if (l < 0.14 || l > 0.88 || s < 0.22) continue;

          const bucketKey = Math.floor(h * 12) % 12;
          const vibrancyWeight = s * (1 - Math.abs(l - 0.5) * 1.15);
          const prev = buckets.get(bucketKey) ?? {
            weight: 0,
            hSum: 0,
            sSum: 0,
          };
          buckets.set(bucketKey, {
            weight: prev.weight + vibrancyWeight,
            hSum: prev.hSum + h * vibrancyWeight,
            sSum: prev.sSum + s * vibrancyWeight,
          });
        }

        let best: { weight: number; hSum: number; sSum: number } | null = null;
        for (const entry of buckets.values()) {
          if (!best || entry.weight > best.weight) {
            best = entry;
          }
        }

        if (!best || best.weight <= 0) {
          finish(fallbackHex);
          return;
        }

        const avgH = best.hSum / best.weight;
        const avgS = Math.min(0.88, Math.max(0.62, best.sSum / best.weight));
        // Luminosidade calibrada para fundo escuro + bom contraste em texto branco no botão principal
        const balancedL = 0.48;
        finish(hslToHex(avgH, avgS, balancedL));
      } catch {
        finish(fallbackHex);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timeout);
      finish(fallbackHex);
    };

    img.src = imageUrl;
  });
}

function formatWorkStatusLabel(status?: string): string | null {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'Completo';
    case 'ongoing':
      return 'Em Lançamento';
    case 'hiatus':
      return 'Hiato';
    case 'cancelled':
      return 'Cancelado';
    default:
      return null;
  }
}

function toCloudMangaEntry(work: MangaDexWork): YomiMangaEntry {
  const entry: YomiMangaEntry = {
    id: work.id,
    title: work.title || 'Obra YOMI',
    description: work.description,
    status: work.status,
    source: 'mangadex',
    tags: work.tags.map((t) => t.name),
  };
  if (work.coverFileName) {
    entry.coverFileName = work.coverFileName;
  }
  return entry;
}

export function FeaturedBillboardSection({
  initialWorks,
  compactSpacing = false,
}: FeaturedBillboardSectionProps) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const queryClient = useQueryClient();
  const { user, openAuthModal } = useYomiAuth();

  const { data: communityWorks } = useQuery({
    queryKey: ['community-trending'],
    queryFn: fetchCommunityTrending,
    staleTime: 60_000,
    retry: 1,
  });
  const hasCommunityRatings = Boolean(communityWorks?.length);

  const [works, setWorks] = useState<MangaDexWork[]>(() =>
    initialWorks && initialWorks.length > 0
      ? initialWorks.slice(0, 5)
      : CURATED_POPULAR_WORKS.slice(0, 5)
  );
  const [[activeIndex, direction], setSlide] = useState<[number, 1 | -1]>([
    0, 1,
  ]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const activeWork = works[activeIndex] ?? CURATED_POPULAR_WORKS[0];
  const activeRating = communityWorks?.find((item) => item.id === activeWork.id)?.ratingSummary;
  const fallbackAccent = activeWork.accentColor ?? '#FF2A55';
  const [extractedAccents, setExtractedAccents] = useState<
    Record<string, string>
  >({});
  const [favBusyId, setFavBusyId] = useState<string | null>(null);
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null);

  // Sincroniza rotação periódica do catálogo curado quando não houver lista fixa
  useEffect(() => {
    if (communityWorks?.length) {
      setWorks(communityWorks.slice(0, 5));
      setSlide([0, 1]);
      setProgress(0);
      return;
    }
    const syncRotation = () => {
      const rotated = selectTimeWindowFeaturedWorks(
        CURATED_POPULAR_WORKS,
        5,
        Date.now(),
        45
      );
      setWorks(rotated);
    };

    if (!initialWorks || initialWorks.length === 0) {
      syncRotation();
    }

    const interval = setInterval(syncRotation, 60_000);
    return () => clearInterval(interval);
  }, [initialWorks, communityWorks]);

  // Extrai paleta cromática da capa ativa e armazena em cache leve (restrita a este componente)
  useEffect(() => {
    const sampleUrl = activeWork.coverUrl || activeWork.coverHighResUrl;
    if (!sampleUrl) return;
    if (extractedAccents[activeWork.id]) return;

    let cancelled = false;
    extractDominantCoverAccent(sampleUrl, fallbackAccent).then((color) => {
      if (!cancelled) {
        setExtractedAccents((prev) => ({
          ...prev,
          [activeWork.id]: color,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeWork.id,
    activeWork.coverUrl,
    activeWork.coverHighResUrl,
    fallbackAccent,
    extractedAccents,
  ]);

  // Pré-carrega discretamente apenas a capa da próxima obra (evita baixar todas em alta resolução de uma vez)
  useEffect(() => {
    if (works.length <= 1 || typeof window === 'undefined') return;
    const nextWork = works[(activeIndex + 1) % works.length];
    const nextSrc = nextWork?.coverHighResUrl || nextWork?.coverUrl;
    if (!nextSrc) return;
    const img = new window.Image();
    img.src = nextSrc;
  }, [activeIndex, works]);

  // Auto-rotação com pausa automática ao interagir ou com prefers-reduced-motion
  useEffect(() => {
    if (isPaused || shouldReduceMotion || works.length <= 1) return;
    const stepMs = 50;
    const increment = (stepMs / AUTOPLAY_MS) * 100;

    const timer = setInterval(() => {
      const next = progressRef.current + increment;
      if (next >= 100) {
        progressRef.current = 0;
        setProgress(0);
        setSlide(([prev]) => [(prev + 1) % works.length, 1]);
      } else {
        progressRef.current = next;
        setProgress(next);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [isPaused, shouldReduceMotion, works.length]);

  const { data: cloudState } = useQuery({
    queryKey: ['yomi-cloud-doc', user?.uid],
    queryFn: () =>
      fetchUserCloudDoc(user!.uid, user!.email, user!.displayName),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const activeCleanId = cleanMangaDexId(activeWork.id);

  const continueChapter = useMemo<YomiChapterEntry | undefined>(() => {
    if (!cloudState) return undefined;
    const fromRecent = cloudState.recentReads.find(
      (item) => cleanMangaDexId(item.manga?.id ?? '') === activeCleanId
    )?.chapter;
    if (fromRecent?.id) return fromRecent;

    const hist = cloudState.backup?.history ?? {};
    const fromHistory = (hist[`last_${activeWork.id}`] ??
      hist[`last_${activeCleanId}`]) as YomiChapterEntry | undefined;
    return fromHistory?.id ? fromHistory : undefined;
  }, [cloudState, activeWork.id, activeCleanId]);

  const isFavorited = useMemo(() => {
    if (!cloudState) return false;
    return cloudState.favorites.some(
      (fav) => cleanMangaDexId(fav.id) === activeCleanId
    );
  }, [cloudState, activeCleanId]);

  const selectIndex = useCallback(
    (nextIdx: number, explicitDirection?: 1 | -1) => {
      if (nextIdx === activeIndex || works.length === 0) return;
      const bounded = ((nextIdx % works.length) + works.length) % works.length;
      const nextDir: 1 | -1 =
        explicitDirection ?? (bounded > activeIndex ? 1 : -1);
      progressRef.current = 0;
      setProgress(0);
      setSlide([bounded, nextDir]);
    },
    [activeIndex, works.length]
  );

  const handlePrev = useCallback(() => {
    selectIndex(activeIndex - 1, -1);
  }, [activeIndex, selectIndex]);

  const handleNext = useCallback(() => {
    selectIndex(activeIndex + 1, 1);
  }, [activeIndex, selectIndex]);

  const handleToggleFavorite = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (favBusyId === activeWork.id) return;
    setFavBusyId(activeWork.id);
    try {
      const res = await toggleCloudFavorite(
        user.uid,
        user.email,
        toCloudMangaEntry(activeWork)
      );
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      setLibraryNotice(
        res.isFavorite ? 'Adicionado à biblioteca' : 'Removido da biblioteca'
      );
      window.setTimeout(() => setLibraryNotice(null), 2600);
    } finally {
      setFavBusyId(null);
    }
  };

  const handleStageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
  };

  const dynamicAccent = extractedAccents[activeWork.id] ?? fallbackAccent;
  const statusLabel = formatWorkStatusLabel(activeWork.status);
  const workHref = buildWorkHref(activeWork.id, activeWork.title);

  const primaryCtaHref = continueChapter?.id
    ? `/ler/${encodeURIComponent(continueChapter.id)}`
    : workHref;
  const primaryCtaLabel = continueChapter?.id
    ? `Continuar Cap. ${continueChapter.chapterNumber ?? ''}`.trim()
    : 'Ver Obra';

  return (
    <section
      aria-labelledby="billboard-heading"
      className={`relative overflow-hidden ${
        compactSpacing ? 'py-4 sm:py-6' : 'py-10 sm:py-14 lg:py-16'
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Compact Header Row */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={`flex flex-wrap items-end justify-between gap-4 ${
            compactSpacing ? 'mb-4 sm:mb-5' : 'mb-5 sm:mb-7'
          }`}
        >
          <div>
            <h2
              id="billboard-heading"
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white"
            >
              {hasCommunityRatings ? 'Em alta no YOMI' : 'Destaques para descobrir'}
            </h2>
            <p className="mt-2 text-xs text-white/50">
              {hasCommunityRatings ? 'Escolhidos pelas avaliações da comunidade' : 'Descubra sua próxima leitura e ajude a formar o ranking'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(isPaused || shouldReduceMotion) && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60">
                <Pause className="h-3 w-3" />
                Pausado
              </span>
            )}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Obra anterior em alta"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próxima obra em alta"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Main Cinema Showcase Stage (Local Scoped Palette Only) */}
        {activeRating && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75" aria-live="polite">
            <span className="text-[var(--yomi-accent)]">★ {(activeRating.total / activeRating.count).toFixed(1).replace('.', ',')}</span>
            <span className="text-white/40">·</span>
            <span>{activeRating.count} {activeRating.count === 1 ? 'avaliação' : 'avaliações'}</span>
          </div>
        )}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={hasCommunityRatings ? "Vitrine Em alta no YOMI" : "Destaques para descobrir"}
          tabIndex={0}
          onKeyDown={handleStageKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsPaused(false);
            }
          }}
          style={
            {
              '--billboard-accent': dynamicAccent,
            } as React.CSSProperties
          }
          className="relative rounded-[28px] sm:rounded-[32px] border border-white/[0.1] bg-[#0B0B11] overflow-hidden shadow-[0_28px_90px_-30px_rgba(0,0,0,0.92)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {/* Scoped Layer 1: Dynamic Blurred Cover Backdrop + Contrast Scrims */}
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={`bg-${activeWork.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.6 }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeWork.coverUrl || activeWork.coverHighResUrl}
                alt=""
                className="h-full w-full object-cover object-center opacity-28 blur-3xl scale-115 saturate-125"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0';
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Scoped Color Lighting + Multi-stop Scrims for Guaranteed Contrast */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-[background] duration-700"
            style={{
              background: `radial-gradient(circle at 22% 42%, ${dynamicAccent}3D 0%, rgba(11,11,17,0.82) 52%, rgba(7,7,9,0.96) 100%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070709] via-[#0B0B11]/55 to-[#070709]/65"
          />

          <div
            aria-live="polite"
            className="relative z-10 p-5 sm:p-8 lg:p-10 flex flex-col justify-between gap-7 lg:gap-8"
          >
            {/* Primary Work Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-7 lg:gap-10">
              {/* Main Cover + Subtle YOMI Organic Blob Signature */}
              <div className="lg:col-span-4 xl:col-span-4 flex justify-center relative">
                {/* Subtle Organic YOMI Aura Blob behind the cover */}
                <motion.svg
                  aria-hidden="true"
                  viewBox="0 0 320 320"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: [1, 1.05, 0.98, 1],
                          rotate: [0, 8, -5, 0],
                        }
                  }
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : {
                          duration: 14,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                  }
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[330px] w-[330px] sm:h-[370px] sm:w-[370px] opacity-35 blur-2xl"
                >
                  <path
                    d="M251.5,95.4C278.4,132.2,279.6,184.4,254.9,224.2C230.2,264,179.5,291.4,130.6,283.3C81.8,275.3,34.7,231.9,28.1,181.6C21.5,131.3,55.3,74.1,103.5,48.3C151.7,22.5,214.6,28.6,244.4,69.5Z"
                    fill={dynamicAccent}
                    className="transition-colors duration-700"
                  />
                </motion.svg>

                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  <motion.div
                    key={`cover-${activeWork.id}`}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            x: direction * 28,
                            scale: 0.96,
                          }
                    }
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0, transition: { duration: 0.1 } }
                        : {
                            opacity: 0,
                            x: direction * -24,
                            scale: 0.97,
                            transition: { duration: 0.16, ease: 'easeIn' },
                          }
                    }
                    transition={{
                      duration: shouldReduceMotion ? 0.15 : 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="relative w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px]"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute -inset-3 rounded-[30px] opacity-40 blur-xl transition-colors duration-700"
                      style={{ backgroundColor: dynamicAccent }}
                    />

                    <Link
                      href={workHref}
                      className="group transform-gpu [backface-visibility:hidden] relative block aspect-[3/4.2] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-[#12121B] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <div className="absolute inset-0 overflow-hidden [transform:translateZ(0)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeWork.coverHighResUrl || activeWork.coverUrl}
                          alt={`Capa oficial de ${activeWork.title}`}
                          className="h-full w-full object-cover object-top transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                      </div>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-[#070709]/85 via-[#070709]/35 to-transparent"
                      />
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Editorial Work Information Hierarchy */}
              <div className="lg:col-span-8 xl:col-span-8 flex flex-col justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`meta-${activeWork.id}`}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: direction * 18 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0, transition: { duration: 0.1 } }
                        : {
                            opacity: 0,
                            x: direction * -16,
                            transition: { duration: 0.15, ease: 'easeIn' },
                          }
                    }
                    transition={{
                      duration: shouldReduceMotion ? 0.15 : 0.3,
                      delay: shouldReduceMotion ? 0 : 0.03,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="space-y-4 sm:space-y-5"
                  >
                    {/* 1. Highlight Badge + Top Genres */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold text-white transition-colors duration-500"
                        style={{
                          backgroundColor: `${dynamicAccent}33`,
                          border: `1px solid ${dynamicAccent}88`,
                        }}
                      >
                        Em Alta #{activeIndex + 1}
                      </span>
                      {activeWork.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/85"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>

                    {/* 2. Title & Optional Alternative Title */}
                    <div>
                      <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-[3.35rem] font-extrabold tracking-tight text-white leading-[1.05] line-clamp-2">
                        {activeWork.title}
                      </h3>
                      {/* 3. Author / Artist */}
                      <p className="mt-2 text-sm sm:text-base font-medium text-white/60">
                        {activeWork.author}
                        {activeWork.artist &&
                        activeWork.artist !== activeWork.author
                          ? ` • Arte: ${activeWork.artist}`
                          : ''}
                        {activeWork.altTitle ? ` · ${activeWork.altTitle}` : ''}
                      </p>
                    </div>

                    {/* 4. Synopsis (clamped height prevents layout jump) */}
                    <p className="max-w-2xl text-sm sm:text-base lg:text-[17px] leading-relaxed text-white/75 line-clamp-3">
                      {activeWork.description}
                    </p>

                    {/* 5. Real Source Metadata Pills (never invented) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/75">
                      {statusLabel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-medium">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: dynamicAccent }}
                          />
                          {statusLabel}
                        </span>
                      )}
                      {activeWork.year && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-medium">
                          {activeWork.year}
                        </span>
                      )}
                      {activeWork.featuredChapterLabel && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-medium text-white/85">
                          {activeWork.featuredChapterLabel}
                        </span>
                      )}
                    </div>

                    {/* 6. Primary & Secondary Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Link
                        href={primaryCtaHref}
                        style={{
                          backgroundColor: dynamicAccent,
                          boxShadow: `0 12px 30px -10px ${dynamicAccent}AA`,
                        }}
                        className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        {continueChapter?.id ? (
                          <BookOpen className="h-4 w-4 shrink-0" />
                        ) : null}
                        <span>{primaryCtaLabel}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>

                      <Link
                        href="/explorar"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-sm font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <span>Explorar Catálogo</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleToggleFavorite}
                        disabled={favBusyId === activeWork.id}
                        aria-pressed={isFavorited}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-3.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60 ${
                          isFavorited
                            ? 'border-white/30 bg-white/15 text-white'
                            : 'border-white/12 bg-white/[0.04] text-white/85 hover:border-white/25 hover:bg-white/[0.09]'
                        }`}
                      >
                        {favBusyId === activeWork.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isFavorited ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                        <span>
                          {isFavorited
                            ? 'Na Biblioteca'
                            : 'Adicionar à Biblioteca'}
                        </span>
                      </button>

                      {libraryNotice && (
                        <span className="text-xs font-medium text-emerald-300">
                          {libraryNotice}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom 5-Work Selector Strip */}
            <div className="pt-5 sm:pt-6 border-t border-white/[0.08]">
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
                {works.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const itemAccent =
                    extractedAccents[item.id] ?? item.accentColor ?? '#8B5CF6';
                  const ratio = isActive
                    ? isPaused || shouldReduceMotion
                      ? 1
                      : Math.min(1, Math.max(0, progress / 100))
                    : 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectIndex(idx)}
                      aria-label={`Selecionar destaque ${idx + 1}: ${item.title}`}
                      aria-pressed={isActive}
                      style={
                        isActive
                          ? {
                              borderColor: `${itemAccent}99`,
                              boxShadow: `0 12px 28px -12px ${itemAccent}88`,
                            }
                          : undefined
                      }
                      className={`group/pill relative snap-start min-w-[205px] sm:min-w-[230px] lg:min-w-0 flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                        isActive
                          ? 'bg-white/[0.11] -translate-y-0.5'
                          : 'border-white/[0.08] bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex w-full items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.coverUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-16 w-12 shrink-0 rounded-xl object-cover object-top bg-white/5 shadow-md transition-transform duration-300 group-hover/pill:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-white/50">
                              {item.tags[0]?.name ?? 'Em alta'}
                            </span>
                            <span className="text-[10px] font-mono text-white/35">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="mt-1 block font-display text-sm font-bold text-white line-clamp-2 leading-snug">
                            {item.title}
                          </span>
                        </div>
                      </div>

                      {/* Clean GPU-accelerated progress/selection bar */}
                      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        {isActive && (
                          <div
                            key={`bar-${item.id}`}
                            className="h-full w-full origin-left rounded-full"
                            style={{
                              transform: `scaleX(${ratio})`,
                              backgroundColor: itemAccent,
                              opacity: isPaused || shouldReduceMotion ? 0.8 : 1,
                            }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
