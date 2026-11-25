'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';
import { resolveMangaEntryCoverUrl } from '@/lib/mangadex/api';
import type { ReaderMetrics } from '@/lib/backup/readerMetrics';
import type { YomiProfile } from '@/lib/backup/kuroCodec';

type Props = {
  metrics: ReaderMetrics; profile: YomiProfile; avatar?: string | null;
  name: string; rank: string; accent: string;
};

async function loadImage(src?: string | null) {
  if (!src) return null;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = src;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      image.decode().then(() => image, () => null),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 3500); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function createImage(props: Props, story: boolean, mascot: SVGSVGElement) {
  const { metrics, name, rank, accent, avatar } = props;
  const canvas = document.createElement('canvas');
  const width = 360, height = story ? 640 : 360;
  canvas.width = width * 3;
  canvas.height = height * 3;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
  const svg = mascot.cloneNode(true) as SVGSVGElement;
  svg.removeAttribute('style');
  svg.setAttribute('width', '540');
  svg.setAttribute('height', '540');
  const mascotUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const [kuro, photo, ...covers] = await Promise.all([
      loadImage(mascotUrl), loadImage(avatar),
      ...metrics.top.map(({work}) => loadImage(resolveMangaEntryCoverUrl(work))),
    ]);
    if (!kuro) throw new Error('Não foi possível renderizar o mascote. Tente novamente.');
    ctx.scale(3, 3);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#111124');
    gradient.addColorStop(1, /^#[0-9a-f]{6}$/i.test(accent) ? accent + '77' : '#6c244b');
    ctx.fillStyle = '#0B0B15';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const label = (text: string, x: number, y: number, size: number, max: number, weight = 500, color = '#FFFFFF') => {
      ctx.font = weight + ' ' + size + 'px system-ui';
      ctx.fillStyle = color;
      const chars = Array.from(text);
      let count = chars.length;
      while (count > 0 && ctx.measureText(chars.slice(0, count).join('') + (count < chars.length ? '…' : '')).width > max) count--;
      ctx.fillText(chars.slice(0, count).join('') + (count < chars.length ? '…' : ''), x, y);
    };
    const crop = (img: HTMLImageElement | null, x: number, y: number, w: number, h: number, radius: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.clip();
      ctx.fillStyle = '#292238';
      ctx.fillRect(x, y, w, h);
      if (img) {
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
        ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
      }
      ctx.restore();
    };

    label('YOMI READER', 20, 25, 10, 140, 800, '#E3D5EF');
    label('Resumo de leitura', 20, 54, 23, 250, 800);
    label('Últimos 30 dias', 20, 72, 11, 160, 500, '#E3D5EF');
    crop(photo ?? kuro, 20, 82, 29, 29, 15);
    label(name, 56, 94, 13, 185, 800);
    label(rank, 56, 109, 9, 186, 600, '#E3D5EF');
    const mascotSize = story ? 162 : 112;
    ctx.drawImage(kuro, story ? 178 : 228, story ? 60 : 15, mascotSize, mascotSize);

    const baseline = story ? 246 : 146;
    [[metrics.monthlyChapters, 'Capítulos'], [metrics.monthlyMinutes, 'Minutos estimados'], [metrics.streak, 'Dias seguidos']].forEach(([value, title], index) => {
      const x = 20 + index * 111;
      label(String(value), x, baseline, 24, 104, 800);
      label(String(title), x, baseline + 17, 10, 104, 600, '#E3D5EF');
    });
    const genreY = baseline + 42;
    label(metrics.genres.length ? metrics.genres.join(' · ') : 'Sem gêneros registrados', 20, genreY, 12, 320, 650);
    label('Mais lidas', 20, genreY + 25, 14, 320, 800);
    if (!metrics.top.length) label('Sem capítulos com obra identificada no período.', 20, genreY + 48, 11, 320);
    metrics.top.forEach(({work, count}, index) => {
      const x = 20 + 110 * index, y = genreY + 34;
      crop(covers[index], x, y, story ? 100 : 38, story ? 138 : 49, 5);
      label(work.title, x, y + (story ? 156 : 65), 11, 100, 750);
      label(count + (count === 1 ? ' capítulo' : ' capítulos'), x, y + (story ? 172 : 79), 10, 100, 500, '#E3D5EF');
    });
    label('yomi-reader.vercel.app', 20, height - 15, 10, 320, 700, '#E3D5EF');
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao gerar o PNG.')), 'image/png'));
  } finally {
    URL.revokeObjectURL(mascotUrl);
  }
}

