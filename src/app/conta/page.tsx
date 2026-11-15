"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  HardDriveDownload,
  LogOut,
  Heart,
  Clock,
  FolderHeart,
  Sparkles,
  BookOpen,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useYomiAuth } from "@/components/providers/AppProviders";
import {
  fetchUserCloudDoc,
  parseRawCloudDocData,
  type ParsedYomiCloudState,
} from "@/lib/firebase/cloudSync";
import { getDemoCloudDocument } from "@/lib/firebase/demoFixture";
import { argbIntToHex } from "@/lib/backup/kuroCodec";
import { buildMangaCoverUrl } from "@/lib/mangadex/api";
import { BlobatarCompanion } from "@/components/brand/BlobatarCompanion";

export default function ContaDashboardPage() {
  const { user, loadingAuth, authError, openAuthModal, logout } =
    useYomiAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"recent" | "favorites" | "lists">(
    "recent"
  );

  const {
    data: cloudState,
    isLoading: loadingCloud,
    error: cloudError,
    refetch,
  } = useQuery<ParsedYomiCloudState | null>({
    queryKey: ["yomi-cloud-doc", user?.uid, demoMode],
    queryFn: async () => {
      if (demoMode && !user) {
        return parseRawCloudDocData(getDemoCloudDocument(), "leitor@yomi.app");
      }
      if (!user) return null;
      return fetchUserCloudDoc(user.uid, user.email);
    },
    enabled: Boolean(user) || demoMode,
  });

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
              Minha Biblioteca na Nuvem
            </h1>
            <p className="text-sm sm:text-base text-white/60 leading-relaxed">
              Entre com seu e-mail e senha ou conta Google utilizada no aplicativo YOMI para acompanhar seus favoritos, histórico de leitura, seu Blobatar e gerenciar backups{" "}
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
              onClick={() => openAuthModal("login")}
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
    : "#FF2A55";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-8">
      {/* Demo Banner */}
      {demoMode && !user && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>
              <strong>Modo Demonstração:</strong> Exibindo uma biblioteca de exemplo conectada ao YOMI Cloud.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuthModal("login")}
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

      {/* User logged in but no Firestore document yet */}
      {!loadingCloud && user && !cloudState && !cloudError && (
        <div className="rounded-3xl border border-white/10 bg-[#0E0E14] p-8 text-center space-y-4">
          <Cloud className="mx-auto h-10 w-10 text-[#FF2A55]" />
          <h2 className="font-display text-2xl font-bold text-white">
            Nenhum backup na nuvem encontrado para {user.email}
          </h2>
          <p className="max-w-lg mx-auto text-sm text-white/60">
            Para sincronizar: abra o aplicativo YOMI no seu celular Android, vá em{" "}
            <strong>Perfil → Sincronização na Nuvem</strong> e toque em{" "}
            <strong>Enviar para a Nuvem</strong>, ou importe um arquivo{" "}
            <code>.kuro</code> diretamente pelo navegador.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/conta/backup"
              className="inline-flex items-center gap-2 rounded-full bg-[#FF2A55] px-5 py-2.5 text-xs font-semibold text-white"
            >
              <HardDriveDownload className="h-4 w-4" />
              Importar Arquivo .kuro
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-medium text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Verificar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Full Dashboard */}
      {cloudState && (
        <>
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

            <div className="px-6 sm:px-8 pb-6 -mt-12 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                {cloudState.avatarDataUrl &&
                !cloudState.profile.useBlobatarAsAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cloudState.avatarDataUrl}
                    alt={cloudState.profile.name || "Avatar"}
                    className="h-24 w-24 rounded-3xl border-4 border-[#0E0E14] object-cover shadow-xl"
                  />
                ) : (
                  <div className="rounded-3xl border-4 border-[#0E0E14] bg-[#14141C] p-2 shadow-xl">
                    <BlobatarCompanion
                      chaptersRead={cloudState.historyCount}
                      accentColor={profileAccent}
                      mascotName={cloudState.mascotName}
                      size="md"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {cloudState.profile.name ||
                        cloudState.userDisplayName ||
                        "Leitor YOMI"}
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
                    Sincronizado via YOMI v{cloudState.appVersion} •{" "}
                    {cloudState.updatedAtLocal
                      ? new Date(cloudState.updatedAtLocal).toLocaleString(
                          "pt-BR"
                        )
                      : "Recente"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href="/conta/backup"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <HardDriveDownload className="h-3.5 w-3.5 text-[#FF2A55]" />
                  Exportar / Importar (.kuro)
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
                  {cloudState.historyCount}
                </div>
                <div className="text-[11px] text-white/50">
                  Registros de Leitura
                </div>
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

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab("recent")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "recent"
                  ? "bg-white text-black"
                  : "bg-[#0E0E14] text-white/65 hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4" />
              Continuar Lendo ({cloudState.recentReads.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "favorites"
                  ? "bg-white text-black"
                  : "bg-[#0E0E14] text-white/65 hover:text-white"
              }`}
            >
              <Heart className="h-4 w-4" />
              Favoritos ({cloudState.favorites.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lists")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === "lists"
                  ? "bg-white text-black"
                  : "bg-[#0E0E14] text-white/65 hover:text-white"
              }`}
            >
              <FolderHeart className="h-4 w-4" />
              Coleções ({cloudState.readingLists.length})
            </button>
          </div>

          {/* Tab Content: Recent Reads */}
          {activeTab === "recent" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cloudState.recentReads.length === 0 ? (
                <p className="text-sm text-white/50 col-span-2 py-8 text-center">
                  Nenhuma leitura recente encontrada no seu histórico.
                </p>
              ) : (
                cloudState.recentReads.map((item, idx) => {
                  const manga = item.manga;
                  const ch = item.chapter;
                  const coverUrl = buildMangaCoverUrl(
                    manga?.id ?? "",
                    manga?.coverFileName
                  );
                  return (
                    <div
                      key={`${manga?.id}-${ch?.id}-${idx}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-4 hover:border-white/20 transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverUrl}
                          alt={manga?.title || "Capa"}
                          className="h-16 w-12 rounded-lg object-cover object-top bg-white/5 shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/brand/icon-1024.png";
                          }}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/obra/${manga?.id}`}
                            className="font-display text-sm font-bold text-white hover:text-[#FF2A55] truncate block"
                          >
                            {manga?.title}
                          </Link>
                          <div className="text-xs text-white/65 mt-0.5">
                            Cap. {ch?.chapterNumber}{" "}
                            {ch?.title ? `— ${ch.title}` : ""}
                          </div>
                          <div className="text-[11px] text-white/40 mt-1">
                            Última página: {item.lastPageRead + 1}
                          </div>
                        </div>
                      </div>

                      {manga?.id && (
                        <Link
                          href={`/obra/${manga.id}`}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#FF2A55] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#ff4268]"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Abrir
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Content: Favorites */}
          {activeTab === "favorites" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cloudState.favorites.map((manga) => {
                const coverUrl = buildMangaCoverUrl(
                  manga.id,
                  manga.coverFileName
                );
                return (
                  <Link
                    key={manga.id}
                    href={`/obra/${manga.id}`}
                    className="group rounded-2xl border border-white/[0.08] bg-[#0E0E14] overflow-hidden transition hover:-translate-y-0.5 hover:border-white/20"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={manga.title}
                        className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/brand/icon-1024.png";
                        }}
                      />
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

          {/* Tab Content: Custom Reading Lists */}
          {activeTab === "lists" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cloudState.readingLists.map((list) => (
                <div
                  key={list.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-white">
                      {list.name}
                    </h3>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/75">
                      {list.mangas?.length ?? 0} obras
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-xs text-white/55">{list.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(list.mangas ?? []).map((m) => (
                      <Link
                        key={m.id}
                        href={`/obra/${m.id}`}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/80 hover:border-[#FF2A55] hover:text-white"
                      >
                        {m.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
