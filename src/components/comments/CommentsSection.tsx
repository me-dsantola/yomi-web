'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  EyeOff,
  Heart,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  deleteComment,
  fetchComments,
  postComment,
  toggleLikeComment,
  type CommentTargetType,
  type YomiComment,
} from '@/lib/firebase/comments';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';

interface CommentsSectionProps {
  targetId: string;
  targetType: CommentTargetType;
  title?: string;
}

function formatRelativeTime(ts: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60_000));
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `há ${diffD}d`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

export function CommentsSection({
  targetId,
  targetType,
  title = 'Comentários',
}: CommentsSectionProps) {
  const { user, openAuthModal } = useYomiAuth();
  const [text, setText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<string, boolean>
  >({});

  const {
    data: comments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<YomiComment[]>({
    queryKey: ['yomi-comments', targetId],
    queryFn: () => fetchComments(targetId),
    enabled: Boolean(targetId),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim() || submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await postComment({
        targetId,
        targetType,
        userId: user.uid,
        userName:
          user.displayName || user.email?.split('@')[0] || 'Leitor YOMI',
        text,
        isSpoiler,
      });
      setText('');
      setIsSpoiler(false);
      await refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível enviar o comentário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (comment: YomiComment) => {
    setErrorMsg(null);
    if (!user) {
      openAuthModal('login');
      return;
    }
    const currentlyLiked = comment.likedBy.includes(user.uid);
    try {
      await toggleLikeComment({
        commentId: comment.id,
        targetId,
        userId: user.uid,
        currentlyLiked,
      });
      await refetch();
    } catch {
      setErrorMsg('Não foi possível atualizar a curtida. Tente novamente.');
    }
  };

  const handleDelete = async (commentId: string) => {
    setErrorMsg(null);
    try {
      await deleteComment({ commentId, targetId });
      await refetch();
    } catch {
      setErrorMsg('Não foi possível excluir o comentário. Tente novamente.');
    }
  };

  return (
    <section
      aria-labelledby="comments-heading"
      onClick={(e) => e.stopPropagation()}
      className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-[var(--yomi-accent)]" />
          <h2
            id="comments-heading"
            className="font-display text-xl font-bold text-white"
          >
            {title} ({comments.length})
          </h2>
        </div>
      </div>

      {/* Composer or Auth Prompt */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={3}
            maxLength={800}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva sua opinião sobre esta leitura..."
            className="w-full rounded-2xl border border-white/12 bg-[#070709] p-4 text-sm text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none resize-none"
          />

          {errorMsg && (
            <p className="text-xs text-rose-400">{errorMsg}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-white/65 hover:text-white">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black accent-[var(--yomi-accent)]"
              />
              <EyeOff className="h-3.5 w-3.5 text-amber-400" />
              <span>Marcar como spoiler</span>
            </label>

            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Publicando...' : 'Publicar comentário'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#070709]/80 p-5">
          <div>
            <p className="text-sm font-semibold text-white">
              Entre para participar da discussão
            </p>
            <p className="mt-0.5 text-xs text-white/55">
              Comente, curta opiniões e marque spoilers com sua conta YOMI.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Entrar ou Criar Conta
            </button>
          </div>
        </div>
      )}

      {errorMsg && <p role="alert" className="text-xs text-rose-400">{errorMsg}</p>}
      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="py-6 text-center space-y-3">
          <p role="alert" className="text-xs text-rose-400">Não foi possível carregar os comentários.</p>
          <button type="button" onClick={() => refetch()} className="rounded-full border border-white/20 px-4 py-2 text-xs text-white">Tentar novamente</button>
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/45">
          Nenhum comentário ainda. Seja o primeiro a comentar.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const likedByMe = user ? comment.likedBy.includes(user.uid) : false;
            const isAuthor = Boolean(user && comment.userId === user.uid);
            const spoilerHidden =
              comment.isSpoiler && !revealedSpoilers[comment.id];

            return (
              <div
                key={comment.id}
                className="rounded-2xl border border-white/[0.08] bg-[#070709]/70 p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BlobatarCompanion
                      seed={comment.userName}
                      mascotName={comment.userName}
                      size={40}
                      followPointer={false}
                      interactiveCycle={false}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-white truncate">
                          {comment.userName}
                        </span>
                        {comment.isSpoiler && (
                          <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            Spoiler
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/45">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      aria-label="Excluir comentário"
                      className="rounded-lg p-1.5 text-white/40 transition hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {spoilerHidden ? (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedSpoilers((prev) => ({
                        ...prev,
                        [comment.id]: true,
                      }))
                    }
                    className="w-full rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-left text-xs text-amber-200/90 transition hover:bg-amber-500/10"
                  >
                    Conteúdo marcado como spoiler · Clique para revelar
                  </button>
                ) : (
                  <p className="text-sm leading-relaxed text-white/85 whitespace-pre-line">
                    {comment.text}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLike(comment)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      likedByMe
                        ? 'border-[var(--yomi-accent)]/50 bg-[var(--yomi-accent)]/15 text-[var(--yomi-accent)]'
                        : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${
                        likedByMe ? 'fill-current' : ''
                      }`}
                    />
                    <span>{comment.likes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
