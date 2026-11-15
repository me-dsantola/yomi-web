import React from "react";
import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-36 pb-24 text-center space-y-6">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-[#FF2A55]/30 bg-[#FF2A55]/10 font-mono text-xl font-bold text-[#FF2A55]">
        404
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-white">
          Página não encontrada
        </h1>
        <p className="text-sm text-white/60">
          O capítulo ou endereço que você tentou acessar não existe ou foi movido.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#FF2A55] px-5 py-2.5 text-xs font-semibold text-white"
        >
          <Home className="h-4 w-4" />
          Início
        </Link>
        <Link
          href="/explorar"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-medium text-white"
        >
          <Compass className="h-4 w-4" />
          Explorar Catálogo
        </Link>
      </div>
    </div>
  );
}
