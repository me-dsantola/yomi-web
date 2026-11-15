import { z } from 'zod';
import { formatBytes } from '@/lib/utils';

export const REPO = 'me-dsantola/kuro-reader';
export const FALLBACK_URL = `https://github.com/${REPO}/releases/latest`;
export const REPO_URL = `https://github.com/${REPO}`;

export const AssetSchema = z.object({
  name: z.string(),
  browser_download_url: z.string().url(),
  size: z.number(),
});

export const ReleaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable().optional(),
  published_at: z.string(),
  body: z.string().nullable(),
  html_url: z.string().url(),
  draft: z.boolean().optional(),
  prerelease: z.boolean().optional(),
  assets: z.array(AssetSchema),
});

export const ManifestSchema = z.object({
  version: z.string(),
  build: z.number(),
  commit: z.string().optional(),
  applicationId: z.string().optional(),
  certificateSha256: z.string().optional(),
  apks: z.array(
    z.object({
      file: z.string(),
      abi: z.string(),
      androidVersionCode: z.number().optional(),
      sha256: z.string(),
    })
  ),
});

export type Abi = 'arm64-v8a' | 'armeabi-v7a' | 'x86_64';

export interface ApkInfo {
  abi: Abi;
  fileName: string;
  url: string;
  sizeBytes: number;
  sha256?: string;
  androidVersionCode?: number;
  description: string;
  badge?: string;
}

export interface LatestRelease {
  version: string;
  build?: number;
  publishedAt: string;
  notes: string;
  htmlUrl: string;
  certificateSha256?: string;
  apks: ApkInfo[];
  recommended?: ApkInfo;
  fallbackUrl: string;
  isFallback?: boolean;
}

export interface PreviousReleaseSummary {
  version: string;
  tagName: string;
  publishedAt: string;
  htmlUrl: string;
  notes: string;
  apks: Array<{ abi: Abi; url: string; sizeBytes: number; fileName: string }>;
}

export interface YomiReleaseAsset {
  abi: Abi;
  name: string;
  downloadUrl: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string | null;
}

export interface YomiReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  build: number;
  publishedAt: string;
  htmlUrl: string;
  bodyMarkdown: string;
  isFallback: boolean;
  assets: Partial<Record<Abi, YomiReleaseAsset>>;
}

const ABIS: Abi[] = ['arm64-v8a', 'armeabi-v7a', 'x86_64'];

const ABI_DESCRIPTIONS: Record<Abi, { description: string; badge?: string }> = {
  'arm64-v8a': {
    description: 'Recomendado — quase todos os celulares Android modernos (64 bits)',
    badge: 'Recomendado',
  },
  'armeabi-v7a': {
    description: 'Celulares Android antigos de 32 bits',
  },
  x86_64: {
    description: 'Emuladores no PC (WSA, BlueStacks, Android Studio) e Chromebooks',
  },
};

function getGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'YOMI-Web-Portal/1.2.10',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

const FALLBACK_SIZES: Record<Abi, number> = {
  'arm64-v8a': 56098816,
  'armeabi-v7a': 53687091,
  x86_64: 57671680,
};

/**
 * Busca a release mais recente no servidor, cruzando os assets do GitHub
 * com o manifesto oficial `release.json` para obter versão, build e SHA-256.
 * Nunca cria botão para APK universal inexistente.
 */
export async function getLatestRelease(
  customFetch: typeof fetch = fetch
): Promise<LatestRelease> {
  const res = await customFetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: getGitHubHeaders(),
    next: { revalidate: 60 },
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`GitHub ${res.status}`);
  }

  const release = ReleaseSchema.parse(await res.json());

  let manifest: z.infer<typeof ManifestSchema> | null = null;
  const manifestAsset = release.assets.find((a) => a.name === 'release.json');
  if (manifestAsset) {
    try {
      const m = await customFetch(manifestAsset.browser_download_url, {
        next: { revalidate: 60 },
      } as RequestInit);
      if (m.ok) {
        const parsed = ManifestSchema.safeParse(await m.json());
        manifest = parsed.success ? parsed.data : null;
      }
    } catch {
      manifest = null;
    }
  }

  const shaMap: Record<string, string> = {};
  if (!manifest) {
    const shaAsset = release.assets.find((a) => a.name === 'SHA256SUMS.txt');
    if (shaAsset) {
      try {
        const s = await customFetch(shaAsset.browser_download_url, {
          next: { revalidate: 60 },
        } as RequestInit);
        if (s.ok) {
          const text = await s.text();
          for (const line of text.split(/\r?\n/)) {
            const match = line.trim().match(/^([a-fA-F0-9]{64})\s+(.+)$/);
            if (match) {
              shaMap[match[2].trim()] = match[1].toLowerCase();
            }
          }
        }
      } catch {
        // Ignora falha opcional de SHA256SUMS.txt
      }
    }
  }

  const apks: ApkInfo[] = ABIS.flatMap((abi) => {
    const manifestEntry = manifest?.apks.find((x) => x.abi === abi);
    const asset = release.assets.find((a) =>
      manifestEntry ? a.name === manifestEntry.file : a.name.endsWith(`-${abi}.apk`)
    );
    if (!asset) return [];
    const sha256 = manifestEntry?.sha256 ?? shaMap[asset.name];
    return [
      {
        abi,
        fileName: asset.name,
        url: asset.browser_download_url,
        sizeBytes: asset.size,
        sha256,
        androidVersionCode: manifestEntry?.androidVersionCode,
        description: ABI_DESCRIPTIONS[abi].description,
        badge: ABI_DESCRIPTIONS[abi].badge,
      },
    ];
  });

  return {
    version: manifest?.version ?? release.tag_name.replace(/^v/, ''),
    build: manifest?.build,
    publishedAt: release.published_at,
    notes: release.body ?? '',
    htmlUrl: release.html_url,
    certificateSha256: manifest?.certificateSha256,
    apks,
    recommended: apks.find((a) => a.abi === 'arm64-v8a') ?? apks[0],
    fallbackUrl: FALLBACK_URL,
  };
}

