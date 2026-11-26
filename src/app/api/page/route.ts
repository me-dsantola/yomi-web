import { NextRequest, NextResponse } from "next/server";

function isAllowedPageHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "uploads.mangadex.org" ||
    lower.endsWith(".mangadex.network") ||
    lower === "mangadex.network"
  );
}

/**
 * Proxy de fallback server-side para páginas de leitura do MangaDex@Home
 * caso a rede local/operadora do leitor bloqueie nós comunitários diretamente.
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

  if (parsed.protocol !== "https:" || parsed.port || parsed.username || parsed.password || !isAllowedPageHost(parsed.hostname)) {
    return NextResponse.json(
      { error: "Domínio de página não autorizado" },
      { status: 403 }
    );
  }

  if (
    !parsed.pathname.startsWith("/data/") &&
    !parsed.pathname.startsWith("/data-saver/")
  ) {
    return NextResponse.json(
      { error: "Caminho de imagem não autorizado" },
      { status: 403 }
    );
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "YOMI-Web/1.2.11",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Falha ao buscar página (${upstream.status})` },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!contentType || !/^image\/(jpeg|png|gif|webp|avif|apng)$/.test(contentType)) {
      await upstream.body?.cancel();
      return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro de rede ao buscar página" },
      { status: 502 }
    );
  }
}
