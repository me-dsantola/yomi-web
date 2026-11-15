"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "yomi-cookie-consent-v1";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setVisible(true);
      }
    } catch {
      // Ignora em contextos sem storage
    }
  }, []);

  const accept = (mode: "all" | "essential") => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, date: new Date().toISOString() })
      );
    } catch {
      // Ignora
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Aviso de privacidade e armazenamento local"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-2xl border border-white/12 bg-[#0E0E14]/95 p-4 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.8)]"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--yomi-accent)]" />
        <div className="flex-1 space-y-2 text-xs text-white/75">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-semibold text-white">
              Privacidade & Cookies (LGPD)
            </span>
            <button
              type="button"
              onClick={() => accept("essential")}
              aria-label="Fechar aviso"
              className="rounded-full p-1 text-white/45 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="leading-relaxed text-white/60">
            Usamos apenas armazenamento essencial para lembrar suas preferências de leitura e manter sua sessão ativa, sem anúncios ou rastreadores comerciais.{" "}
            <Link
              href="/privacidade"
              className="text-white underline decoration-white/30 underline-offset-2 hover:text-[var(--yomi-accent)]"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => accept("all")}
              className="rounded-full bg-[var(--yomi-accent)] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Aceitar e continuar
            </button>
            <button
              type="button"
              onClick={() => accept("essential")}
              className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              Apenas essenciais
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