/**
 * Busca o manifesto oficial `release.json` diretamente da URL estática da última release
 * no GitHub CDN (`/releases/latest/download/release.json`), evitando rate-limit da API REST.
 */
export async function getLatestReleaseFromDirectManifest(
  customFetch: typeof fetch = fetch
): Promise<LatestRelease> {
  const res = await customFetch(
    `https://github.com/${REPO}/releases/latest/download/release.json`,
    {
      next: { revalidate: 60 },
    } as RequestInit
  );

  if (!res.ok) {
    throw new Error(`Direct manifest HTTP ${res.status}`);
  }

  const manifest = ManifestSchema.parse(await res.json());
  const cleanVersion = manifest.version.replace(/^v/, '');
  const tagUrl = `https://github.com/${REPO}/releases/tag/v${cleanVersion}`;
  const lastModified = res.headers?.get?.('last-modified');
  const parsedDate = lastModified ? new Date(lastModified) : null;
  const publishedAt =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : '2026-11-15T00:00:00Z';

  const apks: ApkInfo[] = ABIS.flatMap((abi) => {
    const entry = manifest.apks.find((x) => x.abi === abi);
    if (!entry) return [];
    return [
      {
        abi,
        fileName: entry.file,
        url: `https://github.com/${REPO}/releases/download/v${cleanVersion}/${entry.file}`,
        sizeBytes: FALLBACK_SIZES[abi],
        sha256: entry.sha256,
        androidVersionCode: entry.androidVersionCode,
        description: ABI_DESCRIPTIONS[abi].description,
        badge: ABI_DESCRIPTIONS[abi].badge,
      },
    ];
  });

  return {
    version: cleanVersion,
    build: manifest.build,
    publishedAt,
    notes: `### YOMI v${cleanVersion}\nVersão oficial mais recente publicada no GitHub Releases. Confira os hashes SHA-256 verificados abaixo.`,
    htmlUrl: tagUrl,
    certificateSha256: manifest.certificateSha256,
    apks,
    recommended: apks.find((a) => a.abi === 'arm64-v8a') ?? apks[0],
    fallbackUrl: FALLBACK_URL,
  };
}

/**
 * Wrapper seguro que tenta primeiro a API do GitHub, depois o manifesto direto
 * no CDN e, só em último caso, retorna o fallback estático funcional.
 */
