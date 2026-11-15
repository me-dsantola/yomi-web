import React from "react";
import type { Metadata } from "next";
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
  History,
} from "lucide-react";
import {
  fetchLatestYomiRelease,
  fetchYomiReleaseHistory,
} from "@/lib/github/releases";
import { SmartDownloadBox } from "@/components/download/SmartDownloadBox";
import type { AndroidAbi } from "@/lib/device";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Download Oficial Android & Notas de Versão",
  description:
    "Baixe a versão oficial mais recente do YOMI para Android com verificação de integridade SHA-256 e notas de atualização.",
};

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
    subtitle:
      "Recomendado para quase todos os smartphones atuais (Samsung, Motorola, Xiaomi, Asus e Pixel).",
    recommended: true,
  },
  {
    abi: "armeabi-v7a",
    name: "Android Antigo (32-bit)",
    shortLabel: "32-bit",
    subtitle:
      "Para celulares mais antigos ou aparelhos de entrada compatíveis apenas com sistemas de 32 bits.",
  },
  {
    abi: "x86_64",
    name: "PC / Emulador (x86_64)",
    shortLabel: "PC / Emulador",
    subtitle:
      "Para uso em Chromebooks e emuladores Android no computador.",
  },
];

export default async function DownloadPage() {
  const [latest, history] = await Promise.all([
    fetchLatestYomiRelease(),
    fetchYomiReleaseHistory(5),
  ]);

  const previousReleases = history.filter(
    (item) => item.tagName !== latest.tagName
  );

  const formattedDate = new Date(latest.publishedAt).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-14">
      {/* Header + Smart Download */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Edição Oficial Android • {latest.tagName}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Baixe o YOMI para Android
          </h1>

          <p className="text-sm sm:text-base text-white/65 leading-relaxed">
            Instalação direta e segura com verificação automática de integridade.
            Se você já usa o YOMI, instale a nova versão por cima sem desinstalar
            para manter seus favoritos, histórico e downloads preservados.
          </p>

          <SmartDownloadBox release={latest} />
        </div>

        {/* Clean Edition Summary Card */}
        <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#0E0E14] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-[var(--yomi-accent)]" />
            Informações da Versão
          </h2>

          <dl className="divide-y divide-white/[0.06] text-xs">
            <div className="py-2.5 flex justify-between">
              <dt className="text-white/50">Versão Atual</dt>
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
              <dt className="text-white/50">Sistema Mínimo</dt>
              <dd className="text-white/80">Android 8.0 ou superior</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="text-white/50">Sincronização</dt>
              <dd className="text-emerald-300">YOMI Cloud &amp; Arquivo .kuro</dd>
            </div>
          </dl>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/instalar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
            >
              <HelpCircle className="h-4 w-4 text-[var(--yomi-accent)]" />
              Como instalar ou atualizar no Android
            </Link>
          </div>
        </div>
      </div>

      {/* Device Options & Checksums */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Pacotes por Tipo de Dispositivo
          </h2>
          <p className="text-xs sm:text-sm text-white/55 mt-1">
            Escolha a opção ideal para o seu aparelho. Cada arquivo conta com assinatura digital verificada em SHA-256.
          </p>
        </div>

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

      {/* Changelog Section */}
      <section className="rounded-3xl border border-white/10 bg-[#0E0E14] p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Novidades da Versão — {latest.name || latest.tagName}
            </h2>
            <p className="text-xs text-white/50">
              Melhorias recentes disponíveis nesta atualização
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/75">
            {latest.tagName}
          </span>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-white/80 prose-headings:font-display prose-headings:text-white prose-a:text-[var(--yomi-accent)] prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-white">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {latest.bodyMarkdown ||
              "Melhorias de desempenho, estabilidade e sincronização em nuvem."}
          </ReactMarkdown>
        </div>
      </section>

      {/* Previous Releases Accordion */}
      {previousReleases.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-[var(--yomi-accent)]" />
            Versões Anteriores
          </h2>

          <div className="space-y-3">
            {previousReleases.map((rel) => (
              <details
                key={rel.tagName}
                className="group rounded-2xl border border-white/[0.08] bg-[#0E0E14] p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm font-semibold text-white">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs">
                      {rel.tagName}
                    </span>
                    <span>{rel.name}</span>
                  </div>
                  <span className="text-xs font-normal text-white/50">
                    {new Date(rel.publishedAt).toLocaleDateString("pt-BR")}
                  </span>
                </summary>
                <div className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-white/70 space-y-3">
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                      {rel.bodyMarkdown}
                    </ReactMarkdown>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(Object.keys(rel.assets) as AndroidAbi[]).map((abi) => {
                      const a = rel.assets[abi];
                      if (!a) return null;
                      const label =
                        ABI_METADATA.find((m) => m.abi === abi)?.shortLabel ||
                        abi;
                      return (
                        <a
                          key={abi}
                          href={a.downloadUrl}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                        >
                          <Download className="h-3 w-3 text-[var(--yomi-accent)]" />
                          {label} ({a.sizeFormatted})
                        </a>
                      );
                    })}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
