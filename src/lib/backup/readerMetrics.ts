import type { YomiBackupV4, YomiMangaEntry } from '@/lib/backup/kuroCodec';

type Event = { changedAt?: string; mangaId?: string; readAt?: string; pages?: number; number?: string; mangaMap?: YomiMangaEntry };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function isManga(value: unknown): value is YomiMangaEntry {
  return record(value) && typeof value.id === 'string' && typeof value.title === 'string';
}
function dayIndex(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function calculateReaderMetrics(backup: YomiBackupV4, now = new Date()) {
  const history = backup.history ?? {};
  const works = new Map<string, YomiMangaEntry>();
  const blocked = new Set<string>();
  const started = new Set<string>();
  const completed = new Set<string>();
  const chaptersByWork = new Map<string, Set<string>>();
  function add(work: unknown) {
    if (!isManga(work)) return;
    if (work.isNsfw) blocked.add(work.id);
    else works.set(work.id, work);
  }

  for (const work of Object.values(backup.favorites ?? {})) add(work);
  const favorites = works.size;
  const lists = backup.settings?.user_reading_lists;
  if (Array.isArray(lists)) for (const list of lists) {
    if (Array.isArray(list?.mangas)) list.mangas.forEach(add);
  }
  if (Array.isArray(history.recent_reading_list)) {
    for (const item of history.recent_reading_list) {
      if (!record(item) || !isManga(item.manga)) continue;
      add(item.manga);
      if (!item.manga.isNsfw) started.add(item.manga.id);
    }
  }
  const events = new Map<string, Event>();
  if (Array.isArray(history.reading_events_log)) for (const event of history.reading_events_log) {
    if (!record(event) || !isManga(event.mangaMap)) continue;
    const chapter = record(event.chapterMap) ? event.chapterMap : {};
    const id = event.chapterId ?? chapter.id;
    if (typeof id !== 'string' || events.has(id)) continue;
    add(event.mangaMap);
    events.set(id, { ...event, mangaId: event.mangaMap.id, number: String(chapter.chapterNumber ?? '') } as Event);
  }

  const ids = new Set(events.keys());
  for (const [key, value] of Object.entries(history)) {
    if (key.startsWith('read_')) ids.add(key.slice(5));
    if (key.startsWith('manga_meta_') && isManga(value) && history['last_' + value.id]) {
      add(value);
      if (!value.isNsfw) started.add(value.id);
    }
    if (key.startsWith('reading_metric_') && record(value) && typeof value.changedAt === 'string') {
      const id = key.slice('reading_metric_'.length);
      ids.add(id);
      events.set(id, value as Event);
    }
  }

  const days = new Set<number>();
  const top = new Map<string, number>();
  const genres = new Map<string, number>();
  let chapters = 0, seconds = 0, monthlyChapters = 0, monthlySeconds = 0, streak = 0;
  for (const id of ids) {
    const event = events.get(id);
    const flag = history['read_' + id];
    if (event?.changedAt ? !event.readAt : flag === false || (!event && flag !== true)) continue;
    const workId = typeof event?.mangaId === 'string' ? event.mangaId : '';
    if (blocked.has(workId)) continue;
    const work = works.get(workId);
    const duration = Number.isInteger(event?.pages) && event!.pages! > 0 ? event!.pages! * 20 : 300;
    chapters++;
    seconds += duration;
    if (work) {
      started.add(workId);
      const items = chaptersByWork.get(workId) ?? new Set<string>();
      const number = event?.number;
      items.add(number && Number.isFinite(Number(number)) ? String(Number(number)) : number || id);
      chaptersByWork.set(workId, items);
    }
    const date = new Date(event?.readAt ?? '');
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const day = dayIndex(now) - dayIndex(date);
    if (day < 0 || day >= 30) continue;
    days.add(day);
    monthlyChapters++;
    monthlySeconds += duration;
    if (!work) continue;
    top.set(workId, (top.get(workId) ?? 0) + 1);
    const workGenres = Array.isArray(work.readingGenres) ? work.readingGenres : work.tags;
    for (const tag of new Set(workGenres?.filter((t): t is string => typeof t === 'string').map((t) => t.trim()))) {
      if (tag) genres.set(tag, (genres.get(tag) ?? 0) + 1);
    }
  }
  for (const id of started) {
    const cached = history['chapters_count_' + id];
    const total = typeof cached === 'number' && cached > 0
      ? cached : works.get(id)?.availableChaptersCount ?? 0;
    if (total > 0 && (chaptersByWork.get(id)?.size ?? 0) >= total) completed.add(id);
  }
  for (let day = days.has(0) ? 0 : 1; days.has(day); day++) streak++;
  const rank = (counts: Map<string, number>) =>
    [...counts].sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0)).slice(0, 3);
  return {
    chapters, minutes: Math.round(seconds / 60), library: works.size, favorites,
    reading: started.size - completed.size, completed: completed.size,
    monthlyChapters, monthlyMinutes: Math.round(monthlySeconds / 60), streak,
    top: rank(top).map(([id, count]) => ({ work: works.get(id)!, count })),
    genres: rank(genres).map(([genre]) => genre),
  };
}
export type ReaderMetrics = ReturnType<typeof calculateReaderMetrics>;
