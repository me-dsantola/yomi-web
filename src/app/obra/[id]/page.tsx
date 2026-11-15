"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Lock,
} from "lucide-react";
import {
  fetchMangaChapters,
  fetchMangaDetails,
} from "@/lib/mangadex/api";
import { useYomiAuth } from "@/components/providers/AppProviders";
import { fetchUserCloudDoc } from "@/lib/firebase/cloudSync";
import { CommentsSection } from "@/components/comments/CommentsSection";

export default function ObraDetailsPage() {
  const params = useParams<{ id: string }>();
  const mangaId = String(params?.id ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { user, openAuthModal } = useYomiAuth();

  const { data: work, isLoading: loadingWork } = useQuery({
    queryKey: ["mangadex-work", mangaId],
    queryFn: () => fetchMangaDetails(mangaId),
    enabled: Boolean(mangaId),
  });

  const { data: chapters = [], isLoading: loadingChapters } = useQuery({
    queryKey: ["mangadex-chapters", mangaId, sortDirection],
    queryFn: () => fetchMangaChapters(mangaId, sortDirection),
    enabled: Boolean(mangaId),
  });

  const { data: cloudDoc } = useQuery({
    queryKey: ["yomi-cloud-doc", user?.uid],
    queryFn: () =>
      user ? fetchUserCloudDoc(user.uid, user.email) : Promise.resolve(null),
    enabled: Boolean(user),
  });

  const historyMap = cloudDoc?.backup?.history ?? {};
  const firstChapter = chapters[0];

  if (loadingWork) {
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
        <Link
          href="/explorar"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-10">
      <Link
        href="/explorar"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao Catálogo
      </Link>

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
                  e.currentTarget.src = "/brand/icon-1024.png";
                }}
              />
            </div>
          </div>

          <div className="md:col-span-9 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[var(--yomi-accent)]/15 border border-[var(--yomi-accent)]/30 px-2.5 py-0.5 font-semibold text-[var(--yomi-accent)]">
                  {work.status === "completed" ? "Completo" : "Em Lançamento"}
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

            {/* Primary Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {firstChapter && (
                <Link
                  href={`/ler/${firstChapter.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_25px_var(--yomi-accent-glow)] transition hover:brightness-110"
                >
                  <BookOpen className="h-4 w-4" />
                  {!user
                    ? `Ler Prévia — Cap. ${firstChapter.chapterNumber}`
                    : `Ler Cap. ${firstChapter.chapterNumber} (${firstChapter.language})`}
                </Link>
              )}
              {!user && (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
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
              setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
            }
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.08]"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
            Ordem: {sortDirection === "asc" ? "Cap. 1 → Atual" : "Mais Recentes"}
          </button>
        </div>

        {!user && chapters.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs">
            <div className="flex items-center gap-2.5 text-white/75">
              <Lock className="h-4 w-4 shrink-0 text-[var(--yomi-accent)]" />
              <span>
                Visitantes têm acesso a uma prévia de 3 páginas por capítulo. Crie ou conecte sua conta para liberar a leitura completa.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
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
              Esta obra possui capítulos licenciados exclusivamente em plataformas externas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <a
                href={`https://mangadex.org/title/${work.id}`}
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
              const isRead = Boolean(historyMap[`read_${ch.id}`]);
              return (
                <Link
                  key={ch.id}
                  href={`/ler/${ch.id}`}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                    isRead
                      ? "border-emerald-500/25 bg-emerald-500/[0.04] text-white/65"
                      : "border-white/[0.07] bg-black/30 hover:border-[var(--yomi-accent)]/50 hover:bg-white/[0.04] text-white"
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold">
                        Cap. {ch.chapterNumber}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          ch.language === "PT-BR"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/10 text-white/70"
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

                  <span className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
                    {!user ? "Prévia →" : "Ler →"}
                  </span>
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
    </div>
  );
}
