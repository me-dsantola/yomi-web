import { NextResponse } from 'next/server';
import { fetchLatestYomiRelease } from '@/lib/github/releases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const release = await fetchLatestYomiRelease(fetch, { noStore: true });
  return NextResponse.json(release, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
