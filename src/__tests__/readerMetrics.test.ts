import { describe, it, expect } from 'vitest';
import { calculateReaderMetrics } from '@/lib/backup/readerMetrics';
import { decodeKuroBackup, mergeHistoryIntoPayload } from '@/lib/backup/kuroCodec';

describe('reader metrics', () => {
  it('keeps the first completion date and ignores reopened chapters', () => {
    const manga = { id: 'work', title: 'Obra', tags: ['Ação'] };
    const chapter = { id: 'one', chapterNumber: '1', pages: 30 };
    const timestampIso = '2026-11-24T12:00:00Z';
    const first = mergeHistoryIntoPayload('{"version":4,"history":{}}', { manga, chapter, timestampIso, completed:true });
    const payload = mergeHistoryIntoPayload(first.nextPayload, { manga, chapter, timestampIso:'2026-11-25T12:00:00Z', completed:true });
    const backup = decodeKuroBackup(payload.nextPayload);
    expect(backup.history?.reading_metric_one).toMatchObject({readAt:timestampIso, pages:30});
    const metrics = calculateReaderMetrics(backup, new Date('2026-11-25T16:00:00Z'));
    expect(metrics).toMatchObject({ chapters:1, monthlyChapters:1, monthlyMinutes:10, streak:1,
      genres:['Ação'], top:[{work:manga, count:1}] });
  });

  it('uses legacy flags for all-time and removes a completion undone on another device', () => {
    const work = {id:'one', title:'Obra', availableChaptersCount:1};
    const metrics = calculateReaderMetrics({favorites:{one:work}, history:{
      reading_metric_ended:{changedAt:'2026-11-24T10:00:00Z',readAt:'2026-11-24T10:00:00Z',mangaId:'one',pages:15},
      reading_metric_undo:{changedAt:'2026-11-25T10:00:00Z'},
      read_legacy:true, read_undo:true,
    }}, new Date('2026-11-25T16:00:00Z'));
    expect(metrics).toMatchObject({chapters:2, minutes:10, monthlyChapters:1, streak:1, library:1, favorites:1, completed:1});
  });
});
