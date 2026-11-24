import React from "react";
import type { Metadata } from "next";
import { fetchLatestYomiRelease } from "@/lib/github/releases";
import { DownloadPageContent } from "@/components/download/DownloadPageContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download YOMI Android",
  description:
    "Baixe a versão atual do YOMI para Android com verificação SHA-256 e notas da atualização.",
};

export default async function DownloadPage() {
  const latest = await fetchLatestYomiRelease(fetch, { noStore: true });

  return <DownloadPageContent initialRelease={latest} />;
}
