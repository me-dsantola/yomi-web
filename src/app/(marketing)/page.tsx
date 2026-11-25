import React from 'react';
import type { Metadata } from 'next';
import { fetchLatestYomiRelease } from '@/lib/github/releases';
import {
  CURATED_POPULAR_WORKS,
  selectTimeWindowFeaturedWorks,
} from '@/lib/mangadex/curatedCatalog';
import { LoggedInHomeHub } from '@/components/landing/LoggedInHomeHub';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Yomi Reader | Leitor de mangás, manhwas e webtoons' },
  description: 'Leia mangás, manhwas e webtoons no Yomi Reader pelo navegador ou pelo app Android, com biblioteca sincronizada.',
  alternates: { canonical: '/' },
  verification: { google: 'LDWlRQxPw6gDqnCeT_Lj6nQc6CKAKxhjnfxMfFlYjBI' },
};

export default async function HomePage() {
  const latestRelease = await fetchLatestYomiRelease(fetch, { noStore: true });
  const featuredWindowWorks = selectTimeWindowFeaturedWorks(
    CURATED_POPULAR_WORKS,
    5,
    Date.now(),
    45
  );
  const primaryApkUrl =
    latestRelease.assets['arm64-v8a']?.downloadUrl || '/download';

  return (
    <div className="relative bg-[#070709] text-white">
      <LoggedInHomeHub
        release={latestRelease}
        showcaseWorks={featuredWindowWorks}
        primaryApkUrl={primaryApkUrl}
      />
    </div>
  );
}
