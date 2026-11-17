"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  Calendar,
  Cpu,
} from "lucide-react";
import type { YomiReleaseInfo } from "@/lib/github/releases";
import type { AndroidAbi } from "@/lib/device";

interface DownloadSummarySectionProps {
  release: YomiReleaseInfo;
}

export function DownloadSummarySection({
  release,
}: DownloadSummarySectionProps) {
  const [copiedAbi, setCopiedAbi] = useState<string | null>(null);

  const abis: { abi: AndroidAbi; title: string; badge?: string }[] = [
    { abi: "arm64-v8a", title: "ARM64 (64-bit)", badge: "Recomendado" },
    { abi: "armeabi-v7a", title: "ARMv7 (32-bit)" },
    { abi: "x86_64", title: "x86_64 (PC / Emulador)" },
  ];

  const copyHash = async (abi: string, sha: string | null) => {
    if (!sha) return;
    await navigator.clipboard.writeText(sha);
    setCopiedAbi(abi);
    setTimeout(() => setCopiedAbi(null), 2000);
  };

  const formattedDate = new Date(release.publishedAt).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#12121B] to-[#0E0E14] p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.08] pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Versão Atual • {release.tagName} (Build {release.build})
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Versões por arquitetura
            </h2>
            <p className="text-sm text-white/60 max-w-2xl">
              Atualize direto por cima da instalação atual sem perder seus dados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2">
              <Calendar className="h-3.5 w-3.5 text-[#FF2A55]" />
              Publicado em {formattedDate}
            </span>
            <Link
              href="/download"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 font-semibold transition hover:bg-white/90"
            >
              Central de Downloads Completa
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {abis.map(({ abi, title, badge }) => {
            const asset = release.assets[abi];
            if (!asset) return null;
            return (
              <div
                key={abi}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  badge
                    ? "border-[#FF2A55]/40 bg-[#FF2A55]/[0.04]"
                    : "border-white/[0.08] bg-[#0A0A0F]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-white">
                      <Cpu className="h-3.5 w-3.5 text-[#FF2A55]" />
                      {abi}
                    </span>
                    {badge && (
                      <span className="rounded-full bg-[#FF2A55] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                        {badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold text-white">
                    {title}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-white/50 truncate">
                    {asset.name} • {asset.sizeFormatted}
                  </p>

                  {asset.sha256 && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/40 px-2.5 py-1.5 text-[11px] text-white/55">
                      <span className="font-mono truncate">
                        SHA256: {asset.sha256.slice(0, 14)}…
                      </span>
                      <button
                        type="button"
                        onClick={() => copyHash(abi, asset.sha256)}
                        className="ml-2 text-white/70 hover:text-white"
                        title="Copiar hash SHA-256 completo"
                      >
                        {copiedAbi === abi ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <a
                  href={asset.downloadUrl}
                  className={`mt-5 inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold transition ${
                    badge
                      ? "bg-[#FF2A55] text-white hover:bg-[#ff4066]"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar {abi} ({asset.sizeFormatted})
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
          <span>
            Dúvidas na instalação ou atualização?{" "}
            <Link
              href="/instalar"
              className="text-white/80 underline hover:text-white"
            >
              Confira o Guia Passo a Passo para Android
            </Link>
          </span>
          <Link
            href="/download"
            className="inline-flex items-center gap-1 text-white/70 hover:text-white"
          >
            Ver notas da versão e checksums
          </Link>
        </div>
      </div>
    </section>
  );
}
