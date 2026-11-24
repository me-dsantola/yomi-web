"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Clock,
  ChevronRight,
  Layers,
} from "lucide-react";
import { BlobatarCompanion } from "@/components/brand/BlobatarCompanion";

interface MockupSlide {
  id: string;
  label: string;
  subtitle: string;
  accentColor: string;
  glowRgba: string;
}

const SLIDES: MockupSlide[] = [
  {
    id: "home",
    label: "1. Destaques & Descoberta",
    subtitle: "Billboard imersivo rotativo com 5 populares aleatórios",
    accentColor: "#FF2A55",
    glowRgba: "rgba(255, 42, 85, 0.32)",
  },
  {
    id: "profile",
    label: "2. Perfil & Blobatar",
    subtitle: "Mascote reativo ao seu nível de leitura e conquistas",
    accentColor: "#8B5CF6",
    glowRgba: "rgba(139, 92, 246, 0.32)",
  },
  {
    id: "reader",
    label: "3. Leitor Sem Distrações",
    subtitle: "Webtoon contínuo sem frestas ou paginado RTL/LTR",
    accentColor: "#06B6D4",
    glowRgba: "rgba(6, 182, 212, 0.30)",
  },
];

export function PhoneMockupShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const currentSlide = SLIDES[activeIndex];

  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Reactive Ambilight Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 rounded-full blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${currentSlide.glowRgba}, transparent 70%)`,
        }}
      />

      {/* Smartphone Chassis */}
      <div className="relative z-10 h-[560px] w-[285px] sm:h-[600px] sm:w-[305px] rounded-[44px] border-[6px] border-[#1D1D28] bg-[#070709] p-2.5 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.12)]">
        {/* Top Speaker / Camera Pill */}
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-black/90 border border-white/[0.06] flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#151522] ring-1 ring-white/10" />
          <span className="h-1 w-8 rounded-full bg-white/10" />
        </div>

        {/* Screen Viewport */}
        <div className="relative h-[calc(100%-28px)] w-full overflow-hidden rounded-[32px] bg-[#070709] border border-white/[0.05]">
          <AnimatePresence mode="wait">
            {currentSlide.id === "home" && (
              <motion.div
                key="home"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="flex h-full flex-col justify-between p-3.5"
              >
                {/* Billboard Hero Card inside Phone */}
                <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#2A0E1B] via-[#130914] to-[#070709] p-3.5 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,42,85,0.35),transparent_60%)]" />
                  <div className="relative z-10 space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF2A55]/20 border border-[#FF2A55]/40 px-2 py-0.5 text-[10px] font-semibold text-[#FF2A55]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FF2A55]" /> EM DESTAQUE • #1
                    </span>
                    <h4 className="font-display text-base font-bold text-white leading-tight">
                      Solo Leveling: Arise
                    </h4>
                    <p className="text-[10px] text-white/65 line-clamp-2">
                      A jornada de Sung Jin-Woo nas dungeons de rank S em páginas verticais de alta definição.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="rounded-full bg-[#FF2A55] px-3 py-1 text-[10px] font-semibold text-white">
                        Ler Cap. 179
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/80">
                        + Biblioteca
                      </span>
                    </div>
                  </div>
                </div>

                {/* Continue Reading Strip */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#FF2A55]" /> Continuar Lendo
                    </span>
                    <span className="text-[10px] text-white/40">Sincronizado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-[#0E0E14] p-2.5">
                      <div className="text-[11px] font-semibold text-white truncate">
                        Berserk
                      </div>
                      <div className="mt-0.5 text-[10px] text-white/50">
                        Cap. 375 • Pág. 19
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-4/5 bg-[#FF2A55]" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-[#0E0E14] p-2.5">
                      <div className="text-[11px] font-semibold text-white truncate">
                        Omniscient Reader
                      </div>
                      <div className="mt-0.5 text-[10px] text-white/50">
                        Cap. 220 • Pág. 42
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-11/12 bg-[#8B5CF6]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mock Bottom Navigation */}
                <div className="flex items-center justify-around rounded-2xl border border-white/[0.08] bg-[#0E0E14]/90 py-2 text-[10px] text-white/50">
                  <span className="font-semibold text-[#FF2A55]">Início</span>
                  <span>Explorar</span>
                  <span>Biblioteca</span>
                  <span>Perfil</span>
                </div>
              </motion.div>
            )}

            {currentSlide.id === "profile" && (
              <motion.div
                key="profile"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="flex h-full flex-col justify-between p-3.5"
              >
                <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/50 to-[#0E0E14] p-3.5 text-center">
                  <div className="mx-auto flex justify-center">
                    <BlobatarCompanion
                      chaptersRead={148}
                      accentColor="#8B5CF6"
                      mascotName="Yomi-chan"
                      size="sm"
                    />
                  </div>
                  <div className="mt-2 text-xs font-bold text-white">
                    Leitor Veterano • Nv. 4
                  </div>
                  <div className="text-[10px] text-purple-300/80">
                    Sincronizado na nuvem (.kuro v4)
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-xl border border-white/[0.07] bg-[#0E0E14] p-2">
                    <div className="font-display text-sm font-bold text-white">148</div>
                    <div className="text-[9px] text-white/45">Capítulos</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-[#0E0E14] p-2">
                    <div className="font-display text-sm font-bold text-white">24</div>
                    <div className="text-[9px] text-white/45">Favoritos</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-[#0E0E14] p-2">
                    <div className="font-display text-sm font-bold text-purple-400">12d</div>
                    <div className="text-[9px] text-white/45">Ofensiva</div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-[#0E0E14] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 font-medium text-white/85">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Conquista Desbloqueada
                    </span>
                    <span className="text-purple-400">+250 XP</span>
                  </div>
                  <div className="text-[10px] text-white/55">
                    Maratonista Noturno — 50 capítulos lidos em AMOLED puro.
                  </div>
                </div>
              </motion.div>
            )}

            {currentSlide.id === "reader" && (
              <motion.div
                key="reader"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="flex h-full flex-col justify-between p-3.5"
              >
                {/* Top HUD */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0E0E14]/90 px-3 py-2 text-[10px]">
                  <span className="font-semibold text-white truncate">
                    Cap. 179 — Despertar
                  </span>
                  <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300">
                    WEBTOON 0px
                  </span>
                </div>

                {/* Simulated Seamless Panels */}
                <div className="my-2 flex-1 overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#091926] via-[#070709] to-[#0D1E2D] flex flex-col">
                  <div className="flex-1 border-b border-cyan-500/10 p-3 flex flex-col justify-between">
                    <span className="self-start rounded bg-black/60 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
                       Pré-carregamento inteligente (4 págs)
                    </span>
                    <div className="my-auto text-center space-y-1">
                      <Layers className="mx-auto h-7 w-7 text-cyan-400/80" />
                      <div className="font-display text-xs font-bold tracking-wide text-white">
                        ROLAGEM CONTÍNUA SEM FRESTAS
                      </div>
                      <p className="text-[10px] text-white/55 px-2">
                        Zero engasgos a 120Hz com decodificação otimizada para painéis longos de Manhwa.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#0B131B] p-2.5 text-center text-[10px] text-cyan-200/80">
                    Alternância instantânea: Webtoon Vertical ⇄ Paginado RTL
                  </div>
                </div>

                {/* Bottom Reader Controls */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0E0E14]/90 px-3 py-2 text-[10px] text-white/70">
                  <span>Pág. 14 / 42</span>
                  <div className="mx-3 h-1 flex-1 rounded-full bg-white/10">
                    <div className="h-full w-1/3 rounded-full bg-cyan-400" />
                  </div>
                  <span className="text-cyan-400 font-medium">HD</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Interactive Slide Switcher Pills */}
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-2">
        {SLIDES.map((slide, idx) => {
          const active = idx === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-white text-black shadow-sm"
                  : "border border-white/10 bg-[#0E0E14] text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              {slide.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-white/50">
        {currentSlide.subtitle}
      </p>
    </div>
  );
}
