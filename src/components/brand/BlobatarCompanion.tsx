'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Blobatar } from 'blobatar/react';
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
import { gaze } from 'blobatar/gaze';
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

function resolveExpressionObject(id?: string): Expression {
  const found = BLOBATAR_EXPRESSIONS.find((e) => e.id === id);
  return found ? found.expr : happy;
}

function resolveShapeTrait(shape?: string): Record<string, number> | undefined {
  if (!shape || shape === 'auto') return undefined;
  const found = BLOBATAR_SHAPES.find((s) => s.id === shape);
  return found?.traitAt !== undefined ? { shape: found.traitAt } : undefined;
}

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
}

/**
 * Mascote interativo oficial do YOMI alimentado pelo motor geométrico `blobatar`.
 * Sincroniza sua paleta com o tema ativo do portal, aceita troca de expressões e acompanha o ponteiro.
 */
export function BlobatarCompanion({
  name,
  mascotName,
  seed,
  hue,
  accentColor,
  shape = 'auto',
  background = 'squircle',
  darkContainer,
  expression = 'happy',
  size = 76,
  followPointer = true,
  interactiveCycle = true,
  className,
}: BlobatarCompanionProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [cycleOffset, setCycleOffset] = useState<number | null>(null);
  const themePreset = useReaderStore((s) => s.themePreset);

  const effectiveSeed = (seed || mascotName || name || 'yomi-reader').trim();
  const displayName = mascotName || name || 'Yomi';
  const effectiveHue =
    hue ?? hexToHue(accentColor) ?? THEME_HUE_MAP[themePreset] ?? 348;

  const useDarkSquircle =
    darkContainer ?? (background === 'squircle' || background === true);

  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
        ? 64
        : size === 'lg'
          ? 112
          : 80;

  const baseIdx = Math.max(
    0,
    BLOBATAR_EXPRESSIONS.findIndex((e) => e.id === expression)
  );
  const activeExpr =
    cycleOffset !== null
      ? BLOBATAR_EXPRESSIONS[cycleOffset % BLOBATAR_EXPRESSIONS.length].expr
      : resolveExpressionObject(expression);

  useEffect(() => {
    setCycleOffset(null);
  }, [expression]);

  useEffect(() => {
    if (!followPointer || !svgRef.current) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const controller = gaze(svgRef.current, { target: 'pointer' });
    return () => {
      controller.stop();
    };
  }, [followPointer, effectiveSeed, shape, background, effectiveHue]);

  const handleTap = () => {
    if (!interactiveCycle) return;
    setCycleOffset((prev) => ((prev ?? baseIdx) + 1) % BLOBATAR_EXPRESSIONS.length);
  };

  return (
    <div
      onClick={handleTap}
      role={interactiveCycle ? 'button' : undefined}
      tabIndex={interactiveCycle ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactiveCycle && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleTap();
        }
      }}
      aria-label={`Mascote ${displayName}${interactiveCycle ? ' — clique para mudar a expressão' : ''}`}
      title={interactiveCycle ? `${displayName} (clique para interagir)` : displayName}
      className={cn(
        'relative inline-flex items-center justify-center rounded-3xl transition-transform duration-300',
        useDarkSquircle &&
          'border border-white/12 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
        interactiveCycle && 'cursor-pointer hover:scale-105 active:scale-95',
        className
      )}
      style={{
        width: pixelSize,
        height: pixelSize,
        ...(useDarkSquircle
          ? {
              background: `radial-gradient(circle at 25% 20%, hsla(${effectiveHue}, 82%, 52%, 0.24), #12121C 58%, #08080C 100%)`,
            }
          : {}),
      }}
    >
      <Blobatar
        ref={svgRef}
        name={effectiveSeed}
        size={useDarkSquircle ? Math.round(pixelSize * 0.86) : pixelSize}
        background={useDarkSquircle ? false : background}
        hue={effectiveHue}
        traits={resolveShapeTrait(shape)}
        animate="always"
        expression={activeExpr}
        title={displayName}
        className="overflow-visible select-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]"
      />
    </div>
  );
}
