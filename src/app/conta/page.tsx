'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Cloud,
  Edit3,
  Eye,
  FolderHeart,
  HardDriveDownload,
  Heart,
  Library,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  countReadChaptersFromHistory,
  fetchUserCloudDoc,
  getReaderRankInfo,
  parseRawCloudDocData,
  saveCloudReadingLists,
  toggleCloudFavorite,
  updateCloudUserProfile,
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
  resolveMangaEntryCoverUrl,
} from '@/lib/mangadex/api';
import {
  BLOBATAR_EXPRESSIONS,
  BlobatarCompanion,
} from '@/components/brand/BlobatarCompanion';

const ACCENT_SWATCHES = [
  { hex: '#FF2A55', argb: 0xffff2a55, label: 'Carmesim' },
  { hex: '#8B5CF6', argb: 0xff8b5cf6, label: 'Violeta' },
  { hex: '#06B6D4', argb: 0xff06b6d4, label: 'Ciano' },
  { hex: '#10B981', argb: 0xff10b981, label: 'Esmeralda' },
  { hex: '#F59E0B', argb: 0xfff59e0b, label: 'Âmbar' },
];

export default function ContaDashboardPage() {
  const { user, loadingAuth, authError, openAuthModal, logout } =
    useYomiAuth();
  const queryClient = useQueryClient();

  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'lists'>(
    'recent'
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit Profile & Blobatar modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGenres, setEditGenres] = useState('');
  const [editMascotName, setEditMascotName] = useState('');
  const [editExpression, setEditExpression] = useState('happy');
  const [editAccentArgb, setEditAccentArgb] = useState(0xffff2a55);
  const [savingProfile, setSavingProfile] = useState(false);

  // Create collection inline state
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [savingList, setSavingList] = useState(false);

  const {
    data: cloudState,
    isLoading: loadingCloud,
    error: cloudError,
    refetch,
  } = useQuery<ParsedYomiCloudState | null>({
    queryKey: ['yomi-cloud-doc', user?.uid, demoMode],
    queryFn: async () => {
      if (demoMode && !user) {
        return parseRawCloudDocData(getDemoCloudDocument(), 'leitor@yomi.app');
      }
      if (!user) return null;
      return fetchUserCloudDoc(user.uid, user.email, user.displayName);
    },
    enabled: Boolean(user) || demoMode,
  });

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((curr) => (curr === msg ? null : curr));
    }, 3400);
  };

  const openEditProfile = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    const p = cloudState?.profile;
    setEditName(
      p?.name || cloudState?.userDisplayName || user.displayName || 'Leitor YOMI'
    );
    setEditBio(p?.bio || '');
    setEditGenres(p?.favoriteGenre || 'Ação, Fantasia & Seinen');
    setEditMascotName(p?.blobatarName || cloudState?.mascotName || 'Kuro');
    setEditExpression(p?.blobatarExpression || 'happy');
    setEditAccentArgb(p?.customAccentColor ?? 0xffff2a55);
    setIsEditOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSavingProfile(true);
    try {
      await updateCloudUserProfile(user.uid, user.email, {
        name: editName.trim() || 'Leitor YOMI',
        bio: editBio.trim(),
        favoriteGenre: editGenres.trim() || 'Ação, Fantasia & Seinen',
        blobatarName: editMascotName.trim() || 'Kuro',
        blobatarExpression: editExpression,
        customAccentColor: editAccentArgb,
      });
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      setIsEditOpen(false);
      showNotice('Perfil e mascote atualizados na nuvem!');
    } catch {
      showNotice('Erro ao salvar alterações do perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cloudState) {
      openAuthModal('login');
      return;
    }
    const name = newListName.trim();
    if (!name) return;
    setSavingList(true);
    try {
      const next: YomiReadingList[] = [
        {
          id: `list-${Date.now()}`,
          name,
          description: newListDesc.trim(),
          createdAt: new Date().toISOString(),
          mangas: [],
        },
        ...(cloudState.readingLists ?? []),
      ];
      await saveCloudReadingLists(user.uid, user.email, next);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      setNewListName('');
      setNewListDesc('');
      setIsNewListOpen(false);
      showNotice(`Coleção "${name}" criada com sucesso!`);
    } catch {
      showNotice('Não foi possível criar a coleção.');
    } finally {
      setSavingList(false);
    }
  };

  const handleDeleteList = async (list: YomiReadingList) => {
    if (!user || !cloudState) {
      openAuthModal('login');
      return;
    }
    try {
      const next = cloudState.readingLists.filter((l) => l.id !== list.id);
      await saveCloudReadingLists(user.uid, user.email, next);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      showNotice(`Coleção "${list.name}" removida.`);
    } catch {
      showNotice('Erro ao excluir a coleção.');
    }
  };

  const handleUnfavorite = async (
    e: React.MouseEvent,
    manga: YomiMangaEntry
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal('login');
      return;
    }
    try {
      await toggleCloudFavorite(user.uid, user.email, manga);
      await queryClient.invalidateQueries({ queryKey: ['yomi-cloud-doc'] });
      showNotice(`"${manga.title}" removido dos favoritos.`);
    } catch {
      showNotice('Erro ao atualizar favoritos.');
    }
  };

  const genreTags = useMemo(() => {
    const raw = cloudState?.profile?.favoriteGenre || '';
    const parsed = raw
      .split(/[,•·&/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parsed.length > 0
      ? parsed
      : ['Ação', 'Fantasia', 'Romance', 'Seinen'];
  }, [cloudState?.profile?.favoriteGenre]);

  const readChaptersCount = useMemo(
    () =>
      countReadChaptersFromHistory(
        cloudState?.backup?.history,
        cloudState?.recentReads?.length ?? 0
      ),
    [cloudState?.backup?.history, cloudState?.recentReads?.length]
  );

  const rankInfo = useMemo(
    () => getReaderRankInfo(readChaptersCount),
    [readChaptersCount]
  );

  if (loadingAuth) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-32 pb-20">
        <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-[#0E0E14]" />
      </div>
    );
  }

  // Unauthenticated & not in Demo Mode
  if (!user && !demoMode) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
        <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF2A55]/30 bg-[#FF2A55]/10 text-[#FF2A55]">
            <Cloud className="h-7 w-7" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Minha Conta
            </h1>
            <p className="text-sm sm:text-base text-white/60 leading-relaxed">
              Entre para sincronizar favoritos, histórico, Blobatar e backups{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">
                .kuro
              </code>
              .
            </p>
          </div>

          {authError && (
            <div className="mx-auto max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 flex items-start gap-2.5 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90"
            >
              Entrar ou Criar Conta
            </button>
            <button
              type="button"
              onClick={() => setDemoMode(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              <Eye className="h-4 w-4 text-[#FF2A55]" />
              Ver Demonstração Interativa
            </button>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-4 text-xs text-white/50">
            <Link
              href="/conta/backup"
              className="inline-flex items-center gap-1.5 text-white/75 hover:text-white underline"
            >
              <HardDriveDownload className="h-3.5 w-3.5 text-[#FF2A55]" />
              Apenas inspecionar ou validar um arquivo .kuro local
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profileAccent = cloudState?.profile?.customAccentColor
    ? argbIntToHex(cloudState.profile.customAccentColor)
    : '#FF2A55';

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-8">
      {/* Demo Banner */}
      {demoMode && !user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <span>
              <strong>Modo Demonstração:</strong> Conta de exemplo. Entre na sua conta para sincronizar.
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

      {/* Feedback Banner */}
      {feedback && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-200/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Loading or Error */}
      {loadingCloud && (
        <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-[#0E0E14]" />
      )}

      {cloudError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white">
              Erro ao carregar dados da nuvem
            </div>
            <p className="mt-1 text-xs text-rose-200/80">
              {(cloudError as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* Full Dashboard */}
      {cloudState && (
        <>
          {/* Notice when account has not synced yet from Android or web writes */}
          {user && !cloudState.updatedAtLocal && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0E0E14] px-5 py-3.5 text-xs text-white/70">
              <span>
                Sua conta já está pronta na Web! Você também pode enviar seus
                dados do app Android em <strong>Perfil → Nuvem</strong> ou
                importar um arquivo <code>.kuro</code>.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/conta/backup"
                  className="rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white transition"
                >
                  Importar .kuro
                </Link>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:text-white"
                >
                  <RefreshCw className="h-3 w-3" />
                  Atualizar
                </button>
              </div>
            </div>
          )}

          {/* Profile Header Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0E0E14]">
            {/* Banner */}
            <div
              className="h-36 sm:h-44 w-full bg-cover bg-center relative"
              style={{
                backgroundImage: cloudState.bannerDataUrl
                  ? `url(${cloudState.bannerDataUrl})`
                  : `radial-gradient(circle at 20% 30%, ${profileAccent}44, #141424 60%, #070709)`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E14] via-[#0E0E14]/40 to-transparent" />
            </div>

            <div className="px-6 sm:px-8 pb-6 -mt-12 relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                {cloudState.avatarDataUrl &&
                !cloudState.profile.useBlobatarAsAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cloudState.avatarDataUrl}
                    alt={cloudState.profile.name || 'Avatar'}
                    className="h-24 w-24 rounded-3xl border-4 border-[#0E0E14] object-cover shadow-xl"
                  />
                ) : (
                  <div className="rounded-3xl border-4 border-[#0E0E14] bg-[#14141C] p-2 shadow-xl w-fit">
                    <BlobatarCompanion
                      context="profile"
                      animated={cloudState?.profile?.blobatarAnimated !== false}
                      chaptersRead={readChaptersCount}
                      accentColor={profileAccent}
                      mascotName={cloudState.mascotName}
                      expression={cloudState.profile.blobatarExpression}
                      shape={cloudState.profile.blobatarShape}
                      size="md"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {cloudState.profile.name ||
                        cloudState.userDisplayName ||
                        'Leitor YOMI'}
                    </h1>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: profileAccent }}
                    >
                      {cloudState.mascotName}
                    </span>
                  </div>
                  {cloudState.profile.bio && (
                    <p className="text-xs sm:text-sm text-white/65 max-w-xl">
                      {cloudState.profile.bio}
                    </p>
                  )}
                  <p className="text-[11px] text-white/45">
                    {cloudState.updatedAtLocal
                      ? `Sincronizado via YOMI v${cloudState.appVersion} • ${new Date(
                          cloudState.updatedAtLocal
                        ).toLocaleString('pt-BR')}`
                      : 'Perfil Web ativo — sincronize a qualquer momento'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={openEditProfile}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Perfil & Mascote
                </button>
                <Link
                  href="/biblioteca"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <Library className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                  Minha Biblioteca
                </Link>
                <Link
                  href="/conta/backup"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <HardDriveDownload className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                  Backup (.kuro)
                </Link>
                {user && (
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </button>
                )}
              </div>
            </div>

            {/* Counter Strip */}
            <div className="grid grid-cols-3 border-t border-white/[0.07] bg-black/20 divide-x divide-white/[0.07] text-center py-3.5">
              <div>
                <div className="font-display text-lg sm:text-xl font-bold text-white">
                  {cloudState.favoritesCount}
                </div>
                <div className="text-[11px] text-white/50">Favoritos</div>
              </div>
              <div>
                <div className="font-display text-lg sm:text-xl font-bold text-white">
                  {readChaptersCount}
                </div>
                <div className="text-[11px] text-white/50">Capítulos Lidos</div>
              </div>
              <div>
                <div className="font-display text-lg sm:text-xl font-bold text-white">
                  {cloudState.readingListsCount}
                </div>
                <div className="text-[11px] text-white/50">
                  Listas Personalizadas
                </div>
              </div>
            </div>
          </div>

          {/* Reader Rank + Favorite Genres Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: profileAccent }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                    Rank do Leitor
                  </span>
                </div>
                <span className="text-xs font-semibold text-white/75">
                  {readChaptersCount} / {rankInfo.nextGoal} caps
                </span>
              </div>
              <div className="font-display text-base sm:text-lg font-extrabold text-white">
                {rankInfo.title}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${rankInfo.progress}%`,
                    backgroundColor: profileAccent,
                  }}
                />
              </div>
            </div>

            <div className="md:col-span-6 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Gêneros Favoritos
                </span>
                <button
                  type="button"
                  onClick={openEditProfile}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: profileAccent }}
                >
                  Editar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {genreTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/85"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('recent')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'recent'
                    ? 'bg-white text-black'
                    : 'bg-[#0E0E14] text-white/65 hover:text-white'
                }`}
              >
                <Clock className="h-4 w-4" />
                Continuar Lendo ({cloudState.recentReads.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('favorites')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'favorites'
                    ? 'bg-white text-black'
                    : 'bg-[#0E0E14] text-white/65 hover:text-white'
                }`}
              >
                <Heart className="h-4 w-4" />
                Favoritos ({cloudState.favorites.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lists')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'lists'
                    ? 'bg-white text-black'
                    : 'bg-[#0E0E14] text-white/65 hover:text-white'
                }`}
              >
                <FolderHeart className="h-4 w-4" />
                Coleções ({cloudState.readingLists.length})
              </button>
            </div>

            {activeTab === 'lists' && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthModal('login');
                    return;
                  }
                  setIsNewListOpen((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--yomi-accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Coleção
              </button>
            )}
          </div>

          {/* Tab Content: Recent Reads */}
          {activeTab === 'recent' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cloudState.recentReads.length === 0 ? (
                <div className="col-span-2 rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center space-y-3">
                  <p className="text-sm text-white/55">
                    Nenhuma leitura recente encontrada no seu histórico.
                  </p>
                  <Link
                    href="/explorar"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    Explorar Catálogo
                  </Link>
                </div>
              ) : (
                cloudState.recentReads.map((item, idx) => {
                  const manga = item.manga;
                  const ch = item.chapter;
                  const coverUrl = resolveMangaEntryCoverUrl(manga);
                  const workHref = buildWorkHref(manga?.id ?? '', manga?.title);
                  return (
                    <div
                      key={`${manga?.id}-${ch?.id}-${idx}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-4 hover:border-white/20 transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Link
                          href={workHref}
                          className="shrink-0 overflow-hidden rounded-xl bg-white/5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverUrl}
                            alt={manga?.title || 'Capa'}
                            className="h-18 w-13 object-cover object-top"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/brand/icon-1024.png';
                            }}
                          />
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={workHref}
                            className="font-display text-sm font-bold text-white hover:text-[#FF2A55] truncate block"
                          >
                            {manga?.title}
                          </Link>
                          <div className="text-xs text-white/65 mt-0.5 truncate">
                            Cap. {ch?.chapterNumber}{' '}
                            {ch?.title ? `— ${ch.title}` : ''}
                          </div>
                          <div className="text-[11px] text-white/40 mt-1">
                            Última página: {item.lastPageRead + 1}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ch?.id && (
                          <Link
                            href={`/ler/${ch.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF2A55] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#ff4268]"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Continuar Cap. {ch.chapterNumber}
                          </Link>
                        )}
                        {manga?.id && (
                          <Link
                            href={workHref}
                            className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/85 hover:bg-white/10"
                          >
                            Ver Obra
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Content: Favorites */}
          {activeTab === 'favorites' && (
            <>
              {cloudState.favorites.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center space-y-3">
                  <p className="text-sm text-white/55">
                    Você ainda não adicionou obras aos favoritos.
                  </p>
                  <Link
                    href="/explorar"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    Descobrir no Catálogo
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {cloudState.favorites.map((manga) => {
                    const coverUrl = resolveMangaEntryCoverUrl(manga);
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
                            onClick={(e) => handleUnfavorite(e, manga)}
                            title="Remover dos favoritos"
                            className="absolute top-2.5 right-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/75 border border-white/15 text-[#FF2A55] hover:bg-black transition"
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
            </>
          )}

          {/* Tab Content: Custom Reading Lists */}
          {activeTab === 'lists' && (
            <div className="space-y-5">
              {isNewListOpen && (
                <form
                  onSubmit={handleCreateList}
                  className="rounded-2xl border border-[var(--yomi-accent)]/35 bg-[#0E0E14] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-white">
                      Criar Nova Coleção
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsNewListOpen(false)}
                      className="text-white/50 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Nome da coleção"
                      className="rounded-xl border border-white/12 bg-black/40 px-3.5 py-2 text-base sm:text-xs text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newListDesc}
                      onChange={(e) => setNewListDesc(e.target.value)}
                      placeholder="Descrição curta (opcional)"
                      className="rounded-xl border border-white/12 bg-black/40 px-3.5 py-2 text-base sm:text-xs text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingList}
                      className="rounded-full bg-[var(--yomi-accent)] px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                    >
                      {savingList ? 'Salvando...' : 'Criar Coleção'}
                    </button>
                  </div>
                </form>
              )}

              {cloudState.readingLists.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center space-y-3">
                  <p className="text-sm text-white/55">
                    Nenhuma coleção criada ainda. Crie coleções para organizar
                    suas obras favoritas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {cloudState.readingLists.map((list) => (
                    <div
                      key={list.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-display text-base font-bold text-white">
                              {list.name}
                            </h3>
                            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/75">
                              {list.mangas?.length ?? 0} obras
                            </span>
                          </div>
                          {list.description && (
                            <p className="text-xs text-white/55 mt-1">
                              {list.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteList(list)}
                          title="Excluir coleção"
                          className="rounded-full border border-rose-500/20 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {(list.mangas ?? []).length === 0 ? (
                        <p className="text-xs text-white/45">
                          Coleção vazia. Visite qualquer obra e adicione-a por
                          lá.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {(list.mangas ?? []).map((m) => (
                            <Link
                              key={m.id}
                              href={buildWorkHref(m.id, m.title)}
                              className="group rounded-xl border border-white/10 bg-black/30 overflow-hidden transition hover:border-[#FF2A55]"
                            >
                              <div className="aspect-[3/4] w-full overflow-hidden bg-white/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={resolveMangaEntryCoverUrl(m)}
                                  alt={m.title}
                                  className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/brand/icon-1024.png';
                                  }}
                                />
                              </div>
                              <div className="p-2 text-[11px] font-semibold text-white/85 line-clamp-2 group-hover:text-white">
                                {m.title}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Profile & Blobatar Modal */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl border border-white/12 bg-[#0E0E14] p-5 sm:p-7 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">
                Editar Perfil & Mascote
              </h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/30 p-4">
              <BlobatarCompanion
                context="profile"
                animated={cloudState?.profile?.blobatarAnimated !== false}
                mascotName={editMascotName || 'Kuro'}
                expression={editExpression}
                accentColor={argbIntToHex(editAccentArgb)}
                size={68}
                interactiveCycle={false}
              />
              <div className="min-w-0">
                <div className="font-display text-sm font-bold text-white truncate">
                  {editName || 'Leitor YOMI'}
                </div>
                <div className="text-xs text-white/55 truncate">
                  Mascote: {editMascotName || 'Kuro'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/75">
                  Nome de Exibição
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-[var(--yomi-accent)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/75">Bio</label>
                <textarea
                  rows={2}
                  maxLength={180}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Conte um pouco sobre seus gêneros e leituras..."
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-[var(--yomi-accent)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/75">
                  Gêneros Favoritos (separados por vírgula)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={editGenres}
                  onChange={(e) => setEditGenres(e.target.value)}
                  placeholder="Ação, Fantasia, Seinen, Romance"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-[var(--yomi-accent)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/75">
                    Nome do Blobatar
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={editMascotName}
                    onChange={(e) => setEditMascotName(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-[var(--yomi-accent)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/75">
                    Expressão do Mascote
                  </label>
                  <select
                    value={editExpression}
                    onChange={(e) => setEditExpression(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-[#09090d] px-3 py-2.5 text-base sm:text-sm text-white focus:border-[var(--yomi-accent)] focus:outline-none"
                  >
                    {BLOBATAR_EXPRESSIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/75">
                  Cor de Destaque do Perfil
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {ACCENT_SWATCHES.map((swatch) => {
                    const selected = editAccentArgb === swatch.argb;
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => setEditAccentArgb(swatch.argb)}
                        title={swatch.label}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          selected
                            ? 'border-white bg-white/10 text-white'
                            : 'border-white/10 bg-black/30 text-white/65 hover:text-white'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <span>{swatch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/75 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-full bg-[var(--yomi-accent)] px-6 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
