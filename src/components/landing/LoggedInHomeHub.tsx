'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BookOpen,
  Clock,
  Compass,
  HardDriveDownload,
  Heart,
  Library,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import { HeroSectionAnimated } from '@/components/landing/HeroSectionAnimated';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';
import {
  countReadChaptersFromHistory,
  fetchUserCloudDoc,
  getReaderRankInfo,
  type ParsedYomiCloudState,
} from '@/lib/firebase/cloudSync';
import { argbIntToHex } from '@/lib/backup/kuroCodec';
import {
  buildWorkHref,
  resolveMangaEntryCoverUrl,
} from '@/lib/mangadex/api';
import type { YomiReleaseInfo } from '@/lib/github/releases';
import type { MangaDexWork } from '@/lib/mangadex/types';

interface LoggedInHomeHubProps {
  release: YomiReleaseInfo;
  showcaseWorks: MangaDexWork[];
}

export function LoggedInHomeHub({
  release,
  showcaseWorks,
}: LoggedInHomeHubProps) {
  const { user } = useYomiAuth();

  const { data: cloudState } = useQuery<ParsedYomiCloudState | null>({
    queryKey: ['yomi-cloud-doc', user?.uid],
    queryFn: () =>
      user
        ? fetchUserCloudDoc(user.uid, user.email, user.displayName)
        : Promise.resolve(null),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <HeroSectionAnimated release={release} showcaseWorks={showcaseWorks} />
    );
  }

  const profileName =
    cloudState?.profile?.name ||
    cloudState?.userDisplayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Leitor';

  const profileAccent = cloudState?.profile?.customAccentColor
    ? argbIntToHex(cloudState.profile.customAccentColor)
    : undefined;

  const readChaptersCount = countReadChaptersFromHistory(
    cloudState?.backup?.history,
    cloudState?.recentReads?.length ?? 0
  );
  const rankInfo = getReaderRankInfo(readChaptersCount);
  const recentReads = cloudState?.recentReads?.slice(0, 4) ?? [];
  const favorites = cloudState?.favorites?.slice(0, 5) ?? [];

  return (
    <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-14">
      {/* Subtle Horizon Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[840px] -translate-x-1/2 rounded-full opacity-25 blur-[130px]"
        style={{
          background:
            'radial-gradient(circle, var(--yomi-accent) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
        {/* Personalized Reader Welcome Card */}
        <div className="rounded-3xl border border-white/10 bg-[#0E0E14]/90 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <div className="shrink-0 rounded-2xl border border-white/10 bg-black/40 p-2">
                <BlobatarCompanion
                  mascotName={cloudState?.mascotName || 'Kuro'}
                  expression={cloudState?.profile?.blobatarExpression}
                  shape={cloudState?.profile?.blobatarShape}
                  accentColor={profileAccent}
                  size={74}
                />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--yomi-accent)]/30 bg-[var(--yomi-accent)]/12 px-3 py-1 text-[11px] font-semibold text-white">
                  <Award className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                  <span>{rankInfo.title}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white truncate">
                  Olá, {profileName}
                </h1>
                <div className="flex items-center gap-3 max-w-xs">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--yomi-accent)] transition-all duration-500"
                      style={{ width: `${rankInfo.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-white/55 whitespace-nowrap">
                    {readChaptersCount} caps lidos
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Pills */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
              <Link
                href="/biblioteca"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--yomi-accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_var(--yomi-accent-glow)] hover:brightness-110 transition"
              >
                <Library className="h-3.5 w-3.5" />
                Minha Biblioteca
              </Link>
              <Link
                href="/explorar"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/12 transition"
              >
                <Compass className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                Catálogo Completo
              </Link>
              <Link
                href="/conta"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/12 transition"
              >
                <UserIcon className="h-3.5 w-3.5 text-white/75" />
                Editar Perfil & Mascote
              </Link>
              <Link
                href="/conta/backup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/12 transition"
              >
                <HardDriveDownload className="h-3.5 w-3.5 text-white/75" />
                Backup .kuro
              </Link>
            </div>
          </div>
        </div>

        {/* Row 1: Continue Reading */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--yomi-accent)]" />
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Continuar de onde parou
              </h2>
            </div>
            <Link
              href="/biblioteca"
              className="text-xs font-semibold text-white/60 hover:text-white"
            >
              Ver toda biblioteca →
            </Link>
          </div>

          {recentReads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-display text-sm font-bold text-white">
                  Seu histórico de leitura aparecerá aqui
                </div>
                <p className="text-xs text-white/55">
                  Abra qualquer capítulo no navegador ou sincronize seu aparelho
                  Android para retomar em um clique.
                </p>
              </div>
              <Link
                href="/explorar"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-white/90"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Começar a Ler
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {recentReads.map((item, idx) => (
                <div
                  key={`${item.manga.id}-${item.chapter.id}-${idx}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-4 hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Link
                      href={buildWorkHref(item.manga.id, item.manga.title)}
                      className="shrink-0 overflow-hidden rounded-xl bg-white/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMangaEntryCoverUrl(item.manga)}
                        alt={item.manga.title}
                        className="h-18 w-13 object-cover object-top"
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
                      <div className="text-xs text-white/65 truncate mt-0.5">
                        Cap. {item.chapter.chapterNumber}
                        {item.chapter.title ? ` — ${item.chapter.title}` : ''}
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        Última página: {item.lastPageRead + 1}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/ler/${item.chapter.id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--yomi-accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Continuar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Favorites or Curated Starter Shelf */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {favorites.length > 0 ? (
                <Heart className="h-4 w-4 text-[var(--yomi-accent)]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[var(--yomi-accent)]" />
              )}
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                {favorites.length > 0
                  ? 'Seus Favoritos'
                  : 'Sugestões para sua Biblioteca'}
              </h2>
            </div>
            <Link
              href={favorites.length > 0 ? '/biblioteca' : '/explorar'}
              className="text-xs font-semibold text-white/60 hover:text-white"
            >
              {favorites.length > 0 ? 'Gerenciar favoritos →' : 'Ver catálogo →'}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {favorites.length > 0
              ? favorites.map((manga) => (
                  <Link
                    key={manga.id}
                    href={buildWorkHref(manga.id, manga.title)}
                    className="group rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition hover:-translate-y-0.5 hover:border-white/25"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMangaEntryCoverUrl(manga)}
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
                ))
              : showcaseWorks.slice(0, 5).map((work) => (
                  <Link
                    key={work.id}
                    href={buildWorkHref(work.id, work.title)}
                    className="group rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transform-gpu [backface-visibility:hidden] transition hover:-translate-y-0.5 hover:border-white/25"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden bg-white/5 [transform:translateZ(0)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={work.coverUrl}
                        alt={work.title}
                        className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/brand/icon-1024.png';
                        }}
                      />
                    </div>
                    <div className="p-3">
                      <div className="font-display text-xs font-bold text-white line-clamp-2">
                        {work.title}
                      </div>
                      <div className="text-[11px] text-white/45 truncate mt-0.5">
                        {work.tags[0]?.name || work.author}
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}
