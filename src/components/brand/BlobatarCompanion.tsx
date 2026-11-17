'use client';

import React, { useEffect, useState } from 'react';
import { YomiBloubCompanion } from './bloub/YomiBloubCompanion';
import type { MascotContext } from './bloub/yomi-renderer';
import type { Equipment } from './bloub/cosmetics';
import {
  idle,
  happy,
  sad,
  mad,
  surprised,
  wink,
  sleepy,
  smug,
  unsure,
  scared,
  love,
  shy,
  sick,
  thinking,
  type Expression,
} from 'blobatar/expression';
import { cn } from '@/lib/utils';
import { useReaderStore, type YomiThemePreset } from '@/lib/store/readerStore';

const THEME_HUE_MAP: Record<YomiThemePreset, number> = {
  crimson: 348,
  violet: 265,
  cyan: 190,
  emerald: 156,
};

function hexToHue(hex?: string): number | undefined {
  if (!hex || !hex.startsWith('#')) return undefined;
  const clean = hex.slice(1);
  if (clean.length !== 6) return undefined;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return undefined;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

export const BLOBATAR_SHAPES: Array<{
  id: string;
  label: string;
  traitAt?: number;
}> = [
  { id: 'auto', label: 'Automático' },
  { id: 'round', label: 'Redondo', traitAt: 0.11 },
  { id: 'organic', label: 'Orgânico', traitAt: 0.35 },
  { id: 'boxy', label: 'Bloco', traitAt: 0.54 },
  { id: 'capsule', label: 'Cápsula', traitAt: 0.65 },
  { id: 'nub', label: 'Broto', traitAt: 0.745 },
  { id: 'cloud', label: 'Nuvem', traitAt: 0.825 },
  { id: 'droplet', label: 'Gota', traitAt: 0.888 },
  { id: 'hexagon', label: 'Hexágono', traitAt: 0.933 },
  { id: 'sun', label: 'Sol', traitAt: 0.965 },
  { id: 'triangle', label: 'Triângulo', traitAt: 0.99 },
];

export const BLOBATAR_EXPRESSIONS: Array<{
  id: string;
  label: string;
  expr: Expression;
}> = [
  { id: 'happy', label: 'Feliz', expr: happy },
  { id: 'idle', label: 'Calmo', expr: idle },
  { id: 'love', label: 'Apaixonado', expr: love },
  { id: 'wink', label: 'Piscando', expr: wink },
  { id: 'smug', label: 'Confiante', expr: smug },
  { id: 'surprised', label: 'Surpreso', expr: surprised },
  { id: 'thinking', label: 'Pensando', expr: thinking },
  { id: 'shy', label: 'Tímido', expr: shy },
  { id: 'sleepy', label: 'Sonolento', expr: sleepy },
  { id: 'sad', label: 'Triste', expr: sad },
  { id: 'mad', label: 'Bravo', expr: mad },
  { id: 'unsure', label: 'Curioso', expr: unsure },
  { id: 'scared', label: 'Assustado', expr: scared },
  { id: 'sick', label: 'Tonto', expr: sick },
];

export interface BlobatarCompanionProps {
  name?: string;
  mascotName?: string;
  seed?: string;
  hue?: number;
  accentColor?: string;
  shape?: string;
  background?: boolean | 'circle' | 'square' | 'squircle';
  darkContainer?: boolean;
  chaptersRead?: number;
  expression?: string;
  size?: number | 'sm' | 'md' | 'lg';
  followPointer?: boolean;
  interactiveCycle?: boolean;
  className?: string;
  context?: MascotContext;
  animated?: boolean;
  loading?: boolean;
  equipment?: Equipment;
}

/** Compatibility wrapper: saved Blobatar preferences keep their existing IDs. */
export function BlobatarCompanion({name,mascotName,hue,accentColor,shape='auto',background='squircle',darkContainer,expression='happy',size=76,followPointer=true,interactiveCycle=true,className,context,animated=true,loading=false,equipment}:BlobatarCompanionProps) {
  const [cycleOffset,setCycleOffset]=useState<number|null>(null);
  const themePreset=useReaderStore(s=>s.themePreset);
  const displayName=mascotName||name||'Kuro';
  const effectiveHue=hue??hexToHue(accentColor)??(themePreset==='crimson'?undefined:THEME_HUE_MAP[themePreset]);
  const pixelSize=typeof size==='number'?size:size==='sm'?64:size==='lg'?112:80;
  const framed=darkContainer??(background==='squircle'||background===true);
  const ids:Record<string,string>={idle:'neutre',happy:'heureux',love:'heureux',wink:'heureux',smug:'fier',surprised:'surpris',thinking:'attentif',shy:'timide',sleepy:'somnolent',sad:'triste',mad:'colere',unsure:'curieux',scared:'effraye',sick:'confus'};
  const shapes:Record<string,string>={auto:'cercle',round:'cercle',organic:'galet',boxy:'squircle',capsule:'capsule',nub:'goutte',cloud:'nuage',droplet:'goutte',hexagon:'hexagone',sun:'cercle',triangle:'triangle'};
  const selected=cycleOffset===null?expression:BLOBATAR_EXPRESSIONS[cycleOffset%BLOBATAR_EXPRESSIONS.length].id;
  useEffect(()=>setCycleOffset(null),[expression]);
  const tap=()=>{if(interactiveCycle)setCycleOffset(prev=>((prev??Math.max(0,BLOBATAR_EXPRESSIONS.findIndex(e=>e.id===expression)))+1)%BLOBATAR_EXPRESSIONS.length);};
  return <div onClick={tap} role={interactiveCycle?'button':undefined} tabIndex={interactiveCycle?0:undefined}
    onKeyDown={e=>{if(interactiveCycle&&(e.key==='Enter'||e.key===' ')){e.preventDefault();tap();}}}
    aria-label={`Mascote ${displayName}${interactiveCycle?' — toque para interagir':''}`} title={displayName}
    className={cn('relative inline-flex items-center justify-center rounded-3xl',framed&&'border border-white/12 bg-[#101529]',interactiveCycle&&'cursor-pointer',className)}
    style={{width:pixelSize,height:pixelSize}}>
      <YomiBloubCompanion size={pixelSize} shape={shapes[shape]??'cercle'} expression={ids[selected]??'attentif'} hue={effectiveHue} equipment={equipment}
        follow={followPointer&&pixelSize>=64} paused={!animated||pixelSize<48} loading={loading}
        context={context??(pixelSize>=74?'profile':'reader')} label={`Mascote ${displayName}`} />
  </div>;
}
