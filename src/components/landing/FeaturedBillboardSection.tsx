'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CURATED_POPULAR_WORKS,
  selectTimeWindowFeaturedWorks,
} from '@/lib/mangadex/curatedCatalog';
import type { MangaDexWork } from '@/lib/mangadex/types';

interface FeaturedBillboardSectionProps {
  initialWorks?: MangaDexWork[];
}

const AUTOPLAY_MS = 6500;

export function FeaturedBillboardSection({
  initialWorks,
}: FeaturedBillboardSectionProps) {
  const [works, setWorks] = useState<MangaDexWork[]>(() =>
    initialWorks && initialWorks.length > 0
      ? initialWorks.slice(0, 5)
      : CURATED_POPULAR_WORKS.slice(0, 5)
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
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
  }, [initialWorks]);

  useEffect(() => {
    if (isPaused || works.length <= 1) return;
    const stepMs = 40;
    const increment = (stepMs / AUTOPLAY_MS) * 100;

    const timer = setInterval(() => {
      const next = progressRef.current + increment;
      if (next >= 100) {
        progressRef.current = 0;
        setProgress(0);
        setActiveIndex((prev) => (prev + 1) % works.length);
      } else {
        progressRef.current = next;
        setProgress(next);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [isPaused, works.length]);

  const activeWork = works[activeIndex] ?? CURATED_POPULAR_WORKS[0];
  const accent = activeWork.accentColor ?? '#FF2A55';

  const selectIndex = (nextIdx: number) => {
    progressRef.current = 0;
    setProgress(0);
    setActiveIndex(nextIdx);
  };

  const handlePrev = () => {
    selectIndex((activeIndex - 1 + works.length) % works.length);
  };

  const handleNext = () => {
    selectIndex((activeIndex + 1) % works.length);
  };

  return (
    <section
      aria-labelledby="billboard-heading"
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Clean Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/75 mb-3">
              Destaques
            </span>
            <h2
              id="billboard-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
            >
              Em alta no YOMI
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Destaque anterior"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próximo destaque"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Main Cinema Showcase Stage */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          className="relative min-h-[560px] lg:min-h-[640px] rounded-[32px] border border-white/[0.1] bg-[#0B0B11] overflow-hidden shadow-[0_32px_100px_-30px_rgba(0,0,0,0.92)]"
        >
          {/* Reactive Ambient Blur Background from active cover */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`bg-${activeWork.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeWork.coverHighResUrl || activeWork.coverUrl}
                alt=""
                className="h-full w-full object-cover object-top opacity-25 blur-3xl scale-110"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0';
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 20% 45%, ${accent}33 0%, rgba(11,11,17,0.88) 54%, rgba(7,7,9,0.97) 100%)`,
                }}
              />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 p-6 sm:p-10 lg:p-14 flex flex-col justify-between gap-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12">
              {/* Large Tall Cover Frame */}
              <div className="lg:col-span-5 flex justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`cover-${activeWork.id}`}
                    initial={{ opacity: 0, scale: 0.94, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -14 }}
                    transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[460px]"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute -inset-5 rounded-[34px] opacity-40 blur-2xl transition-colors duration-700"
                      style={{ backgroundColor: accent }}
                    />

                    <Link
                      href={`/obra/${activeWork.id}`}
                      className="group transform-gpu [backface-visibility:hidden] relative block aspect-[3/4.2] w-full overflow-hidden rounded-3xl border border-white/15 bg-[#12121B] shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <div className="absolute inset-0 overflow-hidden [transform:translateZ(0)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeWork.coverHighResUrl || activeWork.coverUrl}
                          alt={`Capa oficial de ${activeWork.title}`}
                          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.03]"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                      </div>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 [transform:translateZ(0)] h-28 bg-gradient-to-t from-[#070709] via-[#070709]/65 to-transparent"
                      />
                      <div className="absolute bottom-4 left-4 right-4 z-10 [transform:translateZ(0)] flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-[#070709]/90 px-3.5 py-1 text-xs font-medium text-white">
                          {activeWork.featuredChapterLabel ?? 'Disponível'}
                        </span>
                        {activeWork.year && (
                          <span className="rounded-full border border-white/10 bg-[#070709]/90 px-3 py-1 text-xs font-medium text-white/85">
                            {activeWork.year}
                          </span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Large Animated Editorial Showcase Details */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`meta-${activeWork.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.04 }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span
                        className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold text-white"
                        style={{
                          backgroundColor: `${accent}26`,
                          border: `1px solid ${accent}66`,
                        }}
                      >
                        Destaque #{activeIndex + 1}
                      </span>
                      {activeWork.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-medium text-white/85"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.09 }}
                    >
                      <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold tracking-tight text-white leading-[1.02]">
                        {activeWork.title}
                      </h3>
                      <p className="mt-3 text-sm sm:text-base font-medium text-white/55">
                        {activeWork.author}
                        {activeWork.altTitle ? ` · ${activeWork.altTitle}` : ''}
                      </p>
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.14 }}
                      className="max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-white/75 line-clamp-3"
                    >
                      {activeWork.description}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.38, delay: 0.19 }}
                      className="flex flex-wrap items-center gap-4 pt-2"
                    >
                      <Link
                        href={`/obra/${activeWork.id}`}
                        style={{ backgroundColor: accent }}
                        className="group inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-sm sm:text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <span>Ver Obra</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>

                      <Link
                        href="/explorar"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 py-4 text-sm sm:text-base font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        <span>Explorar Catálogo</span>
                      </Link>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Enlarged, Animated 5-Work "Em alta" Selector Cards with Glitch-Free Progress */}
            <div className="pt-8 border-t border-white/[0.08]">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {works.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const itemAccent = item.accentColor ?? '#8B5CF6';
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => selectIndex(idx)}
                      aria-label={`Selecionar destaque: ${item.title}`}
                      aria-pressed={isActive}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.38, delay: idx * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={
                        isActive
                          ? {
                              borderColor: `${itemAccent}88`,
                              boxShadow: `0 12px 32px -12px ${itemAccent}66`,
                            }
                          : undefined
                      }
                      className={`group/pill relative flex flex-col justify-between rounded-2xl border p-3 sm:p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        isActive
                          ? 'bg-white/[0.11]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex w-full items-center gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.coverUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-20 w-14 sm:h-24 sm:w-[68px] shrink-0 rounded-xl object-cover object-top bg-white/5 shadow-md transition-transform duration-300 group-hover/pill:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/45">
                            {item.tags[0]?.name ?? 'Popular'}
                          </span>
                          <span className="mt-1 block font-display text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug">
                            {item.title}
                          </span>
                        </div>
                      </div>

                      {/* Real time-synced progress bar that pauses seamlessly in place */}
                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        {isActive && (
                          <div
                            className="h-full rounded-full transition-[width] duration-75 ease-linear"
                            style={{
                              width: `${Math.min(100, progress)}%`,
                              backgroundColor: itemAccent,
                            }}
                          />
                        )}
                      </div>
                    </motion.button>
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
