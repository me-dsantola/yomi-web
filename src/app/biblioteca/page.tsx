'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  Eye,
  FolderHeart,
  Heart,
  Library,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  fetchUserCloudDoc,
  parseRawCloudDocData,
  saveCloudReadingLists,
  toggleCloudFavorite,
  type ParsedYomiCloudState,
} from '@/lib/firebase/cloudSync';
import { getDemoCloudDocument } from '@/lib/firebase/demoFixture';
import {
  argbIntToHex,
  type YomiMangaEntry,
  type YomiReadingList,
} from '@/lib/backup/kuroCodec';
import {
  buildWorkHref,
  cleanMangaDexId,
} from '@/lib/mangadex/api';
import { useResolvedCovers } from '@/lib/mangadex/useResolvedCovers';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';

type LibraryFilter = 'all' | 'favorites' | 'reading' | 'completed';

export default function BibliotecaPage() {
  const { user, loadingAuth, openAuthModal } = useYomiAuth();
  const queryClient = useQueryClient();

  const [demoMode, setDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Modal state for creating / renaming a reading list
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listNameInput, setListNameInput] = useState('');
  const [listDescInput, setListDescInput] = useState('');
  const [savingList, setSavingList] = useState(false);

  const { data: cloudState, isLoading: loadingCloud } =
    useQuery<ParsedYomiCloudState | null>({
      queryKey: ['yomi-cloud-doc', user?.uid, demoMode],
      queryFn: async () => {
        if (demoMode && !user) {
          return parseRawCloudDocData(
            getDemoCloudDocument(),
            'leitor@yomi.app'
          );
        }
        if (!user) return null;
        return fetchUserCloudDoc(user.uid, user.email, user.displayName);
      },
      enabled: Boolean(user) || demoMode,
    });

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesSearch = (manga: Pick<YomiMangaEntry, 'title'>) =>
    !normalizedQuery ||
    String(manga.title ?? '')
      .toLowerCase()
      .includes(normalizedQuery);

  const favoriteIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of cloudState?.favorites ?? []) {
      set.add(cleanMangaDexId(f.id));
    }
    return set;
  }, [cloudState?.favorites]);

  const combinedLibrary = useMemo(() => {
    const map = new Map<string, YomiMangaEntry>();
    for (const m of cloudState?.favorites ?? []) {
      map.set(cleanMangaDexId(m.id), m);
    }
    for (const r of cloudState?.recentReads ?? []) {
      const k = cleanMangaDexId(r.manga.id);
      if (!map.has(k)) {
        map.set(k, r.manga);
      }
    }
    for (const list of cloudState?.readingLists ?? []) {
      for (const m of list.mangas ?? []) {
        const k = cleanMangaDexId(m.id);
        if (!map.has(k)) {
          map.set(k, m);
        }
      }
    }
    return Array.from(map.values());
  }, [cloudState]);

  const { getCoverUrl } = useResolvedCovers(combinedLibrary);

  const filteredFavorites = useMemo(
    () => (cloudState?.favorites ?? []).filter(matchesSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudState?.favorites, normalizedQuery]
  );

  const filteredRecent = useMemo(
    () =>
      (cloudState?.recentReads ?? []).filter((r) => matchesSearch(r.manga)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudState?.recentReads, normalizedQuery]
  );

  const filteredReading = useMemo(
    () =>
      filteredRecent.filter(
        (r) => String(r.manga?.status ?? '').toLowerCase() !== 'completed'
      ),
    [filteredRecent]
  );

  const filteredCompleted = useMemo(
    () =>
      combinedLibrary.filter(
        (m) =>
          matchesSearch(m) &&
          String(m.status ?? '').toLowerCase() === 'completed'
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combinedLibrary, normalizedQuery]
  );

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    manga: YomiMangaEntry
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal('login');
      return;
    }
    setBusyId(manga.id);
    try {
      const res = await toggleCloudFavorite(user.uid, user.email, manga);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      showFeedback(
        res.isFavorite
          ? `"${manga.title}" adicionado aos favoritos.`
          : `"${manga.title}" removido dos favoritos.`
      );
    } catch {
      showFeedback('Não foi possível atualizar os favoritos.');
    } finally {
      setBusyId(null);
    }
  };

  const openCreateListModal = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setEditingListId(null);
    setListNameInput('');
    setListDescInput('');
    setListModalOpen(true);
  };

  const openRenameListModal = (list: YomiReadingList) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setEditingListId(list.id);
    setListNameInput(list.name);
    setListDescInput(list.description ?? '');
    setListModalOpen(true);
  };

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cloudState) {
      openAuthModal('login');
      return;
    }
    const trimmedName = listNameInput.trim();
    if (!trimmedName) return;

    setSavingList(true);
    try {
      const current = [...(cloudState.readingLists ?? [])];
      let next: YomiReadingList[];
      if (editingListId) {
        next = current.map((l) =>
          l.id === editingListId
            ? {
                ...l,
                name: trimmedName,
                description: listDescInput.trim(),
              }
            : l
        );
      } else {
        const newList: YomiReadingList = {
          id: `list-${Date.now()}`,
          name: trimmedName,
          description: listDescInput.trim(),
          createdAt: new Date().toISOString(),
          mangas: [],
        };
        next = [newList, ...current];
      }
      await saveCloudReadingLists(user.uid, user.email, next);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      setListModalOpen(false);
      showFeedback(
        editingListId
          ? `Coleção "${trimmedName}" atualizada.`
          : `Coleção "${trimmedName}" criada.`
      );
    } catch {
      showFeedback('Erro ao salvar a coleção na nuvem.');
    } finally {
      setSavingList(false);
    }
  };

  const handleDeleteList = async (list: YomiReadingList) => {
    if (!user || !cloudState) {
      openAuthModal('login');
      return;
    }
    setBusyId(list.id);
    try {
      const next = cloudState.readingLists.filter((l) => l.id !== list.id);
      await saveCloudReadingLists(user.uid, user.email, next);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      showFeedback(`Coleção "${list.name}" removida.`);
    } catch {
      showFeedback('Erro ao remover coleção.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFromList = async (
    e: React.MouseEvent,
    list: YomiReadingList,
    mangaId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !cloudState) {
      openAuthModal('login');
      return;
    }
    const targetClean = cleanMangaDexId(mangaId);
    const next = cloudState.readingLists.map((l) =>
      l.id === list.id
        ? {
            ...l,
            mangas: (l.mangas ?? []).filter(
              (m) => cleanMangaDexId(m.id) !== targetClean
            ),
          }
        : l
    );
    try {
      await saveCloudReadingLists(user.uid, user.email, next);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      showFeedback('Obra removida da coleção.');
    } catch {
      showFeedback('Erro ao atualizar coleção.');
    }
  };

  if (loadingAuth) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 pb-20">
        <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-[#0E0E14]" />
      </div>
    );
  }

  if (!user && !demoMode) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
        <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--yomi-accent)]/30 bg-[var(--yomi-accent)]/10 text-[var(--yomi-accent)]">
            <Library className="h-7 w-7" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Minha Biblioteca
            </h1>
            <p className="text-sm sm:text-base text-white/60 leading-relaxed">
              Entre com sua conta para acessar seus favoritos, coleções e
              histórico sincronizados com o app YOMI.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90"
            >
              Entrar ou Criar Conta
            </button>
            <button
              type="button"
              onClick={() => setDemoMode(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              <Eye className="h-4 w-4 text-[var(--yomi-accent)]" />
              Ver Demonstração Interativa
            </button>
          </div>
        </div>
      </div>
    );
  }

  const profileAccent = cloudState?.profile?.customAccentColor
    ? argbIntToHex(cloudState.profile.customAccentColor)
    : 'var(--yomi-accent)';

  const visibleContinueList =
    filter === 'reading' ? filteredReading : filteredRecent;
  const leadContinue = visibleContinueList[0];
  const otherRecent = visibleContinueList.slice(1);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-8">
      {/* Demo Mode Banner */}
      {demoMode && !user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <span>
              <strong>Modo Demonstração:</strong> Biblioteca de exemplo. Entre na sua conta para salvar alterações.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-black"
            >
              Conectar Conta Real
            </button>
            <button
              type="button"
              onClick={() => setDemoMode(false)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:text-white"
            >
              Sair da Demo
            </button>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {actionFeedback && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200 flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-emerald-200/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--yomi-accent)] uppercase tracking-wider">
            <Library className="h-4 w-4" />
            <span>Sincronizado na Nuvem</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            Minha Biblioteca
          </h1>
          <p className="text-sm text-white/60">
            Suas leituras, favoritos e coleções sincronizados na nuvem.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openCreateListModal}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_0_24px_var(--yomi-accent-glow)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Nova Coleção
          </button>

          {cloudState && (
            <Link
              href="/conta"
              title="Ver Meu Perfil"
              className="hidden sm:block rounded-2xl border border-white/10 bg-black/40 p-1.5 hover:border-white/25 transition"
            >
              <BlobatarCompanion
                mascotName={cloudState.mascotName}
                expression={cloudState.profile.blobatarExpression}
                shape={cloudState.profile.blobatarShape}
                accentColor={
                  typeof profileAccent === 'string' &&
                  profileAccent.startsWith('#')
                    ? profileAccent
                    : undefined
                }
                size={52}
                interactiveCycle={false}
              />
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filter Chips */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar na sua biblioteca..."
            className="w-full rounded-2xl border border-white/10 bg-[#0E0E14] py-3.5 pl-11 pr-10 text-base sm:text-sm text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {
                id: 'all',
                label: `Todas (${combinedLibrary.length})`,
                icon: Library,
              },
              {
                id: 'favorites',
                label: `Favoritos (${cloudState?.favorites.length ?? 0})`,
                icon: Heart,
              },
              {
                id: 'reading',
                label: `Lendo (${filteredReading.length})`,
                icon: Clock,
              },
              {
                id: 'completed',
                label: `Concluídas (${filteredCompleted.length})`,
                icon: CheckCircle2,
              },
            ] as const
          ).map((chip) => {
            const Icon = chip.icon;
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? 'bg-[var(--yomi-accent)] text-white shadow-[0_0_20px_var(--yomi-accent-glow)]'
                    : 'border border-white/10 bg-[#0E0E14] text-white/65 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {loadingCloud ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Continue Reading Spotlight */}
          {(filter === 'all' || filter === 'reading') && leadContinue && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--yomi-accent)]" />
                <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                  Continuar Lendo
                </h2>
              </div>

              <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-[#12121B] to-[#0E0E14] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <Link
                    href={buildWorkHref(
                      leadContinue.manga.id,
                      leadContinue.manga.title
                    )}
                    className="shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCoverUrl(leadContinue.manga, true)}
                      alt={leadContinue.manga.title}
                      className="h-28 w-20 object-cover object-top"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/brand/icon-1024.png';
                      }}
                    />
                  </Link>
                  <div className="min-w-0 space-y-1">
                    <span className="inline-block rounded-full bg-[var(--yomi-accent)]/15 border border-[var(--yomi-accent)]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--yomi-accent)] uppercase tracking-wider">
                      Última leitura
                    </span>
                    <Link
                      href={buildWorkHref(
                        leadContinue.manga.id,
                        leadContinue.manga.title
                      )}
                      className="block font-display text-lg sm:text-xl font-extrabold text-white hover:text-[var(--yomi-accent)] truncate"
                    >
                      {leadContinue.manga.title}
                    </Link>
                    <p className="text-xs sm:text-sm text-white/70 truncate">
                      Cap. {leadContinue.chapter.chapterNumber}
                      {leadContinue.chapter.title
                        ? ` — ${leadContinue.chapter.title}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-white/45">
                      Última página: {leadContinue.lastPageRead + 1}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <Link
                    href={`/ler/${leadContinue.chapter.id}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_var(--yomi-accent-glow)] hover:brightness-110 transition"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Continuar Leitura
                  </Link>
                  <Link
                    href={buildWorkHref(
                      leadContinue.manga.id,
                      leadContinue.manga.title
                    )}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white/85 hover:bg-white/10 transition"
                  >
                    Abrir Obra
                  </Link>
                </div>
              </div>

              {otherRecent.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {otherRecent.map((item, idx) => (
                    <div
                      key={`${item.manga.id}-${item.chapter.id}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-3.5 hover:border-white/20 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Link
                          href={buildWorkHref(item.manga.id, item.manga.title)}
                          className="shrink-0 overflow-hidden rounded-xl bg-white/5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getCoverUrl(item.manga)}
                            alt={item.manga.title}
                            className="h-16 w-12 object-cover object-top"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/brand/icon-1024.png';
                            }}
                          />
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={buildWorkHref(item.manga.id, item.manga.title)}
                            className="font-display text-sm font-bold text-white hover:text-[var(--yomi-accent)] truncate block"
                          >
                            {item.manga.title}
                          </Link>
                          <div className="text-xs text-white/60 truncate">
                            Cap. {item.chapter.chapterNumber} • Pág.{' '}
                            {item.lastPageRead + 1}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/ler/${item.chapter.id}`}
                        className="shrink-0 rounded-full bg-white/10 hover:bg-[var(--yomi-accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition"
                      >
                        Ler
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Favorites Grid */}
          {(filter === 'all' || filter === 'favorites') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[var(--yomi-accent)]" />
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                    Favoritos ({filteredFavorites.length})
                  </h2>
                </div>
                <Link
                  href="/explorar"
                  className="inline-flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white"
                >
                  <Compass className="h-3.5 w-3.5" />
                  Descobrir obras
                </Link>
              </div>

              {filteredFavorites.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center space-y-3">
                  <p className="text-sm text-white/60">
                    {normalizedQuery
                      ? 'Nenhum favorito corresponde à busca.'
                      : 'Você ainda não favoritou nenhuma obra.'}
                  </p>
                  <Link
                    href="/explorar"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    Explorar Catálogo
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredFavorites.map((manga) => {
                    const coverUrl = getCoverUrl(manga);
                    return (
                      <Link
                        key={manga.id}
                        href={buildWorkHref(manga.id, manga.title)}
                        className="group relative rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition hover:-translate-y-0.5 hover:border-white/20"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverUrl}
                            alt={manga.title}
                            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/brand/icon-1024.png';
                            }}
                          />
                          <button
                            type="button"
                            disabled={busyId === manga.id}
                            onClick={(e) => handleToggleFavorite(e, manga)}
                            title="Remover dos favoritos"
                            aria-label={`Remover ${manga.title} dos favoritos`}
                            className="absolute top-2.5 right-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/75 border border-white/15 text-[var(--yomi-accent)] hover:bg-black transition"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                        <div className="p-3">
                          <div className="font-display text-xs font-bold text-white line-clamp-2">
                            {manga.title}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Completed Works Section */}
          {filter === 'completed' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                  Obras Concluídas ({filteredCompleted.length})
                </h2>
              </div>

              {filteredCompleted.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center text-sm text-white/55">
                  Nenhuma obra concluída encontrada na sua biblioteca.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCompleted.map((manga) => (
                    <Link
                      key={manga.id}
                      href={buildWorkHref(manga.id, manga.title)}
                      className="group rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition hover:-translate-y-0.5 hover:border-white/20"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getCoverUrl(manga)}
                          alt={manga.title}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/brand/icon-1024.png';
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <div className="font-display text-xs font-bold text-white line-clamp-2">
                          {manga.title}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Custom Reading Lists / Collections */}
          {filter === 'all' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderHeart className="h-4 w-4 text-[var(--yomi-accent)]" />
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                    Coleções ({cloudState?.readingLists.length ?? 0})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={openCreateListModal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar Coleção
                </button>
              </div>

              {(cloudState?.readingLists.length ?? 0) === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center space-y-3">
                  <p className="text-sm text-white/60">
                    Organize suas obras por tema, humor ou fila de leitura.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateListModal}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar Primeira Coleção
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {cloudState?.readingLists.map((list) => {
                    const listMangas = (list.mangas ?? []).filter(matchesSearch);
                    return (
                      <div
                        key={list.id}
                        className="rounded-3xl border border-white/[0.08] bg-[#0E0E14] p-5 sm:p-6 space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <h3 className="font-display text-base sm:text-lg font-bold text-white">
                                {list.name}
                              </h3>
                              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/75">
                                {list.mangas?.length ?? 0} obras
                              </span>
                            </div>
                            {list.description && (
                              <p className="text-xs text-white/55">
                                {list.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openRenameListModal(list)}
                              title="Editar coleção"
                              className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70 hover:bg-white/10 hover:text-white"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === list.id}
                              onClick={() => handleDeleteList(list)}
                              title="Excluir coleção"
                              className="rounded-full border border-rose-500/20 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {listMangas.length === 0 ? (
                          <p className="text-xs text-white/45">
                            {normalizedQuery
                              ? 'Nenhuma obra nesta coleção corresponde à busca.'
                              : 'Coleção vazia — abra qualquer obra do catálogo e clique em "Adicionar à Coleção".'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {listMangas.map((m) => {
                              const isFav = favoriteIds.has(
                                cleanMangaDexId(m.id)
                              );
                              return (
                                <Link
                                  key={m.id}
                                  href={buildWorkHref(m.id, m.title)}
                                  className="group relative rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden transform-gpu [backface-visibility:hidden] transition hover:border-white/25"
                                >
                                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={getCoverUrl(m)}
                                      alt={m.title}
                                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src =
                                          '/brand/icon-1024.png';
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleRemoveFromList(e, list, m.id)
                                      }
                                      title="Remover da coleção"
                                      className="absolute top-2 right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/75 border border-white/15 text-white/80 hover:text-rose-400"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                    {isFav && (
                                      <span className="absolute bottom-2 left-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-[var(--yomi-accent)]">
                                        <Heart className="h-3 w-3 fill-current" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="p-2.5">
                                    <div className="font-display text-[11px] font-bold text-white line-clamp-2">
                                      {m.title}
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Collection */}
      {listModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setListModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl border border-white/12 bg-[#0E0E14] p-5 sm:p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">
                {editingListId ? 'Editar Coleção' : 'Nova Coleção'}
              </h2>
              <button
                type="button"
                onClick={() => setListModalOpen(false)}
                aria-label="Fechar modal de coleção"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveList} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Nome da Coleção
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={listNameInput}
                  onChange={(e) => setListNameInput(e.target.value)}
                  placeholder="Ex: Leituras da Madrugada"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-white/30 focus:border-[var(--yomi-accent)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={listDescInput}
                  onChange={(e) => setListDescInput(e.target.value)}
                  placeholder="Obras para ler antes de dormir..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-white/30 focus:border-[var(--yomi-accent)] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setListModalOpen(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/75 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingList}
                  className="rounded-full bg-[var(--yomi-accent)] px-5 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {savingList ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
