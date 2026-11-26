import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso e diretrizes de conteúdo de terceiros do YOMI.",
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-8">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
          <FileText className="h-3.5 w-3.5 text-[var(--yomi-accent)]" />
          Termos &amp; Condições
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          Termos de Uso
        </h1>
        <p className="text-xs text-white/50">
          Atualizado em novembro de 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/75">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            1. Objeto
          </h2>
          <p>
            O <strong>YOMI</strong> oferece gratuitamente uma interface de leitura e organização pessoal na web e no Android, exibindo obras indexadas de fontes externas públicas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            2. Conteúdo de Terceiros e Direitos Autorais
          </h2>
          <p>
            Para carregar obras, o YOMI consulta fontes externas e pode intermediar e armazenar temporariamente imagens em cache. Uma das fontes utilizadas é o{" "}
            <a
              href="https://mangadex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--yomi-accent)] underline"
            >
              MangaDex
            </a>
            , e todos os direitos autorais pertencem aos respectivos autores, estúdios e editoras.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            3. Conta, Comentários e Backups
          </h2>
          <p>
            A conta sincroniza progresso, favoritos e comentários. O usuário é responsável pelo conteúdo que publica e pela guarda dos seus arquivos de backup (<code>.kuro</code>).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            4. Disponibilidade
          </h2>
          <p>
            O serviço é gratuito e pode depender da disponibilidade de provedores externos. Para detalhes sobre dados, acesse a{" "}
            <Link href="/privacidade" className="text-[var(--yomi-accent)] underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
