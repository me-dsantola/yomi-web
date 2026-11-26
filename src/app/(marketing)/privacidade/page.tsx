import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade (LGPD)",
  description:
    "Política de Privacidade, cookies e proteção de dados pessoais do YOMI.",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20 space-y-8">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          LGPD
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          Política de Privacidade
        </h1>
        <p className="text-xs text-white/50">
          Atualizado em novembro de 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/75">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            1. Privacidade por Padrão
          </h2>
          <p>
            O <strong>YOMI</strong> não exibe anúncios, não usa rastreadores publicitários e não comercializa dados. A conta só é necessária quando você opta por comentar, curtir ou sincronizar sua biblioteca na nuvem.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            2. Dados da Conta (Opcional)
          </h2>
          <p>
            Ao entrar com Google ou e-mail, armazenamos apenas o essencial para autenticação e sincronização:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-white/70">
            <li>Nome, e-mail e identificador da conta;</li>
            <li>Favoritos, histórico de leitura, listas, comentários e personalização do Blobatar.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            3. Armazenamento Local e Cookies
          </h2>
          <p>
            Usamos apenas armazenamento técnico essencial para manter preferências visuais (tema, modo de leitura) e sua sessão autenticada.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            4. Isolamento e Segurança
          </h2>
          <p>
            A biblioteca pessoal é sincronizada pelo Firebase. Comentários ficam visíveis a outros leitores. Ao conectar o Google Drive, você pode guardar backups e imagens na pasta privada do aplicativo. O resumo mensal reúne sua identificação, mascote e estatísticas de leitura em uma imagem que você escolhe com quem compartilhar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            5. Fontes Externas
          </h2>
          <p>
            Capas, metadados e capítulos são obtidos diretamente do acervo público do{" "}
            <a
              href="https://mangadex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--yomi-accent)] underline"
            >
              MangaDex
            </a>
            . Ao carregar imagens diretamente, os provedores recebem informações técnicas da conexão, como o endereço IP.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-white">
            6. Seus Direitos (LGPD)
          </h2>
          <p>
            Conforme a Lei nº 13.709/2018, você pode acessar, exportar em <code>.kuro</code> na área de{" "}
            <Link href="/conta/backup" className="text-[var(--yomi-accent)] underline">
              Backups
            </Link>{" "}
            e excluir seus próprios comentários no local de publicação. A exportação reúne os dados da biblioteca e do perfil.
          </p>
        </section>
      </div>
    </div>
  );
}
