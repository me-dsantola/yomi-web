import { NextResponse } from 'next/server';
import { fetchLatestYomiRelease } from '@/lib/github/releases';

export const revalidate = 60;

export async function GET() {
  const release = await fetchLatestYomiRelease();
  return NextResponse.json(release, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
