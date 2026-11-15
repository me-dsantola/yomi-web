'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import { SmartDownloadBox } from '@/components/download/SmartDownloadBox';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';
import type { YomiReleaseInfo } from '@/lib/github/releases';
import type { MangaDexWork } from '@/lib/mangadex/types';

interface HeroSectionAnimatedProps {
  release: YomiReleaseInfo;
  showcaseWorks: MangaDexWork[];
}

export function HeroSectionAnimated({
  release,
  showcaseWorks,
}: HeroSectionAnimatedProps) {
  const leadWork = showcaseWorks[0];
  const stackWorks = showcaseWorks.slice(1, 4);

  return (
    <section className="relative overflow-hidden pt-28 pb-14 sm:pt-36 sm:pb-20">
      {/* Architectural Grid + Luminous Horizon Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 75% 65% at 50% 25%, black 20%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 75% 65% at 50% 25%, black 20%, transparent 100%)',
          }}
        />
        <div
          className="absolute -top-48 left-1/2 h-[540px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[130px] transition-colors duration-700"
          style={{
            background:
              'radial-gradient(circle, var(--yomi-accent) 0%, var(--yomi-accent-secondary) 48%, transparent 72%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
          {/* Left Editorial Column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-7"
          >
            {/* Version Pill */}
            <Link
              href="/download"
              className="group inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.08]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>Android · {release.tagName}</span>
              <ArrowRight className="h-3.5 w-3.5 text-white/45 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </Link>

            {/* Monumental Display Heading */}
            <div className="space-y-4">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.7rem] font-extrabold tracking-tight text-white leading-[1.03]">
                Mangás, Manhwas e Webtoons.{' '}
                <span className="block bg-gradient-to-r from-white via-white/90 to-[var(--yomi-accent)] bg-clip-text text-transparent">
                  Sem limites, onde você estiver.
                </span>
              </h1>

              <p className="max-w-lg text-base sm:text-lg leading-relaxed text-white/60">
                Mais de 50.000 obras em alta definição, leitura contínua ou paginada e biblioteca sincronizada em tempo real entre o celular e o navegador.
              </p>
            </div>

            {/* Primary Smart Download Box */}
            <SmartDownloadBox release={release} />

            {/* Subtle Secondary Discovery Link */}
            <div className="flex flex-wrap items-center gap-6 pt-1 text-sm">
              <Link
                href="/explorar"
                className="group inline-flex items-center gap-2 font-medium text-white/85 transition-colors hover:text-white"
              >
                <BookOpen className="h-4 w-4 text-[var(--yomi-accent)]" />
                <span>Explorar catálogo web</span>
                <ArrowUpRight className="h-4 w-4 text-white/45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
              </Link>

              <Link
                href="/instalar"
                className="text-white/50 transition-colors hover:text-white/85"
              >
                Guia de instalação
              </Link>
            </div>
          </motion.div>

          {/* Right Asymmetric Bento Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.7,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="lg:col-span-6"
          >
            <div className="grid grid-cols-12 gap-4 items-stretch">
              {/* Primary Tall Cover Tile */}
              {leadWork && (
                <Link
                  href={`/obra/${leadWork.id}`}
                  className="group transform-gpu [backface-visibility:hidden] relative col-span-12 sm:col-span-7 overflow-hidden rounded-[26px] border border-white/12 bg-[#0D0D14] shadow-2xl min-h-[420px] sm:min-h-[480px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <div className="absolute inset-0 overflow-hidden [transform:translateZ(0)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={leadWork.coverHighResUrl || leadWork.coverUrl}
                      alt={`Capa de ${leadWork.title}`}
                      className="h-full w-full object-cover object-top transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.04]"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/brand/icon-1024.png';
                      }}
                    />
                  </div>

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10 [transform:translateZ(0)] bg-gradient-to-t from-[#070709] via-[#070709]/35 to-transparent"
                  />

                  <div className="absolute top-4 left-4 right-4 z-10 [transform:translateZ(0)] flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-[#070709]/85 px-3 py-1 text-[11px] font-medium text-white">
                      Destaque
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#070709]/85 text-white/85 transition-transform group-hover:scale-110">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 [transform:translateZ(0)] p-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/65">
                      {leadWork.tags
                        .slice(0, 2)
                        .map((t) => t.name)
                        .join(' · ')}
                    </p>
                    <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-2">
                      {leadWork.title}
                    </h2>
                  </div>
                </Link>
              )}

              {/* Stacked Right Bento Tiles */}
              <div className="col-span-12 sm:col-span-5 flex flex-col gap-4">
                {/* Filled 3-Cover Global Catalog Tile */}
                <Link
                  href="/explorar"
                  className="group relative flex-1 overflow-hidden rounded-[26px] border border-white/10 bg-[#0D0D14]/90 p-5 flex flex-col justify-between transition-all hover:border-white/25 hover:bg-[#12121C]"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[var(--yomi-accent)] opacity-25 blur-2xl transition-opacity group-hover:opacity-45"
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                      Acervo Global
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-0.5 font-display text-xs font-bold text-white">
                      +50 mil obras
                    </span>
                  </div>

                  {/* Centered 3-Cover Poster Strip filling empty area cleanly */}
                  <div className="relative z-10 my-4 grid grid-cols-3 gap-2.5">
                    {stackWorks.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-[3/4.2] overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-lg"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.coverUrl}
                          alt={`Capa de ${item.title}`}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
                    <span className="text-white/55">
                      Mangás · Manhwas · Webtoons
                    </span>
                    <span className="font-semibold text-white/85 group-hover:text-white inline-flex items-center gap-1">
                      Explorar <ArrowRight className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                    </span>
                  </div>
                </Link>

                {/* Live Interactive Blobatar synced with active site theme */}
                <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0D0D14]/90 p-5 flex items-center gap-4">
                  <div className="shrink-0">
                    <BlobatarCompanion
                      seed="YOMI"
                      mascotName="Yomi"
                      size={84}
                      followPointer
                      interactiveCycle
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/65">
                      Mascote
                    </span>
                    <h3 className="mt-1.5 font-display text-base font-bold text-white">
                      Blobatar Reativo
                    </h3>
                    <p className="mt-0.5 text-xs text-white/55">
                      Acompanha as cores do tema e seu cursor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