export async function getLatestReleaseSafe(
  customFetch: typeof fetch = fetch
): Promise<LatestRelease> {
  try {
    return await getLatestRelease(customFetch);
  } catch {
    try {
      return await getLatestReleaseFromDirectManifest(customFetch);
    } catch {
      return {
        version: '1.2.10',
        build: 18,
        publishedAt: '2026-11-15T18:30:00Z',
        notes:
          '### YOMI Estável v1.2.10\nComentários sincronizados entre Web e App, carregamento mais resiliente de capítulos/capas e paridade completa de catálogo.',
        htmlUrl: FALLBACK_URL,
        apks: [
          {
            abi: 'arm64-v8a',
            fileName: 'YOMI-1.2.10-arm64-v8a.apk',
            url: `https://github.com/${REPO}/releases/download/v1.2.10/YOMI-1.2.10-arm64-v8a.apk`,
            sizeBytes: 56098816,
            description: ABI_DESCRIPTIONS['arm64-v8a'].description,
            badge: ABI_DESCRIPTIONS['arm64-v8a'].badge,
          },
          {
            abi: 'armeabi-v7a',
            fileName: 'YOMI-1.2.10-armeabi-v7a.apk',
            url: `https://github.com/${REPO}/releases/download/v1.2.10/YOMI-1.2.10-armeabi-v7a.apk`,
            sizeBytes: 53687091,
            description: ABI_DESCRIPTIONS['armeabi-v7a'].description,
          },
          {
            abi: 'x86_64',
            fileName: 'YOMI-1.2.10-x86_64.apk',
            url: `https://github.com/${REPO}/releases/download/v1.2.10/YOMI-1.2.10-x86_64.apk`,
            sizeBytes: 57671680,
            description: ABI_DESCRIPTIONS.x86_64.description,
          },
        ],
        recommended: {
          abi: 'arm64-v8a',
          fileName: 'YOMI-1.2.10-arm64-v8a.apk',
          url: FALLBACK_URL,
          sizeBytes: 56098816,
          description: ABI_DESCRIPTIONS['arm64-v8a'].description,
          badge: ABI_DESCRIPTIONS['arm64-v8a'].badge,
        },
        fallbackUrl: FALLBACK_URL,
        isFallback: true,
      };
    }
  }
}

export function mapLatestToYomiReleaseInfo(latest: LatestRelease): YomiReleaseInfo {
  const assets: Partial<Record<Abi, YomiReleaseAsset>> = {};
  for (const apk of latest.apks) {
    assets[apk.abi] = {
      abi: apk.abi,
      name: apk.fileName,
      downloadUrl: apk.url,
      sizeBytes: apk.sizeBytes,
      sizeFormatted: formatBytes(apk.sizeBytes),
      sha256: apk.sha256 ?? null,
    };
  }

  return {
    version: latest.version,
    tagName: `v${latest.version.replace(/^v/, '')}`,
    name: `YOMI v${latest.version.replace(/^v/, '')}`,
    build: latest.build ?? 17,
    publishedAt: latest.publishedAt,
    htmlUrl: latest.htmlUrl,
    bodyMarkdown: latest.notes,
    isFallback: Boolean(latest.isFallback),
    assets,
  };
}

export async function fetchLatestYomiRelease(
  customFetch: typeof fetch = fetch
): Promise<YomiReleaseInfo> {
  const latest = await getLatestReleaseSafe(customFetch);
  return mapLatestToYomiReleaseInfo(latest);
}

/**
 * Busca o histórico das últimas releases estáveis (ignorando drafts e prereleases).
 */
export async function getPreviousReleases(
  customFetch: typeof fetch = fetch
): Promise<PreviousReleaseSummary[]> {
  try {
    const res = await customFetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=10`,
      {
        headers: getGitHubHeaders(),
        next: { revalidate: 60 },
      } as RequestInit
    );
    if (!res.ok) return [];
    const rawList = await res.json();
    if (!Array.isArray(rawList)) return [];

    const parsedList = rawList
      .map((item) => ReleaseSchema.safeParse(item))
      .filter((r): r is { success: true; data: z.infer<typeof ReleaseSchema> } => r.success)
      .map((r) => r.data)
      .filter((r) => !r.draft && !r.prerelease);

    return parsedList.slice(1).map((rel) => ({
      version: rel.tag_name.replace(/^v/, ''),
      tagName: rel.tag_name,
      publishedAt: rel.published_at,
      htmlUrl: rel.html_url,
      notes: rel.body ?? '',
      apks: ABIS.flatMap((abi) => {
        const asset = rel.assets.find((a) => a.name.endsWith(`-${abi}.apk`));
        if (!asset) return [];
        return [
          {
            abi,
            url: asset.browser_download_url,
            sizeBytes: asset.size,
            fileName: asset.name,
          },
        ];
      }),
    }));
  } catch {
    return [];
  }
}

export async function fetchYomiReleaseHistory(
  limit = 5,
  customFetch: typeof fetch = fetch
): Promise<YomiReleaseInfo[]> {
  const prev = await getPreviousReleases(customFetch);
  return prev.slice(0, limit).map((item) => {
    const assets: Partial<Record<Abi, YomiReleaseAsset>> = {};
    for (const apk of item.apks) {
      assets[apk.abi] = {
        abi: apk.abi,
        name: apk.fileName,
        downloadUrl: apk.url,
        sizeBytes: apk.sizeBytes,
        sizeFormatted: formatBytes(apk.sizeBytes),
        sha256: null,
      };
    }
    return {
      version: item.version,
      tagName: item.tagName,
      name: `YOMI ${item.tagName}`,
      build: 0,
      publishedAt: item.publishedAt,
      htmlUrl: item.htmlUrl,
      bodyMarkdown: item.notes,
      isFallback: false,
      assets,
    };
  });
}
