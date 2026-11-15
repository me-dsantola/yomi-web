'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { YomiLogo } from '@/components/brand/YomiLogo';

export function YomiFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith('/ler/')) {
    return null;
  }

  return (
    <footer className="border-t border-white/[0.08] bg-[#070709] text-white/65">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Coluna 1: Marca */}
          <div className="md:col-span-2 space-y-3">
            <YomiLogo height={28} />
            <p className="text-sm text-white/60 max-w-md leading-relaxed">
              Leitor pessoal e minimalista de mangás, manhwas e webtoons para
              Android. Foco total em imersão AMOLED, sincronização em nuvem e
              respeito à privacidade do leitor.
            </p>
            <p className="text-xs text-white/45 pt-1">
              YOMI não é afiliado ao MangaDex nem hospeda arquivos protegidos por
              direitos autorais.
            </p>
          </div>

          {/* Coluna 2: Plataforma */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Ecossistema YOMI
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/download" className="hover:text-white transition-colors">
                  Download Hub & Changelog
                </Link>
              </li>
              <li>
                <Link href="/instalar" className="hover:text-white transition-colors">
                  Guia de Instalação & FAQ
                </Link>
              </li>
              <li>
                <Link href="/explorar" className="hover:text-white transition-colors">
                  Catálogo Web & Quick Reader
                </Link>
              </li>
              <li>
                <Link href="/conta" className="hover:text-white transition-colors">
                  Companion Dashboard
                </Link>
              </li>
              <li>
                <Link href="/conta/backup" className="hover:text-white transition-colors">
                  Exportar / Importar (.kuro)
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Legal & Transparência */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Transparência &amp; Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacidade" className="hover:text-white transition-colors">
                  Política de Privacidade (LGPD)
                </Link>
              </li>
              <li>
                <Link href="/termos" className="hover:text-white transition-colors">
                  Termos de Uso &amp; Direitos
                </Link>
              </li>
              <li>
                <Link href="/instalar" className="hover:text-white transition-colors">
                  Guia de Instalação Android
                </Link>
              </li>
              <li>
                <a
                  href="https://mangadex.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Acervo indexado via MangaDex
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/45">
          <p>© {new Date().getFullYear()} YOMI. Todos os direitos reservados · Disponível gratuitamente para Android.</p>
          <p>Interface acessível (WCAG AA) · Sem rastreadores comerciais.</p>
        </div>
      </div>
    </footer>
  );
}
