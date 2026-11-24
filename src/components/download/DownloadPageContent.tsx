"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  Download,
  ShieldCheck,
  Calendar,
  Cpu,
  FileCode2,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { SmartDownloadBox } from "@/components/download/SmartDownloadBox";
import type { AndroidAbi } from "@/lib/device";
import type { YomiReleaseInfo } from "@/lib/github/releases";
import { useLiveRelease } from "@/lib/github/useLiveRelease";

interface DownloadPageContentProps {
  initialRelease: YomiReleaseInfo;
}

const ABI_METADATA: {
  abi: AndroidAbi;
  name: string;
  shortLabel: string;
  subtitle: string;
  recommended?: boolean;
}[] = [
  {
    abi: "arm64-v8a",
    name: "Android Moderno (64-bit)",
    shortLabel: "Padrão 64-bit",
    subtitle: "Celulares Android atuais (Samsung, Motorola, Xiaomi, Pixel).",
    recommended: true,
  },
  {
    abi: "armeabi-v7a",
    name: "Android Antigo (32-bit)",
    shortLabel: "32-bit",
    subtitle: "Aparelhos mais antigos compatíveis apenas com 32 bits.",
  },
  {
    abi: "x86_64",
    name: "PC / Emulador (x86_64)",
    shortLabel: "PC / Emulador",
    subtitle: "Chromebooks e emuladores Android no computador.",
  },
];

export function DownloadPageContent({
  initialRelease,
}: DownloadPageContentProps) {
  const latest = useLiveRelease(initialRelease) ?? initialRelease;

  const formattedDate = new Date(latest.publishedAt).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-12">
      {/* Cabeçalho + Download principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Android · {latest.tagName}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Baixe o YOMI para Android
          </h1>

          <p className="text-sm sm:text-base text-white/65 leading-relaxed">
            Instale a versão atual ou atualize por cima sem desinstalar para
            manter seus favoritos e downloads.
          </p>

          <SmartDownloadBox release={latest} />
        </div>

        {/* Resumo da Versão Atual */}
        <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#0E0E14] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-[var(--yomi-accent)]" />
            Versão atual
          </h2>

          <dl className="divide-y divide-white/[0.06] text-xs">
            <div className="py-2.5 flex justify-between">
              <dt className="text-white/50">Versão</dt>
              <dd className="font-semibold text-white">{latest.tagName}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-white/50">Publicação</dt>
              <dd className="text-white/85 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                {formattedDate}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-white/50">Requisito</dt>
              <dd className="text-white/80">Android 8.0+</dd>
            </div>
          </dl>

          <div className="pt-1">
            <Link
              href="/instalar"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
            >
              <HelpCircle className="h-4 w-4 text-[var(--yomi-accent)]" />
              Como instalar ou atualizar
            </Link>
          </div>
        </div>
      </div>

      {/* Pacotes apenas da versão atual */}
      <section className="space-y-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
          Pacotes por dispositivo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ABI_METADATA.map(({ abi, name, shortLabel, subtitle, recommended }) => {
            const asset = latest.assets[abi];
            if (!asset) return null;

            return (
              <div
                key={abi}
                className={`flex flex-col justify-between rounded-2xl border p-5 ${
                  recommended
                    ? "border-[var(--yomi-accent)]/45 bg-[#0E0E14] shadow-[0_0_30px_var(--yomi-accent-glow)]"
                    : "border-white/10 bg-[#0E0E14]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-white">
                      <Cpu className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
                      {shortLabel}
                    </span>
                    {recommended && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--yomi-accent)] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                        <CheckCircle2 className="h-3 w-3" /> Recomendado
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-white">
                      {name}
                    </h3>
                    <p className="mt-1 text-xs text-white/55 leading-relaxed">
                      {subtitle}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-black/50 p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-white/70">
                      <span>Tamanho:</span>
                      <span className="font-mono text-white">
                        {asset.sizeFormatted}
                      </span>
                    </div>
                    {asset.sha256 && (
                      <div className="pt-1 border-t border-white/[0.06]">
                        <div className="text-white/45 mb-0.5">SHA-256:</div>
                        <div className="font-mono text-[10px] break-all text-emerald-300/90 select-all">
                          {asset.sha256}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <a
                  href={asset.downloadUrl}
                  className={`mt-5 inline-flex items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold transition ${
                    recommended
                      ? "bg-[var(--yomi-accent)] text-white hover:brightness-110"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <Download className="h-4 w-4" />
                  Baixar ({shortLabel})
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Changelog da versão atual */}
      <section className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <h2 className="font-display text-xl font-bold text-white">
            Novidades — {latest.name || latest.tagName}
          </h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/75">
            {latest.tagName}
          </span>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-white/80 prose-headings:font-display prose-headings:text-white prose-a:text-[var(--yomi-accent)] prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-white">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {latest.bodyMarkdown ||
              "Melhorias de estabilidade e desempenho."}
          </ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
