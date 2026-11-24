export interface MangaDexWork {
  id: string;
  title: string;
  altTitle?: string;
  altTitles?: string[];
  description: string;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | string;
  year?: number | null;
  contentRating: 'safe' | 'suggestive' | 'erotica' | 'pornographic' | string;
  tags: Array<{ id: string; name: string }>;
  author: string;
  artist: string;
  coverFileName?: string;
  coverUrl: string;
  coverHighResUrl: string;
  accentColor?: string;
  featuredChapterLabel?: string;
  hasAvailableChapters?: boolean;
  availableChaptersCount?: number;
  translatedLanguages?: string[];
}

export interface MangaDexChapter {
  id: string;
  chapterNumber: string;
  title: string;
  volume?: string | null;
  language: string;
  pages: number;
  publishAt: string;
  scanlationGroup: string;
  externalUrl?: string | null;
  isSpecial?: boolean;
  canonicalKey?: string;
}

export interface MangaDexChaptersResult {
  chapters: MangaDexChapter[];
  languagesUsed: string[];
  hasLanguageFallback: boolean;
  usedSpanishFallback: boolean;
  totalFeedRecords: number;
  partialFailureLanguages: string[];
}

export interface MangaDexChapterPages {
  chapterId: string;
  baseUrl: string;
  hash: string;
  data: string[];
  dataSaver: string[];
}

export const POPULAR_MANGADEX_TAGS: Array<{ id: string; label: string }> = [
  { id: '391b0423-d847-456f-aff0-8b0cfc03066b', label: 'Ação' },
  { id: '87cc87cd-a395-47af-b27a-93258283bbc6', label: 'Aventura' },
  { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', label: 'Fantasia' },
  { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', label: 'Romance' },
  { id: 'ace04997-f6bd-436e-b261-779182193d3d', label: 'Isekai' },
  { id: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', label: 'Sobrenatural' },
  { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', label: 'Comédia' },
  { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', label: 'Drama' },
  { id: 'ee968100-4191-4968-93d3-f82d72be7e46', label: 'Mistério' },
  { id: '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d', label: 'Webtoon' },
];
