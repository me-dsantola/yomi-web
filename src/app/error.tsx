"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-36 pb-24 text-center space-y-5">
      <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
      <h1 className="font-display text-2xl font-bold text-white">
        Algo deu errado ao renderizar esta seção
      </h1>
      <p className="text-xs text-white/60">
        {error?.message || "Erro inesperado na aplicação."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-full bg-[#FF2A55] px-6 py-2.5 text-xs font-semibold text-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar Novamente
      </button>
    </div>
  );
}
