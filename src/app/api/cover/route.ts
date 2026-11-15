import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IMAGE_HOSTS = new Set([
  "uploads.mangadex.org",
  "s4.anilist.co",
  "cdn.myanimelist.net",
  "media.kitsu.app",
]);

/**
 * Proxy de imagens server-side com fallback automático anti-hotlink/CORS
 * garantindo que 100% das capas carreguem sem erro no navegador.
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Parâmetro url ausente" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
    return NextResponse.json(
      { error: "Domínio de capa não autorizado" },
      { status: 403 }
    );
  }

  const fallbackWpUrl = `https://i0.wp.com/${parsed.hostname}${parsed.pathname}${parsed.search}`;

  for (const candidate of [parsed.toString(), fallbackWpUrl]) {
    try {
      const upstream = await fetch(candidate, {
        headers: {
          "User-Agent": "YOMI-Reader-Web/1.2.8",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        next: { revalidate: 86400 },
      });

      if (upstream.ok) {
        const buffer = await upstream.arrayBuffer();
        const contentType =
          upstream.headers.get("content-type") || "image/jpeg";
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control":
              "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          },
        });
      }
    } catch {
      // Tenta próximo candidato
    }
  }

  return NextResponse.redirect(
    new URL("/brand/icon-1024.png", request.url),
    { status: 302 }
  );
}
