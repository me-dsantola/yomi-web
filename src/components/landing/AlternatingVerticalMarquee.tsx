'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { CURATED_POPULAR_WORKS } from '@/lib/mangadex/curatedCatalog';
import { buildWorkHref } from '@/lib/mangadex/api';
import type { MangaDexWork } from '@/lib/mangadex/types';

interface MarqueeCardProps {
  work: MangaDexWork;
  cardKey: string;
  isSelected: boolean;
  onActivateCard: (key: string) => void;
  isClone?: boolean;
}

function MarqueeMangaCard({
  work,
  cardKey,
  isSelected,
  onActivateCard,
  isClone = false,
}: MarqueeCardProps) {
  const accent = work.accentColor ?? '#8B5CF6';
  const primaryGenres = work.tags.slice(0, 2);
  const lastPointerTypeRef = useRef<string>('');

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isTouchOrMobile =
      lastPointerTypeRef.current === 'touch' ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(hover: none), (pointer: coarse), (max-width: 768px)')
          .matches);

    if (isTouchOrMobile && !isSelected) {
      e.preventDefault();
      e.stopPropagation();
      onActivateCard(cardKey);
    }
  };

  return (
    <div className="pb-4 sm:pb-5">
      <Link
        href={buildWorkHref(work.id, work.title)}
        data-marquee-card="true"
        tabIndex={isClone ? -1 : 0}
        aria-hidden={isClone ? true : undefined}
        aria-label={
          isSelected
            ? `${work.title} — toque novamente para abrir a obra`
            : work.title
        }
        onPointerDown={(e) => {
          lastPointerTypeRef.current = e.pointerType;
        }}
        onTouchStart={() => {
          lastPointerTypeRef.current = 'touch';
        }}
        onClick={handleCardClick}
        style={
          {
            '--card-accent': accent,
            borderColor: isSelected ? accent : undefined,
            boxShadow: isSelected
              ? `0 22px 50px -14px ${accent}`
              : undefined,
          } as React.CSSProperties
        }
        className={`group/card transform-gpu [backface-visibility:hidden] relative block aspect-[3/4.2] w-full overflow-hidden rounded-2xl sm:rounded-3xl border bg-[#0D0D14] shadow-xl transition-all duration-300 ease-out hover:scale-[1.025] hover:border-white/30 hover:shadow-[0_22px_50px_-14px_var(--card-accent)] hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
          isSelected ? 'scale-[1.025] z-10' : 'border-white/10'
        }`}
      >
        {/* Full Cover Art (isolated compositing layer prevents overlay flicker) */}
        <div className="absolute inset-0 overflow-hidden [transform:translateZ(0)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={work.coverUrl || work.coverHighResUrl}
            alt={isClone ? '' : `Capa de ${work.title}`}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover object-top transition-transform duration-500 ease-out will-change-transform group-hover/card:scale-105 group-focus-within/card:scale-105 ${
              isSelected ? 'scale-105' : ''
            }`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/brand/icon-1024.png';
            }}
          />
        </div>

        <div className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/95 via-black/85 to-transparent px-3 pb-5 pt-3 text-white transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
          <p className="truncate text-[11px] font-semibold">{work.author}{work.year ? ` · ${work.year}` : ''}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">{work.description}</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(to_top,#09090df5_0%,#09090de8_75%,transparent_100%)] px-3 pb-3 pt-7 sm:px-4 sm:pb-4">
          <h3 className="break-words font-display text-sm font-bold leading-tight text-white line-clamp-2 sm:text-base">{work.title}</h3>
          <p className="mt-1 truncate text-[11px] text-white/75">{primaryGenres[0]?.name || work.author}</p>
          {isSelected && <p className="mt-1 text-[11px] text-white">Toque para abrir →</p>}
        </div>
      </Link>
    </div>
  );
}

const COLUMN_CONFIG = [
  { direction: 'up' as const, duration: '54s', mobileVisible: true },
  { direction: 'down' as const, duration: '60s', mobileVisible: true },
  { direction: 'up' as const, duration: '56s', mobileVisible: false },
  { direction: 'down' as const, duration: '50s', mobileVisible: false },
];

export interface AlternatingVerticalMarqueeProps {
  compactSpacing?: boolean;
}

export function AlternatingVerticalMarquee({
  compactSpacing = false,
}: AlternatingVerticalMarqueeProps = {}) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCardKey) return;
    const handleOutsidePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-marquee-card="true"]')) {
        setSelectedCardKey(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsidePointerDown,
        true
      );
    };
  }, [selectedCardKey]);

  const columns: MangaDexWork[][] = [[], [], [], []];
  CURATED_POPULAR_WORKS.forEach((work, index) => {
    columns[index % 4].push(work);
  });

  return (
    <section
      aria-labelledby="marquee-heading"
      className={`relative overflow-hidden ${
        compactSpacing ? 'py-6 sm:py-10' : 'py-16 sm:py-24'
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[480px] bg-radial from-[var(--yomi-accent-glow)] via-transparent to-transparent opacity-15 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 mb-3">
              Acervo
            </span>
            <h2
              id="marquee-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
            >
              Milhares de obras
            </h2>
          </div>

          <Link
            href="/explorar"
            className="group inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.09]"
          >
            <span>Explorar tudo</span>
            <ArrowUpRight className="h-4 w-4 text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
          </Link>
        </motion.div>

        {/* 4 columns desktop / 2 columns mobile with balanced vertical height */}
        <div
          className={`yomi-marquee-mask relative overflow-hidden ${
            compactSpacing
              ? 'h-[640px] sm:h-[780px] lg:h-[920px]'
              : 'h-[840px] sm:h-[1020px] lg:h-[1220px] xl:h-[1320px]'
          }`}
        >
          <div className="grid h-full grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {columns.map((colWorks, colIdx) => {
              const cfg = COLUMN_CONFIG[colIdx];
              const animClass =
                cfg.direction === 'up'
                  ? 'animate-yomi-marquee-up'
                  : 'animate-yomi-marquee-down';
              const colHasSelection = Boolean(
                selectedCardKey && selectedCardKey.startsWith(`col-${colIdx}-`)
              );

              return (
                <div
                  key={colIdx}
                  className={`group/col relative h-full overflow-hidden ${
                    cfg.mobileVisible ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <div
                    style={
                      {
                        '--marquee-duration': cfg.duration,
                      } as React.CSSProperties
                    }
                    className={`${animClass} flex flex-col group-hover/col:[animation-play-state:paused] focus-within:[animation-play-state:paused] ${
                      colHasSelection ? '[animation-play-state:paused]' : ''
                    }`}
                  >
                    {colWorks.map((work) => {
                      const key = `col-${colIdx}-a-${work.id}`;
                      return (
                        <MarqueeMangaCard
                          key={key}
                          cardKey={key}
                          work={work}
                          isSelected={selectedCardKey === key}
                          onActivateCard={setSelectedCardKey}
                        />
                      );
                    })}
                    {colWorks.map((work) => {
                      const key = `col-${colIdx}-b-${work.id}`;
                      return (
                        <MarqueeMangaCard
                          key={key}
                          cardKey={key}
                          work={work}
                          isSelected={selectedCardKey === key}
                          onActivateCard={setSelectedCardKey}
                          isClone
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
