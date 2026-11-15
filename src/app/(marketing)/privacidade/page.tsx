import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade (LGPD)",
  description:
    "Política de Privacidade, cookies e proteção de dados pessoais do ecossistema YOMI em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-8">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Transparência &amp; Proteção de Dados (LGPD)
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          Política de Privacidade
        </h1>
        <p className="text-xs text-white/50">
          Última atualização: Novembro de 2026 • Aplicável ao portal web e aplicativo Android YOMI.
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/75">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            1. Privacidade por Padrão
          </h2>
          <p>
            O <strong>YOMI</strong> foi projetado como um ambiente de leitura pessoal livre de anúncios, sem rastreadores publicitários de terceiros e sem comercialização de dados. Você pode explorar o catálogo e ler pelo navegador ou celular sem necessidade de criar conta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            2. Dados Tratados na Sincronização em Nuvem (Opcional)
          </h2>
          <p>
            Quando você opta por entrar com sua Conta Google para sincronizar sua biblioteca entre dispositivos, coletamos apenas os dados estritamente necessários para a execução desse serviço:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-white/70">
            <li>
              Nome de exibição, endereço de e-mail e identificador autenticado para validação de acesso exclusivo à sua conta;
            </li>
            <li>
              Seus dados pessoais de leitura (obras favoritas, histórico de capítulos lidos, listas personalizadas e personalização visual do seu Blobatar).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            3. Cookies e Armazenamento Local
          </h2>
          <p>
            Utilizamos exclusivamente armazenamento técnico essencial no seu navegador para preservar suas preferências visuais (tema, modo de leitura e escolha de consentimento) e manter sua sessão autenticada quando você escolhe fazer login. Não utilizamos cookies de publicidade ou perfilamento comportamental.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            4. Segurança e Isolamento por Usuário
          </h2>
          <p>
            Cada usuário autenticado possui espaço isolado em nuvem, acessível exclusivamente por suas próprias credenciais. Ao encerrar a sessão (Logout), os tokens locais são limpos imediatamente do dispositivo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            5. Integração com Serviços de Terceiros
          </h2>
          <p>
            As capas, sinopses e páginas das obras exibidas na seção de catálogo são obtidas publicamente junto ao serviço{" "}
            <a
              href="https://mangadex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--yomi-accent)] underline"
            >
              MangaDex
            </a>
            . Não compartilhamos seus dados pessoais ou credenciais com serviços externos de catálogo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            6. Seus Direitos (LGPD)
          </h2>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito de acesso, correção, portabilidade e eliminação dos seus dados a qualquer momento. Você pode exportar toda a sua biblioteca em arquivo portátil <code>.kuro</code> na área{" "}
            <Link href="/conta/backup" className="text-[var(--yomi-accent)] underline">
              Gerenciador de Backups
            </Link>{" "}
            ou desconectar e remover seus registros diretamente pela sua conta.
          </p>
        </section>
      </div>
    </div>
  );
}
