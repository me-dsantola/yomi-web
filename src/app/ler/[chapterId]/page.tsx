"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  MessageSquare,
  X,
  BookOpen,
} from "lucide-react";
import {
  cleanMangaDexId,
  fetchChapterMetaAndPages,
  fetchMangaChapters,
} from "@/lib/mangadex/api";
import { useReaderStore, type ReaderMode } from "@/lib/store/readerStore";
import { useYomiAuth } from "@/components/providers/AppProviders";
import {
  fetchUserCloudDoc,
  saveWebReaderProgressToCloud,
} from "@/lib/firebase/cloudSync";
import { CommentsSection } from "@/components/comments/CommentsSection";
import {
  calculateScrollActivePage,
  clampReaderPageIndex,
  resolvePagedSwipeAction,
  resolvePagedTapAction,
} from "@/lib/mobile/readerTouchAndNav";

const PREVIEW_PAGE_LIMIT = 3;

export default function QuickReaderPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = String(params?.chapterId ?? "");
  const prefersReducedMotion = useReducedMotion();

  const { readerMode, setReaderMode, dataSaver, setDataSaver } =
    useReaderStore();
  const { user, openAuthModal } = useYomiAuth();

  const [currentPage, setCurrentPage] = useState(0);
  const [hudVisible, setHudVisible] = useState(true);
  const [cloudSaved, setCloudSaved] = useState(false);
  const [commentsSheetOpen, setCommentsSheetOpen] = useState(false);

  const initialPageRestoredRef = useRef<string | null>(null);
  const prevReaderModeRef = useRef<ReaderMode>(readerMode);
  const webtoonContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeAtRef = useRef(0);

  // Reset per-chapter transient state when navigating between chapters
  useEffect(() => {
    initialPageRestoredRef.current = null;
    setCurrentPage(0);
    setCloudSaved(false);
    setCommentsSheetOpen(false);
  }, [chapterId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mangadex-chapter-pages", chapterId],
    queryFn: () => fetchChapterMetaAndPages(chapterId),
    enabled: Boolean(chapterId),
  });

  const { data: cloudState } = useQuery({
    queryKey: ["yomi-cloud-doc", user?.uid],
    queryFn: () =>
      fetchUserCloudDoc(user!.uid, user!.email, user!.displayName),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const { data: mangaChapters } = useQuery({
    queryKey: ["mangadex-reader-chapters", data?.chapterInfo?.mangaId],
    queryFn: () => fetchMangaChapters(data!.chapterInfo.mangaId!, "asc"),
    enabled: Boolean(data?.chapterInfo?.mangaId),
    staleTime: 5 * 60_000,
  });

  const { prevChapter, nextChapter } = useMemo(() => {
    if (!mangaChapters || mangaChapters.length === 0) {
      return { prevChapter: null, nextChapter: null };
    }
    const cleanId = cleanMangaDexId(chapterId);
    const idx = mangaChapters.findIndex(
      (ch) => ch.id === chapterId || cleanMangaDexId(ch.id) === cleanId
    );
    if (idx === -1) {
      return { prevChapter: null, nextChapter: null };
    }
    return {
      prevChapter: idx > 0 ? mangaChapters[idx - 1] : null,
      nextChapter:
        idx < mangaChapters.length - 1 ? mangaChapters[idx + 1] : null,
    };
  }, [mangaChapters, chapterId]);

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

  const safeCurrentPage = clampReaderPageIndex(
    currentPage,
    Math.max(1, visiblePages.length)
  );

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

  const scrollToWebtoonPage = useCallback(
    (pageIdx: number, behavior: ScrollBehavior = "auto") => {
      if (typeof document === "undefined") return;
      const target = document.querySelector<HTMLElement>(
        `[data-page-index="${pageIdx}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior, block: "start" });
      }
    },
    []
  );

  // Restore saved reading progress once per chapter
  useEffect(() => {
    if (!data || pageFiles.length === 0) return;
    if (initialPageRestoredRef.current === chapterId) return;

    if (!user) {
      initialPageRestoredRef.current = chapterId;
      return;
    }

    if (!cloudState) return;
    initialPageRestoredRef.current = chapterId;

    const cleanId = cleanMangaDexId(chapterId);
    const historyMap = cloudState.backup?.history ?? {};
    const rawHistoryPage =
      historyMap[`page_${chapterId}`] ?? historyMap[`page_${cleanId}`];

    const recentMatch = cloudState.recentReads.find(
      (item) =>
        item.chapter?.id === chapterId ||
        cleanMangaDexId(item.chapter?.id ?? "") === cleanId
    );

    const savedPage =
      typeof rawHistoryPage === "number" && Number.isFinite(rawHistoryPage)
        ? rawHistoryPage
        : recentMatch?.lastPageRead ?? 0;

    const restored = clampReaderPageIndex(savedPage, visiblePages.length);
    if (restored > 0) {
      setCurrentPage((prev) => (prev > 0 ? prev : restored));
      if (readerMode === "webtoon" && window.scrollY < 40) {
        window.requestAnimationFrame(() =>
          scrollToWebtoonPage(restored, "auto")
        );
      }
    }
  }, [
    data,
    pageFiles.length,
    chapterId,
    user,
    cloudState,
    visiblePages.length,
    readerMode,
    scrollToWebtoonPage,
  ]);

  // Preserve reading position when switching between webtoon and paged modes
  useEffect(() => {
    const prevMode = prevReaderModeRef.current;
    if (prevMode !== readerMode) {
      prevReaderModeRef.current = readerMode;
      if (readerMode === "webtoon") {
        const targetPage = clampReaderPageIndex(
          currentPage,
          visiblePages.length
        );
        window.requestAnimationFrame(() =>
          scrollToWebtoonPage(targetPage, "auto")
        );
      } else {
        setCurrentPage((prev) =>
          Math.min(Math.max(0, prev), maxPageIndex)
        );
      }
    }
  }, [
    readerMode,
    currentPage,
    visiblePages.length,
    maxPageIndex,
    scrollToWebtoonPage,
  ]);

  // Scroll-based active page tracking for Webtoon mode (never driven by image onLoad)
  useEffect(() => {
    if (readerMode !== "webtoon" || visiblePages.length === 0) return;

    let rafId = 0;
    let adjustingLayout = false;
    let resizeTimer: number | undefined;

    const syncPageFromScroll = () => {
      rafId = 0;
      if (adjustingLayout) return;
      const container = webtoonContainerRef.current;
      if (!container) return;

      const nodes = container.querySelectorAll<HTMLElement>("[data-page-index]");
      if (nodes.length === 0) return;

      const rects: Array<{ index: number; top: number; bottom: number }> = [];
      nodes.forEach((node) => {
        const idx = Number(node.dataset.pageIndex);
        if (!Number.isFinite(idx)) return;
        const rect = node.getBoundingClientRect();
        if (rect.height <= 2) return;
        rects.push({ index: idx, top: rect.top, bottom: rect.bottom });
      });

      if (rects.length > 0) {
        const activeIdx = calculateScrollActivePage(
          window.innerHeight * 0.45,
          rects
        );
        setCurrentPage((prev) => (prev === activeIdx ? prev : activeIdx));
      }
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(syncPageFromScroll);
      }
    };

    const onResize = () => {
      adjustingLayout = true;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        adjustingLayout = false;
      }, 300);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [readerMode, visiblePages.length]);

  // Preload next 4 accessible pages in background
  useEffect(() => {
    if (!data || visiblePages.length === 0) return;
    const toPreload = visiblePages.slice(
      safeCurrentPage + 1,
      safeCurrentPage + 5
    );
    toPreload.forEach((file) => {
      const img = new window.Image();
      img.referrerPolicy = "no-referrer";
      img.src = buildPageUrl(file);
    });
  }, [safeCurrentPage, data, visiblePages, buildPageUrl]);

  // Lock background scroll while comments sheet is open
  useEffect(() => {
    if (!commentsSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [commentsSheetOpen]);

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
          lastPageRead: safeCurrentPage,
          completed: safeCurrentPage >= pageFiles.length - 1,
        });
        setCloudSaved(true);
      } catch {
        // Silent fail
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, data, chapterId, safeCurrentPage, pageFiles.length]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
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
      if (commentsSheetOpen) {
        if (e.key === "Escape") {
          setCommentsSheetOpen(false);
        }
        return;
      }

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
  }, [
    commentsSheetOpen,
    readerMode,
    goNextPage,
    goPrevPage,
    toggleFullscreen,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#070709] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--yomi-accent)] border-t-transparent" />
        <p className="text-xs font-medium text-white/65">
          Preparando páginas em alta definição...
        </p>
      </div>
    );
  }

  if (isError || !data || pageFiles.length === 0) {
    return (
      <div className="min-h-dvh bg-[#070709] flex flex-col items-center justify-center p-4 text-center space-y-4">
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
            className="rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white"
          >
            Tentar Novamente
          </button>
          <Link
            href="/explorar"
            className="rounded-full border border-white/15 px-5 py-2.5 text-xs text-white/80"
          >
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  const PreviewGateCard = (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={(e) => e.stopPropagation()}
      className="mx-auto my-6 w-full max-w-lg rounded-3xl border border-white/15 bg-[#0E0E14]/95 p-6 sm:p-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-xl space-y-5"
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
    readerMode !== "webtoon" &&
    isPreviewLocked &&
    currentPage >= visiblePages.length;

  const showEndOfChapterFooter =
    !isPreviewLocked &&
    (readerMode === "webtoon" || safeCurrentPage >= visiblePages.length - 1);

  return (
    <div className="min-h-dvh bg-[#070709] text-white select-none">
      {/* Top Floating HUD (Fixed overlay: zero layout shift on toggle) */}
      <header
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-[#0E0E14]/92 backdrop-blur-md px-3 sm:px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] transition-transform duration-200 ${
          hudVisible && !commentsSheetOpen
            ? "translate-y-0"
            : "-translate-y-full pointer-events-none"
        }`}
      >
        <div className="mx-auto max-w-6xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link
                href={
                  data.chapterInfo.mangaId
                    ? `/obra/${data.chapterInfo.mangaId}`
                    : "/explorar"
                }
                aria-label="Voltar para os detalhes da obra"
                className="inline-flex items-center justify-center sm:gap-1.5 rounded-full border border-white/12 bg-white/5 min-h-[40px] min-w-[40px] sm:px-3 text-xs font-medium text-white hover:bg-white/10 shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xs sm:text-sm font-bold text-white truncate">
                  {data.chapterInfo.mangaTitle || "Leitor YOMI"} — Cap.{" "}
                  {data.chapterInfo.chapterNumber}
                </div>
                <div className="text-[11px] text-white/50 truncate">
                  {data.chapterInfo.scanlationGroup} ·{" "}
                  {data.chapterInfo.language}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isPreviewLocked ? (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--yomi-accent)]/40 bg-[var(--yomi-accent)]/15 px-2.5 sm:px-3 min-h-[40px] text-[11px] font-semibold text-white transition hover:bg-[var(--yomi-accent)]/25"
                >
                  <Lock className="h-3 w-3 text-[var(--yomi-accent)] shrink-0" />
                  <span className="hidden sm:inline">
                    Prévia (3 pág.) · Entrar para ler tudo
                  </span>
                  <span className="sm:hidden">Prévia</span>
                </button>
              ) : (
                cloudSaved && (
                  <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    <Check className="h-3 w-3" /> Salvo na nuvem
                  </span>
                )
              )}

              <button
                type="button"
                onClick={() => setCommentsSheetOpen(true)}
                aria-label="Abrir comentários do capítulo"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/5 min-h-[40px] min-w-[40px] px-2.5 sm:px-3 text-[11px] font-medium text-white/85 hover:bg-white/10 hover:text-white"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                <span className="hidden sm:inline">Comentários</span>
              </button>

              <button
                type="button"
                onClick={() => setDataSaver(!dataSaver)}
                className={`inline-flex items-center justify-center gap-1 rounded-full border min-h-[40px] min-w-[40px] px-2.5 sm:px-3 text-[11px] font-medium transition ${
                  dataSaver
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                    : "border-white/10 bg-white/5 text-white/65 hover:text-white"
                }`}
                title="Alternar economia de dados"
                aria-label={
                  dataSaver
                    ? "Economia de dados ativada"
                    : "Qualidade original HD ativada"
                }
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {dataSaver ? "Economia" : "Original HD"}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden sm:inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 min-h-[40px] min-w-[40px] text-white/75 hover:text-white"
                title="Tela cheia (Tecla F)"
                aria-label="Alternar tela cheia"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <div className="grid w-full lg:w-auto grid-cols-3 items-center rounded-full border border-white/10 bg-black/50 p-0.5 text-xs">
              {(
                [
                  { id: "webtoon", label: "Webtoon" },
                  { id: "paged-rtl", label: "Pag. RTL" },
                  { id: "paged-ltr", label: "Pag. LTR" },
                ] as { id: ReaderMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setReaderMode(m.id)}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition text-center ${
                    readerMode === m.id
                      ? "bg-[var(--yomi-accent)] text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* READER CANVAS */}
      <div
        className={`min-h-dvh flex flex-col items-center ${
          readerMode === "webtoon" ? "px-0 sm:px-4" : "px-1 sm:px-4"
        }`}
      >
        {readerMode === "webtoon" ? (
          /* WEBTOON CONTINUOUS VERTICAL */
          <div
            ref={webtoonContainerRef}
            onClick={() => setHudVisible((v) => !v)}
            className="mx-auto w-full max-w-[820px] flex flex-col gap-0 leading-none pt-[env(safe-area-inset-top,0px)] pb-10"
          >
            {visiblePages.map((file, idx) => {
              const isLastPreview =
                isPreviewLocked && idx === visiblePages.length - 1;
              return (
                <div
                  key={file}
                  data-page-index={idx}
                  className="relative w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildPageUrl(file)}
                    alt={`Página ${idx + 1}`}
                    loading={idx < 3 ? "eager" : "lazy"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="block w-full h-auto m-0 p-0 select-none bg-[#09090d]"
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

            {isPreviewLocked && (
              <div className="px-3 sm:px-0">{PreviewGateCard}</div>
            )}
          </div>
        ) : (
          /* PAGED READER WITH TAP ZONES + HORIZONTAL SWIPE */
          <div
            className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center justify-center py-3 touch-pan-y"
            onTouchStart={(e) => {
              if (e.touches.length !== 1) {
                touchStartRef.current = null;
                return;
              }
              touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              if (!touchStartRef.current || e.changedTouches.length === 0) {
                return;
              }
              const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
              const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
              touchStartRef.current = null;
              const swipe = resolvePagedSwipeAction(dx, dy, readerMode);
              if (swipe === "next") {
                lastSwipeAtRef.current = Date.now();
                goNextPage();
              } else if (swipe === "prev") {
                lastSwipeAtRef.current = Date.now();
                goPrevPage();
              }
            }}
            onClick={(e) => {
              if (Date.now() - lastSwipeAtRef.current < 350) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const action = resolvePagedTapAction(
                e.clientX,
                rect.left,
                rect.width,
                readerMode
              );
              if (action === "toggle-hud") {
                setHudVisible((v) => !v);
              } else if (action === "next") {
                goNextPage();
              } else {
                goPrevPage();
              }
            }}
          >
            <AnimatePresence mode="wait">
              {isOnPagedGate ? (
                <motion.div
                  key="preview-gate"
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.24,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full px-3 sm:px-0"
                >
                  {PreviewGateCard}
                </motion.div>
              ) : (
                visiblePages[safeCurrentPage] && (
                  <motion.div
                    key={safeCurrentPage}
                    initial={
                      prefersReducedMotion
                        ? false
                        : {
                            opacity: 0,
                            x: readerMode === "paged-rtl" ? -20 : 20,
                          }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      prefersReducedMotion
                        ? undefined
                        : {
                            opacity: 0,
                            x: readerMode === "paged-rtl" ? 20 : -20,
                          }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex w-full items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={buildPageUrl(visiblePages[safeCurrentPage])}
                      alt={`Página ${safeCurrentPage + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[calc(100dvh-2rem)] w-auto max-w-full object-contain rounded-lg select-none"
                    />
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Attribution & Chapter Navigation Footer Card */}
        {showEndOfChapterFooter && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-3 sm:mx-auto my-6 mb-24 w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-white/10 bg-[#0E0E14] p-5 text-center space-y-3 select-text"
          >
            <div className="text-sm font-semibold text-white">
              Fim do Capítulo {data.chapterInfo.chapterNumber}
            </div>
            <p className="text-xs text-white/55">
              Tradução por <strong>{data.chapterInfo.scanlationGroup}</strong> ·{" "}
              <strong>MangaDex</strong>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {prevChapter && (
                <Link
                  href={`/ler/${prevChapter.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/85 hover:bg-white/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Cap. {prevChapter.chapterNumber}
                </Link>
              )}
              {nextChapter && (
                <Link
                  href={`/ler/${nextChapter.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--yomi-accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                >
                  Próx.: Cap. {nextChapter.chapterNumber}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCommentsSheetOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                Ver / Comentar neste Capítulo
              </button>
              {data.chapterInfo.mangaId && (
                <Link
                  href={`/obra/${data.chapterInfo.mangaId}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/80 hover:text-white"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Capítulos
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating HUD (Scrubber + Page/Chapter Controls + Comments Trigger) */}
      <div
        role="region"
        aria-label="Controles inferiores do leitor"
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0E0E14]/92 backdrop-blur-md px-3 sm:px-5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 ${
          hudVisible && !commentsSheetOpen
            ? "translate-y-0"
            : "translate-y-full pointer-events-none"
        }`}
      >
        <div className="mx-auto max-w-4xl space-y-2">
          {/* Scrubber Slider Row */}
          {visiblePages.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-white/70 shrink-0 min-w-[68px]">
                {isOnPagedGate
                  ? "Prévia"
                  : `Pág. ${safeCurrentPage + 1} / ${visiblePages.length}${
                      isPreviewLocked ? "*" : ""
                    }`}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, visiblePages.length - 1)}
                value={safeCurrentPage}
                aria-label="Progresso de leitura do capítulo"
                onChange={(e) => {
                  const targetIdx = clampReaderPageIndex(
                    Number(e.target.value),
                    visiblePages.length
                  );
                  setCurrentPage(targetIdx);
                  if (readerMode === "webtoon") {
                    scrollToWebtoonPage(targetIdx, "auto");
                  }
                }}
                className="flex-1 h-2 cursor-pointer rounded-full bg-white/15 accent-[var(--yomi-accent)]"
              />
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              {readerMode !== "webtoon" ? (
                <>
                  <button
                    type="button"
                    onClick={
                      readerMode === "paged-rtl" ? goNextPage : goPrevPage
                    }
                    disabled={
                      readerMode === "paged-rtl"
                        ? currentPage >= maxPageIndex
                        : currentPage <= 0
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 min-h-[38px] text-white/85 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {readerMode === "paged-rtl" ? "Próxima" : "Anterior"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={
                      readerMode === "paged-rtl" ? goPrevPage : goNextPage
                    }
                    disabled={
                      readerMode === "paged-rtl"
                        ? currentPage <= 0
                        : currentPage >= maxPageIndex
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 min-h-[38px] text-white/85 hover:bg-white/10 disabled:opacity-30"
                  >
                    <span className="hidden sm:inline">
                      {readerMode === "paged-rtl" ? "Anterior" : "Próxima"}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-white/60 font-medium truncate">
                  {visiblePages.length === 1
                    ? "Página 1 / 1"
                    : `Lendo página ${safeCurrentPage + 1} de ${visiblePages.length}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {prevChapter && (
                <Link
                  href={`/ler/${prevChapter.id}`}
                  title={`Capítulo anterior (${prevChapter.chapterNumber})`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 min-h-[38px] text-[11px] font-medium text-white/80 hover:bg-white/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Cap. {prevChapter.chapterNumber}</span>
                </Link>
              )}
              {nextChapter && (
                <Link
                  href={`/ler/${nextChapter.id}`}
                  title={`Próximo capítulo (${nextChapter.chapterNumber})`}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--yomi-accent)] px-2.5 sm:px-3 min-h-[38px] text-[11px] font-semibold text-white hover:brightness-110"
                >
                  <span>Cap. {nextChapter.chapterNumber}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setCommentsSheetOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 sm:px-3 min-h-[38px] text-[11px] font-medium text-white/85 hover:bg-white/10"
                aria-label="Comentários do capítulo"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                <span className="hidden sm:inline">Comentários</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Comments Slide-Up Bottom Sheet / Drawer */}
      {commentsSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Comentários do capítulo"
          onClick={() => setCommentsSheetOpen(false)}
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl border border-white/12 bg-[#0B0B10] shadow-2xl max-h-[86dvh] pb-[env(safe-area-inset-bottom,0px)] overflow-hidden select-text"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--yomi-accent)]/15 text-[var(--yomi-accent)] shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-white truncate">
                    Comentários — Cap. {data.chapterInfo.chapterNumber}
                  </h2>
                  <p className="text-[11px] text-white/50 truncate">
                    {data.chapterInfo.mangaTitle || "Discussão do capítulo"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommentsSheetOpen(false)}
                aria-label="Fechar comentários"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4">
              <CommentsSection
                targetId={chapterId}
                targetType="chapter"
                title="Discussão do Capítulo"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
