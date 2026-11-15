import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReaderMode = 'webtoon' | 'paged-rtl' | 'paged-ltr';
export type YomiThemePreset = 'crimson' | 'violet' | 'cyan' | 'emerald';

export const THEME_PRESETS: Record<
  YomiThemePreset,
  {
    name: string;
    primary: string;
    secondary: string;
    glow: string;
  }
> = {
  crimson: {
    name: 'Vermelho Carmesim',
    primary: '#FF2A55',
    secondary: '#A11743',
    glow: 'rgba(255, 42, 85, 0.24)',
  },
  violet: {
    name: 'Roxo Nebulosa',
    primary: '#8B5CF6',
    secondary: '#6518BA',
    glow: 'rgba(139, 92, 246, 0.24)',
  },
  cyan: {
    name: 'Azul Noturno',
    primary: '#06B6D4',
    secondary: '#0954C8',
    glow: 'rgba(6, 182, 212, 0.24)',
  },
  emerald: {
    name: 'Verde Esmeralda',
    primary: '#10B981',
    secondary: '#078052',
    glow: 'rgba(16, 185, 129, 0.24)',
  },
};

interface ReaderPreferencesState {
  readerMode: ReaderMode;
  dataSaver: boolean;
  themePreset: YomiThemePreset;
  setReaderMode: (mode: ReaderMode) => void;
  setDataSaver: (enabled: boolean) => void;
  setThemePreset: (preset: YomiThemePreset) => void;
  resetPreferences: () => void;
}

export const useReaderStore = create<ReaderPreferencesState>()(
  persist(
    (set) => ({
      readerMode: 'webtoon',
      dataSaver: false,
      themePreset: 'crimson',
      setReaderMode: (readerMode) => set({ readerMode }),
      setDataSaver: (dataSaver) => set({ dataSaver }),
      setThemePreset: (themePreset) => set({ themePreset }),
      resetPreferences: () =>
        set({
          readerMode: 'webtoon',
          dataSaver: false,
          themePreset: 'crimson',
        }),
    }),
    {
      name: 'yomi-reader-preferences',
    }
  )
);
