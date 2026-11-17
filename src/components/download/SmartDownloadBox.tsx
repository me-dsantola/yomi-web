"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  QrCode,
  Check,
  Copy,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import {
  detectClientDevice,
  type AndroidAbi,
  type ClientDeviceInfo,
} from "@/lib/device";
import type { YomiReleaseInfo } from "@/lib/github/releases";
import { useLiveRelease } from "@/lib/github/useLiveRelease";

interface SmartDownloadBoxProps {
  release: YomiReleaseInfo;
}

const ABI_DESCRIPTIONS: Record<
  AndroidAbi,
  { label: string; shortLabel: string; desc: string }
> = {
  "arm64-v8a": {
    label: "Android Moderno (64-bit) — Padrão",
    shortLabel: "Android Moderno",
    desc: "Padrão para celulares modernos (64-bit).",
  },
  "armeabi-v7a": {
    label: "Android Antigo (32-bit)",
    shortLabel: "Android 32-bit",
    desc: "Para aparelhos antigos de 32-bit.",
  },
  x86_64: {
    label: "PC / Emulador",
    shortLabel: "PC / Emulador",
    desc: "Para Chromebook e emuladores Android.",
  },
};

export function SmartDownloadBox({ release }: SmartDownloadBoxProps) {
  const [device, setDevice] = useState<ClientDeviceInfo>({
    platform: "android",
    recommendedAbi: "arm64-v8a",
    label: "Android Moderno (64-bit)",
  });
  const [selectedAbi, setSelectedAbi] = useState<AndroidAbi>("arm64-v8a");
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  useEffect(() => {
    const detected = detectClientDevice(
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    );
    setDevice(detected);
    setSelectedAbi(detected.recommendedAbi);
  }, []);

  useEffect(() => {
    if (!showQrModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQrModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showQrModal]);

  const activeRelease = useLiveRelease(release) ?? release;
  const currentAsset =
    activeRelease.assets[selectedAbi] ?? activeRelease.assets["arm64-v8a"];
  const primaryHref = currentAsset?.downloadUrl || "#";

  const handleCopySha = async () => {
    if (!currentAsset?.sha256) return;
    await navigator.clipboard.writeText(currentAsset.sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <div className="w-full max-w-xl space-y-4">
      {device.platform === "ios" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-white">
                  App disponível apenas para Android
                </p>
                <p className="mt-1 text-white/75">
                  No iPhone ou iPad, leia diretamente pelo navegador.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/explorar"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_var(--yomi-accent-glow)] transition hover:brightness-110"
                >
                  <BookOpen className="h-4 w-4" />
                  Ler pelo navegador
                </Link>
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
                >
                  APK Android ({activeRelease.tagName})
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.1] bg-[#0E0E14]/90 backdrop-blur-xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          {/* Primary Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={primaryHref}
              className="group relative flex-1 inline-flex items-center justify-center gap-3 rounded-full bg-[var(--yomi-accent)] px-6 py-4 text-sm sm:text-base font-semibold text-white shadow-[0_0_32px_var(--yomi-accent-glow)] transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              <div className="text-left">
                <div className="leading-tight">
                  Baixar YOMI {activeRelease.tagName}
                </div>
                <div className="text-[11px] font-normal text-white/85">
                  {ABI_DESCRIPTIONS[selectedAbi].shortLabel} •{" "}
                  {currentAsset?.sizeFormatted ?? "~53 MB"} • Android 8.0+
                </div>
              </div>
            </a>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[#14141C] px-5 py-4 text-xs sm:text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              title="Escaneie com a câmera do celular para baixar direto"
            >
              <QrCode className="h-4 w-4 text-[var(--yomi-accent)]" />
              <span>QR Code</span>
            </button>
          </div>

          {/* ABI Selector + SHA256 */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
              <label htmlFor="abi-select" className="text-white/55">
                Dispositivo:
              </label>
              <div className="relative">
                <select
                  id="abi-select"
                  value={selectedAbi}
                  onChange={(e) => setSelectedAbi(e.target.value as AndroidAbi)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#14141C] py-1 pl-2.5 pr-7 text-xs font-medium text-white focus:border-[var(--yomi-accent)] focus:outline-none"
                >
                  {(Object.keys(ABI_DESCRIPTIONS) as AndroidAbi[]).map((abi) => (
                    <option key={abi} value={abi} className="bg-[#0E0E14] text-white">
                      {ABI_DESCRIPTIONS[abi].label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
              </div>
            </div>

            {currentAsset?.sha256 && (
              <button
                type="button"
                onClick={handleCopySha}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/65 transition hover:border-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                title={`Assinatura verificada: ${currentAsset.sha256}`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  Verificado · {currentAsset.sha256.slice(0, 8)}…
                </span>
                {copiedSha ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60" />
                )}
              </button>
            )}
          </div>

          <p className="mt-2.5 text-[11px] text-white/45">
            {ABI_DESCRIPTIONS[selectedAbi].desc}{" "}
            <Link
              href="/download"
              className="text-white/75 underline decoration-white/30 underline-offset-2 hover:text-white"
            >
              Ver detalhes e SHA-256
            </Link>
          </p>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/12 bg-[#0E0E14] p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--yomi-accent)]/35 bg-[var(--yomi-accent)]/10 px-3 py-1 text-xs font-medium text-[var(--yomi-accent)]">
              <Smartphone className="h-3.5 w-3.5" />
              Download Direto no Celular
            </div>
            <h3
              id="qr-modal-title"
              className="font-display text-lg font-bold text-white"
            >
              Aponte a câmera do seu Android
            </h3>
            <p className="mt-1 text-xs text-white/60">
              Inicia o download oficial de{" "}
              <span className="font-medium text-white/85">
                {ABI_DESCRIPTIONS[selectedAbi].shortLabel}
              </span>
            </p>

            <div className="mx-auto my-5 inline-block rounded-2xl bg-white p-4 shadow-[0_0_40px_var(--yomi-accent-glow)]">
              <QRCodeSVG
                value={primaryHref}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            <p className="text-[11px] text-white/45">
              YOMI {activeRelease.tagName} • {currentAsset?.sizeFormatted}
            </p>

            <div className="mt-5 flex gap-2">
              <Link
                href="/instalar"
                onClick={() => setShowQrModal(false)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
              >
                Como instalar
              </Link>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 rounded-full bg-[var(--yomi-accent)] py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