export function ReaderMetricsSection(props: Props) {
  const {metrics, profile} = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const mascot = useRef<HTMLDivElement>(null);
  const [story, setStory] = useState(true);
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState<{blob: Blob; url: string; story: boolean}>();
  const [error, setError] = useState('');
  const {metrics: snapshot, name, rank, accent, avatar} = props;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | undefined;
    let frame = 0;
    const deadline = performance.now() + 4000;
    function prepare() {
      const svg = mascot.current?.querySelector('svg');
      if (!svg || !svg.querySelector('defs')) {
        if (performance.now() < deadline) frame = requestAnimationFrame(prepare);
        else setError('Não foi possível preparar o mascote. Feche a prévia e tente novamente.');
        return;
      }
      void createImage({metrics: snapshot, profile, name, rank, accent, avatar}, story, svg).then(blob => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setAsset({blob, url, story});
        }
      }).catch(error => { if (!cancelled) setError(String(error.message)); });
    }
    frame = requestAnimationFrame(prepare);
    return () => { cancelled = true; cancelAnimationFrame(frame); if (url) URL.revokeObjectURL(url); };
  }, [open, story, snapshot, profile, name, rank, accent, avatar]);

  function openPreview() {
    setAsset(undefined);
    setError('');
    setOpen(true);
    dialog.current?.showModal();
  }

  const fileName = story ? 'yomi-resumo-stories.png' : 'yomi-resumo-feed.png';
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-[#0E0E14] p-5 sm:p-7">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">Métricas do Leitor</h2>
      <button type="button" onClick={openPreview} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black"><Share2 size={16}/> Compartilhar Resumo Mensal</button>
    </header>
    <h3 className="text-sm font-semibold text-white/70">Todo o histórico</h3>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[[metrics.chapters,'Capítulos lidos'],[metrics.minutes,'Minutos estimados'],[metrics.library,'Obras na biblioteca'],[metrics.reading,'Lendo'],[metrics.completed,'Concluídas'],[metrics.favorites,'Favoritas']].map(([value,label]) =>
        <div key={label} className="rounded-xl bg-white/5 p-3"><dt className="text-xs text-white/65">{label}</dt><dd className="text-xl font-bold">{value}</dd></div>)}
    </dl>
    <h3 className="text-sm font-semibold text-white/70">Últimos 30 dias</h3>
    <p className="text-sm">{metrics.monthlyChapters} capítulos · {metrics.monthlyMinutes} min estimados · {metrics.streak} dias seguidos</p>
    <p className="text-sm text-white/70">{metrics.genres.length ? metrics.genres.join(' · ') : 'Sem gêneros registrados no período.'}</p>
    {metrics.top.length > 0 && <ol aria-label="Obras mais lidas" className="grid gap-3 sm:grid-cols-3">{metrics.top.map(({work,count}) =>
      <li key={work.id} className="flex items-center gap-2 text-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" loading="lazy" className="h-12 w-9 rounded object-cover" src={resolveMangaEntryCoverUrl(work)} />
        <div><div className="line-clamp-2">{work.title}</div><small className="text-white/65">{count} {count === 1 ? 'capítulo' : 'capítulos'}</small></div>
      </li>)}</ol>}
    <p className="text-xs text-white/60">Estimativa de 20 segundos por página ou 5 minutos por capítulo sem número de páginas.</p>
    <dialog ref={dialog} onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[92dvh] w-[min(94vw,480px)] rounded-2xl border border-white/15 bg-[#12121C] p-5 text-white backdrop:bg-black/75">
      <header className="flex items-center justify-between gap-2"><h2 className="font-bold">Resumo Mensal</h2><form method="dialog"><button className="p-2">Fechar</button></form></header>
      <div className="my-3 flex gap-2">{[[true,'Stories 9:16'],[false,'Feed 1:1']].map(([value,label]) =>
        <button key={String(label)} type="button" aria-pressed={story === value} className="rounded-full border border-white/25 px-3 py-1 aria-pressed:bg-white aria-pressed:text-black" onClick={() => {
          if (story !== value) { setError(''); setAsset(undefined); setStory(Boolean(value)); }
        }}>{label}</button>)}</div>
      {open && <div ref={mascot} className="pointer-events-none absolute opacity-0" aria-hidden="true">
        <BlobatarCompanion size={160} accentColor={accent} hue={profile.blobatarHue} shape={profile.blobatarShape} expression={profile.blobatarExpression} mascotName={profile.blobatarName} background={false} animated={false} interactiveCycle={false} followPointer={false} />
      </div>}
      {asset?.story === story ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt="Prévia do resumo mensal" className="mx-auto max-h-[57dvh] max-w-full rounded-lg object-contain" />
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href={asset.url} download={fileName} className="rounded-full bg-white px-3 py-2 font-semibold text-black">Baixar PNG</a>
          {typeof navigator !== 'undefined' && navigator.canShare?.({files:[new File([asset.blob], fileName, {type:'image/png'})]}) &&
            <button type="button" onClick={() => void navigator.share({files:[new File([asset.blob], fileName, {type:'image/png'})]}).catch(e => { if (e.name !== 'AbortError') setError('Não foi possível compartilhar. Baixe o PNG para tentar novamente.'); })}>Compartilhar imagem</button>}
        </div>
      </> : !error && <p role="status">Preparando imagem…</p>}
      {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
    </dialog>
  </section>;
}
