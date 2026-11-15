'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  FolderHeart,
  Heart,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import {
  cleanMangaDexId,
  fetchMangaChapters,
  fetchMangaDetails,
  resolveMangaEntryCoverUrl,
} from '@/lib/mangadex/api';
import type { MangaDexChapter, MangaDexWork } from '@/lib/mangadex/types';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  fetchUserCloudDoc,
  saveCloudReadingLists,
  toggleChapterReadInCloud,
  toggleCloudFavorite,
} from '@/lib/firebase/cloudSync';
import type {
  YomiChapterEntry,
  YomiMangaEntry,
  YomiReadingList,
} from '@/lib/backup/kuroCodec';
import { CommentsSection } from '@/components/comments/CommentsSection';

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

export default function ObraDetailsPage() {
  const params = useParams<{ id: string }>();
  const mangaId = decodeURIComponent(String(params?.id ?? ''));
  const cleanParamId = cleanMangaDexId(mangaId);

  const queryClient = useQueryClient();
  const { user, openAuthModal } = useYomiAuth();

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [titleParam, setTitleParam] = useState('');
  const [favBusy, setFavBusy] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionBusy, setCollectionBusy] = useState(false);
  const [chapterBusyId, setChapterBusyId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    setTitleParam(sp.get('title')?.trim() ?? '');
  }, [mangaId]);

  const { data: cloudDoc } = useQuery({
    queryKey: ['yomi-cloud-doc', user?.uid],
    queryFn: () =>
      user
        ? fetchUserCloudDoc(user.uid, user.email, user.displayName)
        : Promise.resolve(null),
    enabled: Boolean(user),
  });

  // Match stored entry from favorites, recentReads, or readingLists for offline/legacy ID resilience
  const cloudEntry = useMemo<YomiMangaEntry | undefined>(() => {
    if (!cloudDoc) return undefined;
    const matchesTarget = (entry?: YomiMangaEntry) => {
      if (!entry?.id) return false;
      return (
        entry.id === mangaId ||
        cleanMangaDexId(entry.id) === cleanParamId ||
        (titleParam &&
          entry.title?.trim().toLowerCase() === titleParam.toLowerCase())
      );
    };

    const favHit = cloudDoc.favorites.find(matchesTarget);
    if (favHit) return favHit;

    const recentHit = cloudDoc.recentReads.find((r) => matchesTarget(r.manga));
    if (recentHit) return recentHit.manga;

    for (const list of cloudDoc.readingLists) {
      const listHit = (list.mangas ?? []).find(matchesTarget);
      if (listHit) return listHit;
    }
    return undefined;
  }, [cloudDoc, mangaId, cleanParamId, titleParam]);

  const fallbackTitle = cloudEntry?.title || titleParam || undefined;

  const {
    data: fetchedWork,
    isLoading: loadingWork,
  } = useQuery({
    queryKey: ['mangadex-work', mangaId, fallbackTitle ?? ''],
    queryFn: () => fetchMangaDetails(mangaId, fallbackTitle),
    enabled: Boolean(mangaId),
    retry: 1,
  });

  const work: MangaDexWork | undefined = useMemo(() => {
    if (fetchedWork) return fetchedWork;
    if (!cloudEntry) return undefined;
    const coverUrl = resolveMangaEntryCoverUrl(cloudEntry, true);
    return {
      id: cleanMangaDexId(cloudEntry.id) || cloudEntry.id,
      title: cloudEntry.title || titleParam || 'Obra YOMI',
      description:
        cloudEntry.description ||
        'Obra sincronizada a partir da sua biblioteca na nuvem.',
      status: cloudEntry.status || 'ongoing',
      year: null,
      contentRating: 'safe',
      tags: (cloudEntry.tags ?? []).map((name, idx) => ({
        id: `${idx}-${name}`,
        name,
      })),
      author: 'Biblioteca YOMI',
      artist: 'Biblioteca YOMI',
      coverFileName: cloudEntry.coverFileName,
      coverUrl,
      coverHighResUrl: coverUrl,
      accentColor: '#FF2A55',
    };
  }, [fetchedWork, cloudEntry, titleParam]);

  const resolvedWorkId = work?.id || cleanParamId || mangaId;

  const { data: chapters = [], isLoading: loadingChapters } = useQuery({
    queryKey: ['mangadex-chapters', resolvedWorkId, sortDirection],
    queryFn: () => fetchMangaChapters(resolvedWorkId, sortDirection),
    enabled: Boolean(resolvedWorkId),
  });

  const historyMap = cloudDoc?.backup?.history ?? {};
  const firstChapter = chapters[0];

  // Find last read chapter for this work
  const lastReadChapter = useMemo(() => {
    if (!cloudDoc) return undefined;
    const recentMatch = cloudDoc.recentReads.find((r) => {
      const cId = cleanMangaDexId(r.manga?.id ?? '');
      return (
        cId === cleanParamId ||
        cId === cleanMangaDexId(resolvedWorkId) ||
        r.manga?.id === mangaId
      );
    });
    if (recentMatch?.chapter?.id) return recentMatch.chapter;

    const directLast = (historyMap[`last_${resolvedWorkId}`] ||
      historyMap[`last_${mangaId}`]) as YomiChapterEntry | undefined;
    return directLast;
  }, [cloudDoc, historyMap, mangaId, cleanParamId, resolvedWorkId]);

  const isFavorited = useMemo(() => {
    if (!cloudDoc) return false;
    return cloudDoc.favorites.some((f) => {
      const fc = cleanMangaDexId(f.id);
      return (
        f.id === mangaId ||
        fc === cleanParamId ||
        fc === cleanMangaDexId(resolvedWorkId)
      );
    });
  }, [cloudDoc, mangaId, cleanParamId, resolvedWorkId]);

  const workCollectionCount = useMemo(() => {
    if (!cloudDoc) return 0;
    const targetClean = cleanMangaDexId(resolvedWorkId);
    return cloudDoc.readingLists.filter((list) =>
      (list.mangas ?? []).some(
        (m) =>
          cleanMangaDexId(m.id) === targetClean ||
          cleanMangaDexId(m.id) === cleanParamId
      )
    ).length;
  }, [cloudDoc, resolvedWorkId, cleanParamId]);

  const notify = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  const handleToggleFavorite = async () => {
    if (!work) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    setFavBusy(true);
    try {
      const res = await toggleCloudFavorite(
        user.uid,
        user.email,
        toCloudMangaEntry(work)
      );
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      notify(
        res.isFavorite
          ? `"${work.title}" salvo nos seus favoritos.`
          : `"${work.title}" removido dos favoritos.`
      );
    } catch {
      notify('Não foi possível atualizar os favoritos.');
    } finally {
      setFavBusy(false);
    }
  };

  const handleOpenCollections = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setCollectionModalOpen(true);
  };

  const handleToggleInList = async (list: YomiReadingList) => {
    if (!user || !cloudDoc || !work) return;
    setCollectionBusy(true);
    try {
      const targetClean = cleanMangaDexId(work.id);
      const exists = (list.mangas ?? []).some(
        (m) =>
          cleanMangaDexId(m.id) === targetClean ||
          cleanMangaDexId(m.id) === cleanParamId
      );
      const nextLists = cloudDoc.readingLists.map((item) => {
        if (item.id !== list.id) return item;
        const currentMangas = item.mangas ?? [];
        return {
          ...item,
          mangas: exists
            ? currentMangas.filter(
                (m) =>
                  cleanMangaDexId(m.id) !== targetClean &&
                  cleanMangaDexId(m.id) !== cleanParamId
              )
            : [...currentMangas, toCloudMangaEntry(work)],
        };
      });
      await saveCloudReadingLists(user.uid, user.email, nextLists);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      notify(
        exists
          ? `Removido de "${list.name}".`
          : `Adicionado à coleção "${list.name}".`
      );
    } catch {
      notify('Não foi possível atualizar a coleção.');
    } finally {
      setCollectionBusy(false);
    }
  };

  const handleCreateAndAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cloudDoc || !work) return;
    const name = newCollectionName.trim();
    if (!name) return;
    setCollectionBusy(true);
    try {
      const newList: YomiReadingList = {
        id: `list-${Date.now()}`,
        name,
        description: '',
        createdAt: new Date().toISOString(),
        mangas: [toCloudMangaEntry(work)],
      };
      await saveCloudReadingLists(user.uid, user.email, [
        newList,
        ...cloudDoc.readingLists,
      ]);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      setNewCollectionName('');
      notify(`Coleção "${name}" criada com "${work.title}".`);
    } catch {
      notify('Erro ao criar coleção.');
    } finally {
      setCollectionBusy(false);
    }
  };

  const handleToggleChapterRead = async (
    e: React.MouseEvent,
    ch: MangaDexChapter,
    markRead: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !work) {
      openAuthModal('login');
      return;
    }
    setChapterBusyId(ch.id);
    try {
      await toggleChapterReadInCloud(
        user.uid,
        user.email,
        toCloudMangaEntry(work),
        {
          id: ch.id,
          source: 'mangadex',
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          language: ch.language,
          pages: ch.pages,
          scanlator: ch.scanlationGroup,
        },
        markRead
      );
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
    } catch {
      notify('Erro ao atualizar status do capítulo.');
    } finally {
      setChapterBusyId(null);
    }
  };

  if (loadingWork && !work) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 pb-20 space-y-6">
        <div className="h-80 animate-pulse rounded-3xl border border-white/10 bg-[#0E0E14]" />
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-[#0E0E14]" />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-32 pb-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">
          Obra não encontrada
        </h1>
        <p className="text-sm text-white/55">
          Não foi possível localizar os metadados desta obra na fonte externa.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/explorar"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao Catálogo
          </Link>
          <Link
            href="/biblioteca"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white"
          >
            Minha Biblioteca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/explorar"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao Catálogo
        </Link>
        {user && (
          <Link
            href="/biblioteca"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white"
          >
            Minha Biblioteca →
          </Link>
        )}
      </div>

      {actionToast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200 flex items-center justify-between">
          <span>{actionToast}</span>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-emerald-200/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Work Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-3 mx-auto md:mx-0 w-48 sm:w-56 md:w-full">
            <div className="aspect-[3/4.35] overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={work.coverHighResUrl || work.coverUrl}
                alt={`Capa de ${work.title}`}
                className="h-full w-full object-cover object-top"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/brand/icon-1024.png';
                }}
              />
            </div>
          </div>

          <div className="md:col-span-9 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[var(--yomi-accent)]/15 border border-[var(--yomi-accent)]/30 px-2.5 py-0.5 font-semibold text-[var(--yomi-accent)]">
                  {work.status === 'completed' ? 'Completo' : 'Em Lançamento'}
                </span>
                {work.year && (
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-white/70">
                    {work.year}
                  </span>
                )}
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-white/70">
                  {work.author}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
                {work.title}
              </h1>
              {work.altTitle && (
                <p className="text-xs text-white/45">{work.altTitle}</p>
              )}
            </div>

            <p className="text-xs sm:text-sm text-white/70 leading-relaxed whitespace-pre-line line-clamp-5">
              {work.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {work.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-white/75"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {/* App Parity Action Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {lastReadChapter?.id ? (
                <Link
                  href={`/ler/${lastReadChapter.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_25px_var(--yomi-accent-glow)] transition hover:brightness-110"
                >
                  <BookOpen className="h-4 w-4" />
                  Continuar Cap. {lastReadChapter.chapterNumber ?? '1'}
                </Link>
              ) : (
                firstChapter && (
                  <Link
                    href={`/ler/${firstChapter.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_25px_var(--yomi-accent-glow)] transition hover:brightness-110"
                  >
                    <BookOpen className="h-4 w-4" />
                    {!user
                      ? `Ler Prévia — Cap. ${firstChapter.chapterNumber}`
                      : `Ler Cap. ${firstChapter.chapterNumber} (${firstChapter.language})`}
                  </Link>
                )
              )}

              <button
                type="button"
                disabled={favBusy}
                onClick={handleToggleFavorite}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-xs sm:text-sm font-semibold transition ${
                  isFavorited
                    ? 'border-[var(--yomi-accent)]/50 bg-[var(--yomi-accent)]/15 text-white hover:bg-[var(--yomi-accent)]/25'
                    : 'border-white/20 bg-white/[0.05] text-white hover:bg-white/12'
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isFavorited
                      ? 'fill-[var(--yomi-accent)] text-[var(--yomi-accent)]'
                      : 'text-white/80'
                  }`}
                />
                {isFavorited ? 'Favoritado' : 'Favoritar'}
              </button>

              <button
                type="button"
                onClick={handleOpenCollections}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-5 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/12"
              >
                <FolderHeart className="h-4 w-4 text-[var(--yomi-accent)]" />
                {workCollectionCount > 0
                  ? `Coleções (${workCollectionCount})`
                  : 'Adicionar à Coleção'}
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <Lock className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                  Entrar para ler completo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <section className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <h2 className="font-display text-xl font-bold text-white">
            Capítulos ({chapters.length})
          </h2>

          <button
            type="button"
            onClick={() =>
              setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.08]"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
            Ordem: {sortDirection === 'asc' ? 'Cap. 1 → Atual' : 'Mais Recentes'}
          </button>
        </div>

        {!user && chapters.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs">
            <div className="flex items-center gap-2.5 text-white/75">
              <Lock className="h-4 w-4 shrink-0 text-[var(--yomi-accent)]" />
              <span>
                Visitantes têm acesso a uma prévia de 3 páginas por capítulo.
                Crie ou conecte sua conta para liberar a leitura completa.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
            >
              Entrar / Criar Conta
            </button>
          </div>
        )}

        {loadingChapters ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl bg-white/[0.03]"
              />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-4">
            <p className="text-sm font-medium text-white/80">
              Esta obra possui capítulos licenciados exclusivamente em
              plataformas externas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <a
                href={`https://mangadex.org/title/${cleanMangaDexId(work.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Abrir fonte original
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link
                href="/explorar"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-medium text-white/85 hover:bg-white/10"
              >
                Explorar outras obras
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {chapters.map((ch) => {
              const isRead = historyMap[`read_${ch.id}`] === true;
              return (
                <Link
                  key={ch.id}
                  href={`/ler/${ch.id}`}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                    isRead
                      ? 'border-emerald-500/25 bg-emerald-500/[0.04] text-white/65'
                      : 'border-white/[0.07] bg-black/30 hover:border-[var(--yomi-accent)]/50 hover:bg-white/[0.04] text-white'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold">
                        Cap. {ch.chapterNumber}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          ch.language === 'PT-BR'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {ch.language}
                      </span>
                      {isRead && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Lido
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 truncate">
                      {ch.title || `Scan: ${ch.scanlationGroup}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {user && (
                      <button
                        type="button"
                        disabled={chapterBusyId === ch.id}
                        onClick={(e) => handleToggleChapterRead(e, ch, !isRead)}
                        title={
                          isRead ? 'Desmarcar como lido' : 'Marcar como lido'
                        }
                        aria-label={
                          isRead ? 'Desmarcar como lido' : 'Marcar como lido'
                        }
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                          isRead
                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
                      {!user ? 'Prévia →' : 'Ler →'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <CommentsSection
        targetId={work.id}
        targetType="manga"
        title="Comentários da Obra"
      />

      {/* Modal: Add / Remove Work in Reading Collections */}
      {collectionModalOpen && cloudDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setCollectionModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/12 bg-[#0E0E14] p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Salvar em Coleções
                </h2>
                <p className="text-xs text-white/55 truncate max-w-[280px]">
                  {work.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCollectionModalOpen(false)}
                className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {cloudDoc.readingLists.length === 0 ? (
                <p className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-center text-xs text-white/55">
                  Você ainda não tem coleções. Crie uma logo abaixo.
                </p>
              ) : (
                cloudDoc.readingLists.map((list) => {
                  const targetClean = cleanMangaDexId(work.id);
                  const included = (list.mangas ?? []).some(
                    (m) =>
                      cleanMangaDexId(m.id) === targetClean ||
                      cleanMangaDexId(m.id) === cleanParamId
                  );
                  return (
                    <button
                      key={list.id}
                      type="button"
                      disabled={collectionBusy}
                      onClick={() => handleToggleInList(list)}
                      className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        included
                          ? 'border-[var(--yomi-accent)]/50 bg-[var(--yomi-accent)]/15 text-white'
                          : 'border-white/10 bg-black/30 text-white/80 hover:border-white/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {list.name}
                        </div>
                        <div className="text-[11px] text-white/50">
                          {list.mangas?.length ?? 0} obras
                        </div>
                      </div>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                          included
                            ? 'border-[var(--yomi-accent)] bg-[var(--yomi-accent)] text-white'
                            : 'border-white/20 text-transparent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleCreateAndAddCollection}
              className="flex items-center gap-2 pt-2 border-t border-white/[0.08]"
            >
              <input
                type="text"
                maxLength={60}
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Nova coleção..."
                className="flex-1 rounded-full border border-white/12 bg-black/40 px-4 py-2 text-xs text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={collectionBusy || !newCollectionName.trim()}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--yomi-accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
