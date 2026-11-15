"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Zap,
  Check,
  AlertCircle,
  Lock,
  Download,
} from "lucide-react";
import { fetchChapterMetaAndPages } from "@/lib/mangadex/api";
import { useReaderStore, type ReaderMode } from "@/lib/store/readerStore";
import { useYomiAuth } from "@/components/providers/AppProviders";
import { saveWebReaderProgressToCloud } from "@/lib/firebase/cloudSync";
import { CommentsSection } from "@/components/comments/CommentsSection";

const PREVIEW_PAGE_LIMIT = 3;

export default function QuickReaderPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = String(params?.chapterId ?? "");

  const { readerMode, setReaderMode, dataSaver, setDataSaver } =
    useReaderStore();
  const { user, openAuthModal } = useYomiAuth();

  const [currentPage, setCurrentPage] = useState(0);
  const [hudVisible, setHudVisible] = useState(true);
  const [cloudSaved, setCloudSaved] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mangadex-chapter-pages", chapterId],
    queryFn: () => fetchChapterMetaAndPages(chapterId),
    enabled: Boolean(chapterId),
  });

  const pageFiles = data
    ? dataSaver && data.pages.dataSaver.length > 0
      ? data.pages.dataSaver
      : data.pages.data
    : [];

  const isPreviewLocked = !user;
  const visiblePages = isPreviewLocked
    ? pageFiles.slice(0, PREVIEW_PAGE_LIMIT)
    : pageFiles;
  const maxPageIndex = isPreviewLocked
    ? visiblePages.length
    : Math.max(0, visiblePages.length - 1);

  const qualityPath =
    data && dataSaver && data.pages.dataSaver.length > 0
      ? "data-saver"
      : "data";

  const buildPageUrl = useCallback(
    (fileName: string) => {
      if (!data) return "";
      return `${data.pages.baseUrl}/${qualityPath}/${data.pages.hash}/${fileName}`;
    },
    [data, qualityPath]
  );

  // Preload next 4 accessible pages in background
  useEffect(() => {
    if (!data || visiblePages.length === 0) return;
    const toPreload = visiblePages.slice(currentPage + 1, currentPage + 5);
    toPreload.forEach((file) => {
      const img = new window.Image();
      img.referrerPolicy = "no-referrer";
      img.src = buildPageUrl(file);
    });
  }, [currentPage, data, visiblePages, buildPageUrl]);

  // Save reading progress to Firestore when logged in
  useEffect(() => {
    if (!user || !data?.chapterInfo?.mangaId || pageFiles.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        await saveWebReaderProgressToCloud(user.uid, user.email, {
          manga: {
            id: data.chapterInfo.mangaId!,
            title: data.chapterInfo.mangaTitle || "Obra",
            source: "mangadex",
          },
          chapter: {
            id: chapterId,
            chapterNumber: data.chapterInfo.chapterNumber,
            title: data.chapterInfo.title,
            language: data.chapterInfo.language,
            pages: pageFiles.length,
          },
          lastPageRead: currentPage,
          completed: currentPage >= pageFiles.length - 1,
        });
        setCloudSaved(true);
      } catch {
        // Silent fail
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, data, chapterId, currentPage, pageFiles.length]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const goNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, maxPageIndex));
  }, [maxPageIndex]);

  const goPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (readerMode === "webtoon") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (readerMode === "paged-rtl") {
          goPrevPage();
        } else {
          goNextPage();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (readerMode === "paged-rtl") {
          goNextPage();
        } else {
          goPrevPage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readerMode, goNextPage, goPrevPage, toggleFullscreen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--yomi-accent)] border-t-transparent" />
        <p className="text-xs font-medium text-white/65">
          Preparando páginas em alta definição...
        </p>
      </div>
    );
  }

  if (isError || !data || pageFiles.length === 0) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <h1 className="font-display text-xl font-bold text-white">
          {data && pageFiles.length === 0
            ? "Capítulo hospedado externamente ou indisponível no momento"
            : "Não foi possível carregar este capítulo"}
        </h1>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-[var(--yomi-accent)] px-5 py-2 text-xs font-semibold text-white"
          >
            Tentar Novamente
          </button>
          <Link
            href="/explorar"
            className="rounded-full border border-white/15 px-5 py-2 text-xs text-white/80"
          >
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  const PreviewGateCard = (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => e.stopPropagation()}
      className="mx-auto mt-6 w-full max-w-lg rounded-3xl border border-white/15 bg-[#0E0E14]/95 p-7 sm:p-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-5"
    >
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--yomi-accent)]/35 bg-[var(--yomi-accent)]/15 text-[var(--yomi-accent)]">
        <Lock className="h-5 w-5" />
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-2xl font-extrabold text-white">
          Prévia concluída
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Entre com sua conta gratuita para liberar todas as {pageFiles.length}{" "}
          páginas deste capítulo e sincronizar sua leitura.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-xs sm:text-sm font-semibold text-black shadow-lg transition hover:bg-white/90"
        >
          Entrar ou Criar Conta
        </button>
        <Link
          href="/download"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs sm:text-sm font-medium text-white/85 transition hover:bg-white/10"
        >
          <Download className="h-4 w-4 text-[var(--yomi-accent)]" />
          Baixar App Android
        </Link>
      </div>
    </motion.div>
  );

  const isOnPagedGate =
    readerMode !== "webtoon" && isPreviewLocked && currentPage >= visiblePages.length;

  return (
    <div className="min-h-screen bg-[#070709] text-white select-none">
      {/* Top Floating HUD */}
      {hudVisible && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0E0E14]/90 backdrop-blur-md px-4 py-3">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={
                  data.chapterInfo.mangaId
                    ? `/obra/${data.chapterInfo.mangaId}`
                    : "/explorar"
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Link>
              <div className="min-w-0">
                <div className="font-display text-xs sm:text-sm font-bold text-white truncate">
                  {data.chapterInfo.mangaTitle || "Leitor YOMI"} — Cap.{" "}
                  {data.chapterInfo.chapterNumber}
                </div>
                <div className="text-[11px] text-white/50 truncate">
                  {data.chapterInfo.scanlationGroup} · {data.chapterInfo.language}
                </div>
              </div>
            </div>

            {/* Reader Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {isPreviewLocked ? (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--yomi-accent)]/40 bg-[var(--yomi-accent)]/15 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[var(--yomi-accent)]/25"
                >
                  <Lock className="h-3 w-3 text-[var(--yomi-accent)]" />
                  <span>Prévia (3 pág.) · Entrar para ler tudo</span>
                </button>
              ) : (
                cloudSaved && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    <Check className="h-3 w-3" /> Salvo na nuvem
                  </span>
                )
              )}

              {/* Mode Switcher */}
              <div className="flex items-center rounded-full border border-white/10 bg-black/50 p-0.5 text-xs">
                {(
                  [
                    { id: "webtoon", label: "Webtoon" },
                    { id: "paged-rtl", label: "Paginado RTL" },
                    { id: "paged-ltr", label: "Paginado LTR" },
                  ] as { id: ReaderMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setReaderMode(m.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      readerMode === m.id
                        ? "bg-[var(--yomi-accent)] text-white"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Data Saver Toggle */}
              <button
                type="button"
                onClick={() => setDataSaver(!dataSaver)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  dataSaver
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                    : "border-white/10 bg-white/5 text-white/65 hover:text-white"
                }`}
                title="Alternar economia de dados"
              >
                <Zap className="h-3 w-3" />
                {dataSaver ? "Economia" : "Original HD"}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/75 hover:text-white"
                title="Tela cheia (Tecla F)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* READER CANVAS */}
      <div
        onClick={() => setHudVisible((v) => !v)}
        className="pt-16 pb-20 min-h-screen flex flex-col items-center px-3 sm:px-4"
      >
        {readerMode === "webtoon" ? (
          /* WEBTOON CONTINUOUS VERTICAL */
          <div className="mx-auto w-full max-w-[820px] flex flex-col gap-0 leading-none">
            {visiblePages.map((file, idx) => {
              const isLastPreview =
                isPreviewLocked && idx === visiblePages.length - 1;
              return (
                <div key={file} className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildPageUrl(file)}
                    alt={`Página ${idx + 1}`}
                    loading={idx < 3 ? "eager" : "lazy"}
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                      if (idx > currentPage) setCurrentPage(idx);
                    }}
                    className="block w-full h-auto m-0 p-0 select-none"
                  />
                  {isLastPreview && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070709] to-transparent"
                    />
                  )}
                </div>
              );
            })}

            {isPreviewLocked && PreviewGateCard}
          </div>
        ) : (
          /* PAGED READER WITH SMOOTH PAGE-TURN ANIMATION */
          <div className="mx-auto my-auto flex flex-col items-center justify-center w-full max-w-4xl px-2">
            <AnimatePresence mode="wait">
              {isOnPagedGate ? (
                <motion.div
                  key="preview-gate"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full"
                >
                  {PreviewGateCard}
                </motion.div>
              ) : (
                visiblePages[currentPage] && (
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: readerMode === "paged-rtl" ? -24 : 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: readerMode === "paged-rtl" ? 24 : -24 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="flex justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={buildPageUrl(visiblePages[currentPage])}
                      alt={`Página ${currentPage + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[85vh] w-auto object-contain rounded-lg"
                    />
                  </motion.div>
                )
              )}
            </AnimatePresence>

            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-6 flex items-center gap-4 rounded-full border border-white/10 bg-[#0E0E14] px-5 py-2 text-xs"
            >
              <button
                type="button"
                onClick={readerMode === "paged-rtl" ? goNextPage : goPrevPage}
                disabled={
                  readerMode === "paged-rtl"
                    ? currentPage >= maxPageIndex
                    : currentPage <= 0
                }
                className="inline-flex items-center gap-1 text-white/80 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                {readerMode === "paged-rtl" ? "Próxima (RTL)" : "Anterior"}
              </button>

              <span className="font-mono text-white/75">
                {isOnPagedGate
                  ? "Prévia concluída"
                  : `Página ${currentPage + 1} / ${visiblePages.length}${
                      isPreviewLocked ? " (Prévia)" : ""
                    }`}
              </span>

              <button
                type="button"
                onClick={readerMode === "paged-rtl" ? goPrevPage : goNextPage}
                disabled={
                  readerMode === "paged-rtl"
                    ? currentPage <= 0
                    : currentPage >= maxPageIndex
                }
                className="inline-flex items-center gap-1 text-white/80 hover:text-white disabled:opacity-30"
              >
                {readerMode === "paged-rtl" ? "Anterior (RTL)" : "Próxima"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Attribution Footer inside Reader (shown only when logged in & finished reading) */}
        {!isPreviewLocked && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-10 rounded-2xl border border-white/10 bg-[#0E0E14] p-5 text-center max-w-md mx-auto space-y-2"
          >
            <div className="text-xs font-semibold text-white">
              Fim do Capítulo {data.chapterInfo.chapterNumber}
            </div>
            <p className="text-[11px] text-white/55">
              Tradução por <strong>{data.chapterInfo.scanlationGroup}</strong> ·{" "}
              <strong>MangaDex</strong>
            </p>
            {data.chapterInfo.mangaId && (
              <Link
                href={`/obra/${data.chapterInfo.mangaId}`}
                className="mt-2 inline-block rounded-full bg-[var(--yomi-accent)] px-5 py-2 text-xs font-semibold text-white"
              >
                Voltar à Lista de Capítulos
              </Link>
            )}
          </div>
        )}

        {/* Chapter Comments */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mx-auto w-full max-w-4xl px-4 sm:px-6 mt-12 pb-6 select-text"
        >
          <CommentsSection
            targetId={chapterId}
            targetType="chapter"
            title="Comentários do Capítulo"
          />
        </div>
      </div>
    </div>
  );
}
