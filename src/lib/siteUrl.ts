const defaultSiteUrl = "https://yomi-reader.vercel.app";

function resolveSiteUrl(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl);
    if (url.protocol === "https:" && url.hostname.includes(".") &&
        !url.hostname.endsWith(".localhost") &&
        !/^\d+(\.\d+){3}$/.test(url.hostname)) {
      return url.origin;
    }
  } catch {
    // Use the public production address when the configured URL is invalid.
  }
  return defaultSiteUrl;
}

export const siteUrl = resolveSiteUrl();
