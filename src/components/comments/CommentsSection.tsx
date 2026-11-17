'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bookmark,
  EyeOff,
  Heart,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  COMMENT_MAX_LENGTH,
  COMMENTS_PAGE_SIZE,
  deleteComment,
  fetchCommentsPage,
  normalizeCommentTargetId,
  postComment,
  readLocalCommentDrafts,
  removeLocalCommentDraft,
  saveLocalCommentDraft,
  toggleLikeComment,
  type CommentTargetType,
  type CommentsPageResult,
  type YomiComment,
} from '@/lib/firebase/comments';
import type { ParsedYomiCloudState } from '@/lib/firebase/cloudSync';
import { argbIntToHex } from '@/lib/backup/kuroCodec';
import { EMPTY_EQUIPMENT } from '@/lib/kuro/cosmetics';
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
  const queryClient = useQueryClient();

  const canonicalTargetId = useMemo(
    () => normalizeCommentTargetId(targetId, targetType),
    [targetId, targetType]
  );

  const [text, setText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<string, boolean>
  >({});

  const [extraComments, setExtraComments] = useState<YomiComment[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<YomiComment[]>([]);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(
    null
  );
  const [pendingLikeIds, setPendingLikeIds] = useState<Record<string, boolean>>(
    {}
  );
  const [pendingDeleteIds, setPendingDeleteIds] = useState<
    Record<string, boolean>
  >({});

  const queryKey = useMemo(
    () => ['yomi-comments', canonicalTargetId, targetType] as const,
    [canonicalTargetId, targetType]
  );

  useEffect(() => {
    setExtraComments([]);
    setSubmitErrorMsg(null);
    setActionErrorMsg(null);
    if (canonicalTargetId) {
      setLocalDrafts(readLocalCommentDrafts(canonicalTargetId, targetType));
    } else {
      setLocalDrafts([]);
    }
  }, [canonicalTargetId, targetType]);

  const {
    data: firstPage,
    isLoading,
    isError,
    refetch,
  } = useQuery<CommentsPageResult>({
    queryKey,
    queryFn: () =>
      fetchCommentsPage(canonicalTargetId, {
        targetType,
        pageSize: COMMENTS_PAGE_SIZE,
      }),
    enabled: Boolean(canonicalTargetId),
    retry: 1,
  });

  const comments = useMemo(() => {
    const merged = new Map<string, YomiComment>();
    for (const c of firstPage?.comments ?? []) {
      merged.set(c.id, c);
    }
    for (const c of extraComments) {
      if (!merged.has(c.id)) {
        merged.set(c.id, c);
      }
    }
    return Array.from(merged.values()).sort((a, b) => {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return b.id.localeCompare(a.id);
    });
  }, [firstPage, extraComments]);

  const totalRemoteCount = Math.max(
    comments.length,
    firstPage?.totalCount ?? 0
  );
  const lastLoadedCreatedAt =
    comments.length > 0 ? comments[comments.length - 1].createdAt : null;
  const hasMorePages =
    totalRemoteCount > comments.length || Boolean(firstPage?.hasMore && extraComments.length === 0);

  const getMascotSnapshot = useCallback(() => {
    if (!user) return {};
    const cloud = queryClient.getQueryData<ParsedYomiCloudState | null>([
      'yomi-cloud-doc',
      user.uid,
    ]);
    const profile = cloud?.profile;
    return {
      userPhotoUrl: user.photoURL ?? null,
      mascotColorId: profile?.customAccentColor
        ? argbIntToHex(profile.customAccentColor)
        : undefined,
      mascotExpressionId: profile?.blobatarExpression || undefined,
      mascotShapeId: profile?.blobatarShape || undefined,
    };
  }, [queryClient, user]);

  const submitCurrentComment = async () => {
    if (!user || !text.trim() || submitting) return;
    setSubmitErrorMsg(null);
    setActionErrorMsg(null);
    setSubmitting(true);
    try {
      const mascot = getMascotSnapshot();
      const created = await postComment({
        targetId: canonicalTargetId,
        targetType,
        userId: user.uid,
        userName:
          user.displayName || user.email?.split('@')[0] || 'Leitor YOMI',
        ...mascot,
        text,
        isSpoiler,
      });

      queryClient.setQueryData<CommentsPageResult>(queryKey, (prev) => {
        if (!prev) {
          return {
            comments: [created],
            hasMore: false,
            nextCursor: null,
            totalCount: 1,
          };
        }
        return {
          ...prev,
          comments: [created, ...prev.comments.filter((c) => c.id !== created.id)],
          totalCount: prev.totalCount + 1,
        };
      });

      setText('');
      setIsSpoiler(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível publicar o comentário no servidor.';
      // Mantém o texto digitado no compositor para evitar perda do que o usuário escreveu
      setSubmitErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCurrentComment();
  };

  const handleSaveAsLocalDraft = () => {
    if (!user || !text.trim()) return;
    try {
      const mascot = getMascotSnapshot();
      const saved = saveLocalCommentDraft({
        targetId: canonicalTargetId,
        targetType,
        userId: user.uid,
        userName:
          user.displayName || user.email?.split('@')[0] || 'Leitor YOMI',
        ...mascot,
        text,
        isSpoiler,
      });
      setLocalDrafts((prev) => [saved, ...prev]);
      setText('');
      setIsSpoiler(false);
      setSubmitErrorMsg(null);
    } catch (err: unknown) {
      setSubmitErrorMsg(
        err instanceof Error ? err.message : 'Erro ao salvar rascunho local.'
      );
    }
  };

  const handlePublishLocalDraft = async (draft: YomiComment) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (publishingDraftId) return;
    setPublishingDraftId(draft.id);
    setActionErrorMsg(null);
    try {
      const mascot = getMascotSnapshot();
      const created = await postComment({
        targetId: canonicalTargetId,
        targetType,
        userId: user.uid,
        userName:
          user.displayName ||
          draft.userName ||
          user.email?.split('@')[0] ||
          'Leitor YOMI',
        ...mascot,
        text: draft.text,
        isSpoiler: draft.isSpoiler,
      });
      removeLocalCommentDraft(canonicalTargetId, draft.id, targetType);
      setLocalDrafts((prev) => prev.filter((item) => item.id !== draft.id));
      queryClient.setQueryData<CommentsPageResult>(queryKey, (prev) => {
        if (!prev) {
          return {
            comments: [created],
            hasMore: false,
            nextCursor: null,
            totalCount: 1,
          };
        }
        return {
          ...prev,
          comments: [created, ...prev.comments],
          totalCount: prev.totalCount + 1,
        };
      });
    } catch (err: unknown) {
      setActionErrorMsg(
        err instanceof Error
          ? err.message
          : 'Falha ao enviar o rascunho para o servidor. Ele continua salvo localmente.'
      );
    } finally {
      setPublishingDraftId(null);
    }
  };

  const handleDiscardLocalDraft = (draftId: string) => {
    removeLocalCommentDraft(canonicalTargetId, draftId, targetType);
    setLocalDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleLike = async (comment: YomiComment) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (pendingLikeIds[comment.id]) return;

    setActionErrorMsg(null);
    setPendingLikeIds((prev) => ({ ...prev, [comment.id]: true }));

    const prevLiked = comment.likedBy.includes(user.uid);
    const optimisticLikedBy = prevLiked
      ? comment.likedBy.filter((id) => id !== user.uid)
      : [...comment.likedBy, user.uid];
    const optimisticLikes = optimisticLikedBy.length;

    const patchCommentInState = (
      id: string,
      likedBy: string[],
      likes: number
    ) => {
      queryClient.setQueryData<CommentsPageResult>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === id ? { ...c, likedBy, likes } : c
          ),
        };
      });
      setExtraComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likedBy, likes } : c))
      );
    };

    patchCommentInState(comment.id, optimisticLikedBy, optimisticLikes);

    try {
      const result = await toggleLikeComment({
        commentId: comment.id,
        targetId: canonicalTargetId,
        userId: user.uid,
        currentlyLiked: prevLiked,
      });
      patchCommentInState(comment.id, result.likedBy, result.likes);
    } catch (err: unknown) {
      // Reverte atualização otimista em caso de erro
      patchCommentInState(comment.id, comment.likedBy, comment.likes);
      setActionErrorMsg(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar a curtida.'
      );
    } finally {
      setPendingLikeIds((prev) => {
        const next = { ...prev };
        delete next[comment.id];
        return next;
      });
    }
  };

  const handleDelete = async (comment: YomiComment) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (pendingDeleteIds[comment.id]) return;

    setActionErrorMsg(null);
    setPendingDeleteIds((prev) => ({ ...prev, [comment.id]: true }));
    try {
      await deleteComment({
        commentId: comment.id,
        targetId: canonicalTargetId,
        userId: user.uid,
        targetType,
      });

      queryClient.setQueryData<CommentsPageResult>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.filter((c) => c.id !== comment.id),
          totalCount: Math.max(0, prev.totalCount - 1),
        };
      });
      setExtraComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (err: unknown) {
      setActionErrorMsg(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir o comentário.'
      );
    } finally {
      setPendingDeleteIds((prev) => {
        const next = { ...prev };
        delete next[comment.id];
        return next;
      });
    }
  };

  const handleLoadMore = async () => {
    if (!lastLoadedCreatedAt || loadingMore) return;
    setLoadingMore(true);
    setActionErrorMsg(null);
    try {
      const nextPage = await fetchCommentsPage(canonicalTargetId, {
        targetType,
        pageSize: COMMENTS_PAGE_SIZE,
        cursorCreatedAt: lastLoadedCreatedAt,
      });
      setExtraComments((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        for (const c of nextPage.comments) {
          map.set(c.id, c);
        }
        return Array.from(map.values());
      });
    } catch (err: unknown) {
      setActionErrorMsg(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar mais comentários.'
      );
    } finally {
      setLoadingMore(false);
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
            {title} ({totalRemoteCount})
          </h2>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Atualizar comentários"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/65 transition hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Composer or Auth Prompt */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (submitErrorMsg) setSubmitErrorMsg(null);
              }}
              placeholder="Escreva sua opinião sobre esta leitura..."
              aria-label="Campo de comentário"
              className="w-full rounded-2xl border border-white/12 bg-[#070709] p-4 pb-8 text-base sm:text-sm text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none resize-none"
            />
            <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-[11px] text-white/35">
              {text.length}/{COMMENT_MAX_LENGTH}
            </span>
          </div>

          {submitErrorMsg && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{submitErrorMsg}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={submitCurrentComment}
                  disabled={submitting}
                  className="rounded-full bg-rose-500/25 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-500/35"
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsLocalDraft}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-white/85 transition hover:bg-white/10"
                >
                  <Bookmark className="h-3 w-3" />
                  Salvar rascunho
                </button>
              </div>
            </div>
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
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
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

      {actionErrorMsg && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            {actionErrorMsg}
          </span>
          <button
            type="button"
            onClick={() => setActionErrorMsg(null)}
            className="text-white/60 hover:text-white"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Local Unpublished Drafts (migráveis para o Firestore) */}
      {localDrafts.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-200">
              Rascunhos locais não publicados ({localDrafts.length})
            </span>
            <span className="text-[11px] text-amber-200/70">
              Visível apenas neste navegador até publicar
            </span>
          </div>
          <div className="space-y-2.5">
            {localDrafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-xl border border-amber-500/20 bg-[#070709]/80 p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-white">
                      {draft.userName}
                    </span>
                    <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      Rascunho local
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={publishingDraftId === draft.id}
                      onClick={() => handlePublishLocalDraft(draft)}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--yomi-accent)] px-3 py-1 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      {publishingDraftId === draft.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Publicar agora
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscardLocalDraft(draft.id)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-rose-500/40 hover:text-rose-300"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-white/80 whitespace-pre-line">
                  {draft.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remote Comments List */}
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
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-6 text-center space-y-3">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-400" />
          <p className="text-xs font-medium text-white/85">
            Não foi possível carregar os comentários deste conteúdo no momento.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--yomi-accent)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/45">
          Nenhum comentário publicado ainda. Seja o primeiro a comentar.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const likedByMe = user ? comment.likedBy.includes(user.uid) : false;
            const isAuthor = Boolean(user && comment.userId === user.uid);
            const isLikePending = Boolean(pendingLikeIds[comment.id]);
            const isDeletePending = Boolean(pendingDeleteIds[comment.id]);
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
                      equipment={EMPTY_EQUIPMENT}
                      seed={comment.userName}
                      mascotName={comment.userName}
                      accentColor={comment.mascotColorId}
                      expression={comment.mascotExpressionId || 'happy'}
                      shape={comment.mascotShapeId || 'auto'}
                      size={40}
                      followPointer={false}
                      interactiveCycle={false}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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
                      disabled={isDeletePending}
                      onClick={() => handleDelete(comment)}
                      aria-label="Excluir comentário"
                      className="rounded-lg p-1.5 text-white/40 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
                    >
                      {isDeletePending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
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
                  <p className="text-sm leading-relaxed text-white/85 whitespace-pre-line break-words">
                    {comment.text}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isLikePending}
                    onClick={() => handleLike(comment)}
                    aria-pressed={likedByMe}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
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

          {hasMorePages && (
            <div className="pt-2 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2 text-xs font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-50"
              >
                {loadingMore && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {loadingMore
                  ? 'Carregando comentários...'
                  : 'Carregar mais comentários'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
