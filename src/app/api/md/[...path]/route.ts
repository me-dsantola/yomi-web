import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROOT_SEGMENTS = new Set(['manga', 'chapter', 'at-home']);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json(
      { error: 'Rota de catálogo inválida' },
      { status: 400 }
    );
  }

  const rootSegment = path[0];
  if (!ALLOWED_ROOT_SEGMENTS.has(rootSegment)) {
    return NextResponse.json(
      { error: 'Endpoint não permitido' },
      { status: 403 }
    );
  }

  const upstreamPath = path.map(encodeURIComponent).join('/');
  const search = request.nextUrl.search;
  const targetUrl = `https://api.mangadex.org/${upstreamPath}${search}`;

  // Tokens do MangaDex@Home expiram rapidamente e não devem ficar em cache estático
  const isEphemeralServer = rootSegment === 'at-home';

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'YOMI-Web/1.2.11',
      },
      ...(isEphemeralServer
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 300 } }),
    });

    const responseHeaders: Record<string, string> = {
      'Cache-Control':
        isEphemeralServer || !upstreamRes.ok
          ? 'no-store'
          : 'public, s-maxage=300, stale-while-revalidate=600',
    };

    const retryAfter = upstreamRes.headers.get('Retry-After');
    if (retryAfter) {
      responseHeaders['Retry-After'] = retryAfter;
    }

    const rawText = await upstreamRes.text();
    let data: unknown;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {
        error: upstreamRes.ok
          ? 'Resposta inválida da fonte externa'
          : `Erro HTTP ${upstreamRes.status} na fonte externa`,
      };
    }

    return NextResponse.json(data, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: 'Falha temporária ao consultar catálogo externo' },
      {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
