import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace('.', ',')} MB`;
}

export function formatDatePtBr(isoString: string | null | undefined): string {
  if (!isoString) return 'Data desconhecida';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Data desconhecida';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimePtBr(isoString: string | null | undefined): string {
  if (!isoString) return 'Nunca sincronizado';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Nunca sincronizado';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function argbIntToHex(argb: number | undefined | null, fallback = '#FF2A55'): string {
  if (typeof argb !== 'number' || !Number.isFinite(argb)) return fallback;
  const unsigned = argb >>> 0;
  const rgb = unsigned & 0xffffff;
  return `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`;
}
