"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  buildWorkHref,
  searchMangaCatalog,
  type SearchMangaOptions,
} from "@/lib/mangadex/api";
import { CURATED_POPULAR_WORKS } from "@/lib/mangadex/curatedCatalog";
import { POPULAR_MANGADEX_TAGS } from "@/lib/mangadex/types";

const PAGE_SIZE = 48;

export default function ExplorarPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [order, setOrder] = useState<SearchMangaOptions["order"]>("popular");
  const [safeOnly, setSafeOnly] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isDefaultPopular =
    !debouncedQuery && !selectedTag && order === "popular";

  const {
    data: works = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "mangadex-catalog",
      debouncedQuery,
      selectedTag,
      order,
      safeOnly,
      page,
    ],
    queryFn: () =>
      searchMangaCatalog({
        query: debouncedQuery,
        tagId: selectedTag || undefined,
        order,
        safeOnly,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    placeholderData:
      page === 1 && isDefaultPopular ? CURATED_POPULAR_WORKS : undefined,
  });

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage === page) return;
    setPage(nextPage);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const viewKey = `${page}-${order}-${selectedTag}-${debouncedQuery}-${safeOnly}`;
  const visiblePageNumbers = [1, 2, 3, 4, 5];

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pt-28 sm:pt-32 pb-20 space-y-8">
      {/* Minimal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-[var(--yomi-accent)]/30 bg-[var(--yomi-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--yomi-accent)]">
            Catálogo Web • +50.000 Obras
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Explorar Acervo
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full rounded-full border border-white/12 bg-[#0E0E14] py-3 pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-white/40 focus:border-[var(--yomi-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span className="font-semibold text-white">Ordenar:</span>
            {(
              [
                { id: "popular", label: "Mais Populares" },
                { id: "latest", label: "Recém Atualizados" },
                { id: "rating", label: "Notas MangaDex" },
                { id: "title", label: "A–Z" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setOrder(opt.id);
                  setPage(1);
                }}
                className={`rounded-full px-3.5 py-2 sm:py-1.5 text-xs font-medium transition ${
                  order === opt.id
                    ? "bg-[var(--yomi-accent)] text-white"
                    : "bg-white/5 text-white/65 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSafeOnly((v) => !v);
              setPage(1);
            }}
            className={`inline-flex items-center rounded-full border px-3.5 py-2 sm:py-1.5 text-xs font-medium transition ${
              safeOnly
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            {safeOnly ? "Filtro Seguro (SFW)" : "Incluindo Sugestivo / +18"}
          </button>
        </div>

        {/* Genre Pills — Horizontal Scroll on Mobile, Wrapped on Desktop */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setSelectedTag("");
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 sm:py-1 text-xs font-medium transition ${
              selectedTag === ""
                ? "bg-white text-black font-semibold"
                : "border border-white/10 bg-black/30 text-white/65 hover:text-white"
            }`}
          >
            Todos os Gêneros
          </button>
          {POPULAR_MANGADEX_TAGS.map((tag) => {
            const active = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setSelectedTag(active ? "" : tag.id);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 sm:py-1 text-xs font-medium transition ${
                  active
                    ? "bg-white text-black font-semibold"
                    : "border border-white/10 bg-black/30 text-white/65 hover:text-white"
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Area with Animated Page Switching + Scroll Rise Cards */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key={`loading-${viewKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-5"
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4.4] animate-pulse rounded-2xl border border-white/[0.06] bg-[#0E0E14]"
              />
            ))}
          </motion.div>
        ) : isError ? (
          <motion.div
            key={`error-${viewKey}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-3"
          >
            <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Não foi possível conectar ao catálogo no momento
            </h3>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-[var(--yomi-accent)] px-5 py-2 text-xs font-semibold text-white"
            >
              Tentar Novamente
            </button>
          </motion.div>
        ) : works.length === 0 ? (
          <motion.div
            key={`empty-${viewKey}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border border-white/10 bg-[#0E0E14] p-12 text-center space-y-2"
          >
            <BookOpen className="mx-auto h-8 w-8 text-white/40" />
            <h3 className="font-display text-base font-bold text-white">
              Nenhuma obra encontrada para esta busca
            </h3>
          </motion.div>
        ) : (
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-5">
              {works.map((work, idx) => (
                <motion.div
                  key={work.id}
                  initial={{ opacity: 0, y: 36, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{
                    once: true,
                    amount: 0.1,
                    margin: "0px 0px -24px 0px",
                  }}
                  transition={{
                    duration: 0.45,
                    delay: (idx % 8) * 0.035,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    href={buildWorkHref(work.id, work.title)}
                    className="group transform-gpu [backface-visibility:hidden] flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E0E14] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_16px_40px_-14px_rgba(0,0,0,0.85)]"
                  >
                    <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-black/50 [transform:translateZ(0)]">
                      <div className="absolute inset-0 overflow-hidden [transform:translateZ(0)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={work.coverUrl}
                          alt={`Capa de ${work.title}`}
                          loading="lazy"
                          className="h-full w-full object-cover object-top transition-transform duration-500 will-change-transform group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/brand/icon-1024.png";
                          }}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,#09090df5_0%,#09090de8_75%,transparent_100%)] px-3 pb-3 pt-7">
                        <h2 className="break-words font-display text-sm font-bold leading-tight text-white line-clamp-2">{work.title}</h2>
                        <p className="mt-1 truncate text-[11px] text-white/75">{work.author}</p>
                      </div>
                      <span className="absolute left-2 top-2 rounded-md bg-black/80 px-2 py-1 text-[10px] text-white">{work.hasAvailableChapters === false ? "Sem capítulos" : work.status === "completed" ? "Completo" : "Em lançamento"}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination Bar */}
            <nav
              aria-label="Paginação do catálogo"
              className="flex flex-wrap items-center justify-center gap-2 pt-4"
            >
              <button
                type="button"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[#0E0E14] px-4 py-2 text-xs font-medium text-white/80 transition hover:border-white/25 hover:text-white disabled:opacity-35 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              {visiblePageNumbers.map((num) => {
                const isActive = num === page;
                const disabledPage =
                  num > page && works.length < PAGE_SIZE;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={disabledPage}
                    onClick={() => handlePageChange(num)}
                    aria-current={isActive ? "page" : undefined}
                    className={`h-9 w-9 rounded-full text-xs font-semibold transition ${
                      isActive
                        ? "bg-[var(--yomi-accent)] text-white shadow-[0_0_20px_var(--yomi-accent-glow)]"
                        : "border border-white/10 bg-[#0E0E14] text-white/70 hover:border-white/25 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={works.length < PAGE_SIZE}
                onClick={() => handlePageChange(page + 1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[#0E0E14] px-4 py-2 text-xs font-medium text-white/80 transition hover:border-white/25 hover:text-white disabled:opacity-35 disabled:pointer-events-none"
              >
                <span>Próxima</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
