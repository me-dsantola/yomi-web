import React from 'react';
import { fetchLatestYomiRelease } from '@/lib/github/releases';
import {
  CURATED_POPULAR_WORKS,
  selectTimeWindowFeaturedWorks,
} from '@/lib/mangadex/curatedCatalog';
import { LoggedInHomeHub } from '@/components/landing/LoggedInHomeHub';

export const dynamic = 'force-dynamic';

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
