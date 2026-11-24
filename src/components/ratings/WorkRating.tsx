'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useYomiAuth } from '@/components/providers/AppProviders';
import { fetchMyRating, fetchWorkRating, saveWorkRating } from '@/lib/firebase/ratings';
import { cleanMangaDexId, isUuid } from '@/lib/mangadex/api';

export function WorkRating({ workId }: { workId: string }) {
  const { user, openAuthModal } = useYomiAuth();
  const queryClient = useQueryClient();
  const id = cleanMangaDexId(workId).toLowerCase();
  const valid = isUuid(id);
  const [preview, setPreview] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const summary = useQuery({ queryKey: ['work-rating', id], queryFn: () => fetchWorkRating(id), enabled: valid });
  const mine = useQuery({ queryKey: ['my-work-rating', id, user?.uid], queryFn: () => fetchMyRating(id, user!.uid), enabled: valid && Boolean(user) });
  const vote = async (score: number) => {
    if (!user) { openAuthModal('login'); return; }
    if (saving) return;
    setPreview(null);
    setSaving(true); setMessage(''); setFailed(false);
    try {
      await saveWorkRating(id, user.uid, score);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-rating', id] }),
        queryClient.invalidateQueries({ queryKey: ['my-work-rating', id, user.uid] }),
        queryClient.invalidateQueries({ queryKey: ['community-trending'] }),
      ]);
      setMessage('Avaliação salva.');
    } catch {
      setFailed(true);
      setMessage('Não foi possível salvar sua avaliação. Tente novamente.');
    } finally { setSaving(false); }
  };
  if (!valid) return null;
  const count = summary.data?.count ?? 0;
  const average = count > 0 ? (summary.data!.total / count).toFixed(1).replace('.', ',') : null;
  return (
    <section aria-label="Avaliação da comunidade" className="rounded-2xl border border-white/10 max-w-md bg-gradient-to-br from-amber-300/[0.07] to-white/[0.025] px-2 py-4 sm:px-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white/90">Avaliação da comunidade</span>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs tabular-nums text-white/75" aria-live="polite">
          {summary.isPending ? 'Carregando notas…' : summary.isError ? 'Notas indisponíveis' : average ? `${average} / 5 · ${count} ${count === 1 ? 'avaliação' : 'avaliações'}` : 'Seja o primeiro a avaliar'}
        </span>
      </div>
      <div role="group" aria-label="Sua nota" aria-busy={saving} onMouseLeave={() => setPreview(null)} className="flex flex-wrap items-center gap-y-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button key={score} type="button" aria-label={`Avaliar com ${score} ${score === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={mine.data === score}
            disabled={saving || Boolean(user && (mine.isPending || mine.isError))}
            onMouseEnter={() => setPreview(score)} onFocus={() => setPreview(score)} onBlur={() => setPreview(null)}
            onClick={() => void vote(score)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-amber-300 transition hover:bg-amber-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yomi-accent)] disabled:opacity-40">
            <Star aria-hidden="true" className="h-6 w-6" fill={(preview ?? mine.data ?? 0) >= score ? 'currentColor' : 'none'} />
          </button>
        ))}
        <span className="basis-full text-xs text-white/65">{saving ? 'Salvando…' : user ? mine.data ? `Sua nota: ${mine.data} / 5` : 'Toque em uma estrela para avaliar' : 'Entre para avaliar'}</span>
      </div>
      {summary.isError && <button type="button" onClick={() => void summary.refetch()} className="text-xs text-white/65 underline">Recarregar notas</button>}
      {mine.isError && user && <button type="button" onClick={() => void mine.refetch()} className="text-xs text-white/65 underline">Recarregar sua avaliação</button>}
      {message && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-xs text-rose-400' : 'text-xs text-white/65'}>{message}</p>}
    </section>
  );
}
