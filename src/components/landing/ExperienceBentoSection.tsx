'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';

export function ExperienceBentoSection({
  latestVersion,
  downloadUrl,
}: {
  latestVersion: string;
  downloadUrl: string;
}) {
  const { user } = useYomiAuth();

  if (user) {
    return null;
  }

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="mb-8 max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 mb-3">
            Ecossistema
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Pensado para quem lê todos os dias.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="md:col-span-5 relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0B0B11] p-6 sm:p-8 flex flex-col justify-between min-h-[240px]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-[var(--yomi-accent)] opacity-25 blur-3xl"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Android &amp; Web
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                Tempo real
              </span>
            </div>
            <div className="mt-8">
              <h3 className="font-display text-2xl font-bold text-white">
                Sincronia Instantânea
              </h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                Comece um capítulo no celular e continue da mesma página no navegador, com favoritos e coleções sempre salvos.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="md:col-span-7 relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0C0C13] p-6 sm:p-8 flex flex-col justify-between min-h-[240px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Webtoon &amp; Paginado
              </span>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/75">
                  Rolagem sem frestas
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/75">
                  RTL / LTR
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Leitura Sob Medida
                </h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  Fluxo vertical contínuo para webtoons ou páginas clássicas com pré-carregamento inteligente para nunca travar.
                </p>
              </div>
              <div
                aria-hidden="true"
                className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#070709] p-3"
              >
                <div className="h-5 w-full rounded-md bg-gradient-to-r from-white/15 to-white/5" />
                <div className="h-8 w-full rounded-md bg-gradient-to-r from-[var(--yomi-accent)]/30 via-purple-500/20 to-white/5" />
                <div className="h-5 w-4/5 rounded-md bg-white/10" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="md:col-span-12 relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0C0C13] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Zero anúncios, leitura offline no Android e backup portátil
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Sem pop-ups ou rastreadores. Baixe capítulos para ler sem internet no celular e leve sua biblioteca em arquivo .kuro.
              </p>
            </div>

            <Link
              href="/conta"
              className="group shrink-0 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
            >
              <span>Acessar Minha Conta</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[#0B0B11] px-6 py-14 sm:px-12 sm:py-16 text-center"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--yomi-accent)] opacity-30 blur-[110px]"
          />

          <div className="relative z-10 mx-auto max-w-2xl space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-white/75">
              Gratuito · Android 8.0+ &amp; Web
            </span>

            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Sua próxima leitura começa agora.
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2.5 rounded-full bg-[var(--yomi-accent)] px-7 py-4 text-sm sm:text-base font-semibold text-white shadow-[0_0_32px_var(--yomi-accent-glow)] transition-all hover:brightness-110 hover:scale-[1.02]"
              >
                <Download className="h-4 w-4" />
                <span>Baixar YOMI {latestVersion}</span>
              </a>

              <Link
                href="/explorar"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-7 py-4 text-sm sm:text-base font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10"
              >
                <span>Abrir Catálogo Web</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
