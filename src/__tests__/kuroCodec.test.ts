import { describe, it, expect } from "vitest";
import {
  decodeKuroBackup,
  encodeKuroBackup,
  mergeHistoryIntoPayload,
  stripEphemeralCacheForCloud,
  summarizeBackup,
  buildKuroFilename,
  argbIntToHex,
  type YomiBackupV4,
} from "@/lib/backup/kuroCodec";
import { DEMO_BACKUP_OBJECT, getDemoCloudDocument } from "@/lib/firebase/demoFixture";
import { parseRawCloudDocData } from "@/lib/firebase/cloudSync";

describe("Codec e Validador de Backups .kuro (v4)", () => {
  it("decodifica tanto JSON puro quanto Base64 UTF-8 válido", () => {
    const jsonRaw = encodeKuroBackup(DEMO_BACKUP_OBJECT, false);
    const base64Raw = encodeKuroBackup(DEMO_BACKUP_OBJECT, true);

    const fromJson = decodeKuroBackup(jsonRaw);
    const fromBase64 = decodeKuroBackup(base64Raw);

    expect(fromJson.version).toBe(4);
    expect(fromBase64.version).toBe(4);
    expect(fromBase64.profile?.blobatarName).toBe("Kuro-chan");
    expect(Object.keys(fromBase64.favorites ?? {})).toHaveLength(3);
  });

  it("rejeita versões incompatíveis ou arquivos corrompidos", () => {
    expect(() => decodeKuroBackup("")).toThrow();
    expect(() => decodeKuroBackup("isto-nao-e-base64-nem-json!!!")).toThrow();
    expect(() =>
      decodeKuroBackup(JSON.stringify({ version: 99, favorites: {} }))
    ).toThrow(/incompatível/i);
    expect(() =>
      decodeKuroBackup(JSON.stringify({ version: 4, randomKeyOnly: true }))
    ).toThrow(/sem dados reconhecíveis/i);
  });

  it("preserva chaves desconhecidas e favoritos ao mesclar progresso do Quick Reader Web", () => {
    const base64Initial = encodeKuroBackup(DEMO_BACKUP_OBJECT, true);

    const { nextPayload, historyCount } = mergeHistoryIntoPayload(
      base64Initial,
      {
        manga: {
          id: "manga-novo-123",
          title: "Vagabond",
          source: "mangadex",
        },
        chapter: {
          id: "cap-45",
          chapterNumber: "45",
          title: "A Espada e a Alma",
          language: "PT-BR",
          pages: 22,
        },
        pageIndex: 21,
        completed: true,
        timestampIso: "2026-11-15T00:00:00.000Z",
      }
    );

    expect(historyCount).toBeGreaterThan(3);

    const after = decodeKuroBackup(nextPayload);
    // Verifica que chave legada desconhecida foi preservada
    expect(after.legacyCustomDeviceFlag).toBe("preserved-key-example");
    // Verifica que os 3 favoritos originais continuam intactos
    expect(Object.keys(after.favorites ?? {})).toHaveLength(3);
    // Verifica que o capítulo lido foi registrado no histórico
    expect(after.history?.["page_cap-45"]).toBe(21);
    expect(after.history?.["read_cap-45"]).toBe(true);

    const summary = summarizeBackup(after);
    expect(summary.favoritesCount).toBe(3);
    expect(summary.mascotName).toBe("Kuro-chan");
  });

  it("bloqueia leitura de documento na nuvem se userEmail divergir do usuário autenticado", () => {
    const docData = getDemoCloudDocument();
    expect(() =>
      parseRawCloudDocData(docData, "outro-usuario@gmail.com")
    ).toThrow(/outra conta de e-mail/i);

    const valid = parseRawCloudDocData(docData, "leitor@yomi.app");
    expect(valid.mascotName).toBe("Kuro-chan");
    expect(valid.favoritesCount).toBe(3);
  });

  it("formata nome de arquivo .kuro e cores ARGB corretamente", () => {
    const fixedDate = new Date("2026-11-14T12:00:00Z");
    expect(buildKuroFilename(fixedDate)).toMatch(/^yomi-backup-2026-11-1[34]\.kuro$/);
    expect(argbIntToHex(0xffff2a55)).toBe("#FF2A55");
  });

  it("remove caches efêmeros chapters_* preservando chapters_count_* e limita listas extensas em stripEphemeralCacheForCloud", () => {
    const bloated: YomiBackupV4 = {
      version: 4,
      favorites: {},
      history: {
        chapters_one_piece: [{ id: "cache-1" }],
        chapters_count_one_piece: 1130,
        read_cap_1: true,
        recent_reading_list: Array.from({ length: 45 }, (_, i) => ({
          manga: { id: `m-${i}`, title: `Manga ${i}` },
          chapter: { id: `c-${i}` },
        })),
        reading_events_log: Array.from({ length: 220 }, (_, i) => ({
          idx: i,
        })),
      },
    };

    const compacted = stripEphemeralCacheForCloud(bloated);
    const h = compacted.history!;

    expect(h.chapters_one_piece).toBeUndefined();
    expect(h.chapters_count_one_piece).toBe(1130);
    expect(h.read_cap_1).toBe(true);
    expect((h.recent_reading_list as unknown[]).length).toBe(30);
    expect((h.reading_events_log as Array<{ idx: number }>).length).toBe(150);
    expect((h.reading_events_log as Array<{ idx: number }>)[0].idx).toBe(70);
  });
});
