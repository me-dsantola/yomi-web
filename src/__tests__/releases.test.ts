import { describe, it, expect } from "vitest";
import {
  getLatestRelease,
  getLatestReleaseSafe,
  fetchLatestYomiRelease,
  FALLBACK_URL,
} from "@/lib/github/releases";

const MOCK_RELEASE_JSON = {
  version: "1.2.8",
  build: 16,
  commit: "a8b6e3d",
  applicationId: "com.kuroreader.kuro_reader",
  apks: [
    {
      file: "YOMI-1.2.8-arm64-v8a.apk",
      abi: "arm64-v8a",
      androidVersionCode: 2016,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    {
      file: "YOMI-1.2.8-armeabi-v7a.apk",
      abi: "armeabi-v7a",
      androidVersionCode: 1016,
      sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
    {
      file: "YOMI-1.2.8-x86_64.apk",
      abi: "x86_64",
      androidVersionCode: 3016,
      sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
  ],
};

const MOCK_GITHUB_RELEASE = {
  tag_name: "v1.2.8",
  name: "YOMI v1.2.8",
  published_at: "2026-11-14T20:00:00Z",
  body: "## Novidades\n- Destaques ampliados\n- Rolagem suave a 120Hz",
  html_url: "https://github.com/me-dsantola/kuro-reader/releases/tag/v1.2.8",
  assets: [
    {
      name: "YOMI-1.2.8-arm64-v8a.apk",
      browser_download_url:
        "https://github.com/me-dsantola/kuro-reader/releases/download/v1.2.8/YOMI-1.2.8-arm64-v8a.apk",
      size: 55574528,
    },
    {
      name: "YOMI-1.2.8-armeabi-v7a.apk",
      browser_download_url:
        "https://github.com/me-dsantola/kuro-reader/releases/download/v1.2.8/YOMI-1.2.8-armeabi-v7a.apk",
      size: 53477376,
    },
    {
      name: "YOMI-1.2.8-x86_64.apk",
      browser_download_url:
        "https://github.com/me-dsantola/kuro-reader/releases/download/v1.2.8/YOMI-1.2.8-x86_64.apk",
      size: 57671680,
    },
    {
      name: "release.json",
      browser_download_url:
        "https://github.com/me-dsantola/kuro-reader/releases/download/v1.2.8/release.json",
      size: 812,
    },
  ],
};

describe("GitHub Releases & release.json Parser", () => {
  it("mapeia os 3 APKs por arquitetura e cruza com release.json sem inventar APK universal", async () => {
    const fakeFetch = (async (url: string) => {
      if (url.endsWith("/releases/latest")) {
        return new Response(JSON.stringify(MOCK_GITHUB_RELEASE), {
          status: 200,
        });
      }
      if (url.endsWith("release.json")) {
        return new Response(JSON.stringify(MOCK_RELEASE_JSON), {
          status: 200,
        });
      }
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const release = await getLatestRelease(fakeFetch);
    expect(release.version).toBe("1.2.8");
    expect(release.build).toBe(16);
    expect(release.apks).toHaveLength(3);
    expect(release.apks.map((a) => a.abi)).toEqual([
      "arm64-v8a",
      "armeabi-v7a",
      "x86_64",
    ]);
    expect(release.recommended?.abi).toBe("arm64-v8a");
    expect(release.recommended?.sha256).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );

    const mapped = await fetchLatestYomiRelease(fakeFetch);
    expect(mapped.tagName).toBe("v1.2.8");
    expect(mapped.assets["arm64-v8a"]?.sha256).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect((mapped.assets as Record<string, unknown>)["universal"]).toBeUndefined();
  });

  it("retorna fallback funcional quando a API do GitHub falha (rate-limit ou offline)", async () => {
    const failingFetch = (async () => {
      return new Response("Rate limit exceeded", { status: 403 });
    }) as typeof fetch;

    const safe = await getLatestReleaseSafe(failingFetch);
    expect(safe.isFallback).toBe(true);
    expect(safe.fallbackUrl).toBe(FALLBACK_URL);
    expect(safe.apks).toHaveLength(3);
  });
});
