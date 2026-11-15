import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso & Direitos Autorais",
  description:
    "Termos de Uso, isenção sobre conteúdo de terceiros, diretrizes de direitos autorais e acessibilidade do YOMI.",
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
          Última atualização: Novembro de 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/75">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            1. Objeto e Natureza da Plataforma
          </h2>
          <p>
            O <strong>YOMI</strong> disponibiliza gratuitamente uma interface moderna de leitura e organização pessoal na web e no Android, operando de forma análoga a um navegador especializado que indexa e exibe obras disponibilizadas publicamente por fontes externas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            2. Propriedade Intelectual e Conteúdo de Terceiros
          </h2>
          <p>
            O YOMI <strong>não hospeda, não armazena permanentemente, não digitaliza e não distribui</strong> arquivos de mangás, manhwas ou webtoons em servidores próprios. Todos os metadados, capas e páginas exibidos no catálogo são obtidos em tempo real junto ao acervo público do{" "}
            <a
              href="https://mangadex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--yomi-accent)] underline"
            >
              MangaDex
            </a>
            . Todos os direitos autorais e marcas das obras pertencem exclusivamente aos seus respectivos autores, estúdios e editoras.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            3. Uso da Conta e Backups Pessoais
          </h2>
          <p>
            A sincronização em nuvem destina-se exclusivamente ao armazenamento pessoal de progresso, favoritos e preferências do próprio leitor. O usuário é responsável pela guarda de suas cópias de segurança portáteis (<code>.kuro</code>) e pelo uso lícito da conta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            4. Compromisso de Acessibilidade
          </h2>
          <p>
            Empenhamo-nos em manter a plataforma acessível conforme boas práticas WCAG AA, incluindo navegação completa por teclado, foco visível, textos alternativos em obras e respeito automático à preferência de movimento reduzido do sistema operacional.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            5. Limitação de Responsabilidade
          </h2>
          <p>
            O serviço é oferecido gratuitamente &ldquo;no estado em que se encontra&rdquo;, podendo sofrer interrupções temporárias decorrentes da disponibilidade de provedores externos. Para dúvidas sobre privacidade e dados pessoais, consulte nossa{" "}
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
