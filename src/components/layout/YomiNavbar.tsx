'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Download,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  HardDriveDownload,
  BookOpen,
} from 'lucide-react';
import { YomiLogo } from '@/components/brand/YomiLogo';
import { useYomiAuth } from '@/components/providers/AppProviders';
import {
  THEME_PRESETS,
  type YomiThemePreset,
} from '@/lib/store/readerStore';
import { cn } from '@/lib/utils';

interface YomiNavbarProps {
  latestVersion?: string;
}

const NAV_LINKS = [
  { href: '/#recursos', label: 'Recursos' },
  { href: '/explorar', label: 'Catálogo' },
  { href: '/instalar', label: 'Instalação' },
  { href: '/download', label: 'Novidades' },
];

export function YomiNavbar({ latestVersion = '1.2.8' }: YomiNavbarProps) {
  const pathname = usePathname();
  const {
    user,
    openAuthModal,
    logout,
    themePreset,
    setThemePreset,
  } = useYomiAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Oculta navbar global dentro do leitor em tela cheia (/ler/...)
  if (pathname?.startsWith('/ler/')) {
    return null;
  }

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6',
          scrolled ? 'pt-2.5' : 'pt-4'
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-6xl rounded-full border border-white/[0.08] bg-[#14141E]/65 backdrop-blur-md transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.55)]',
            scrolled ? 'px-4 py-2' : 'px-5 py-3'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Logo Oficial */}
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yomi-accent)]"
              aria-label="Página inicial do YOMI"
            >
              <YomiLogo height={scrolled ? 26 : 30} />
            </Link>

            {/* Links Centrais Desktop */}
            <nav
              aria-label="Navegação principal"
              className="hidden md:flex items-center gap-1"
            >
              {NAV_LINKS.map((item) => {
                const isActive =
                  item.href !== '/#recursos' && pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Ações à Direita */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Seletor discreto de Acento Reativo */}
              <div
                className="hidden lg:flex items-center gap-1.5 rounded-full bg-black/40 border border-white/[0.07] px-2.5 py-1.5"
                role="group"
                aria-label="Cor de destaque da interface"
              >
                {(Object.keys(THEME_PRESETS) as YomiThemePreset[]).map((key) => {
                  const preset = THEME_PRESETS[key];
                  const active = themePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setThemePreset(key)}
                      title={`Tema ${preset.name}`}
                      aria-label={`Ativar tema ${preset.name}`}
                      aria-pressed={active}
                      className={cn(
                        'h-3.5 w-3.5 rounded-full transition-transform',
                        active
                          ? 'scale-125 ring-2 ring-white/80'
                          : 'opacity-65 hover:opacity-100'
                      )}
                      style={{ backgroundColor: preset.primary }}
                    />
                  );
                })}
              </div>

              {/* Botão de Download Rápido (sempre visível, inclusive no mobile) */}
              <Link
                href="/download"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--yomi-accent)] hover:brightness-110 text-white font-semibold text-xs sm:text-sm px-3.5 sm:px-4 py-2 transition-all shadow-[0_0_24px_var(--yomi-accent-glow)]"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Baixar</span>
                <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[11px] font-mono">
                  v{latestVersion}
                </span>
              </Link>

              {/* Botão de Conta Google / Perfil */}
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-label="Abrir menu da conta"
                    aria-expanded={userMenuOpen}
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/10 p-1 pr-2.5 text-xs font-medium text-white transition-colors"
                  >
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Avatar'}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--yomi-accent)] text-[11px] font-bold">
                        {(user.displayName || user.email || 'Y')
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {user.displayName?.split(' ')[0] || 'Conta'}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div
                      onMouseLeave={() => setUserMenuOpen(false)}
                      className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0E0E14]/95 backdrop-blur-xl p-2 shadow-2xl"
                    >
                      <div className="px-3 py-2 border-b border-white/[0.07]">
                        <p className="text-xs font-semibold text-white truncate">
                          {user.displayName || 'Leitor YOMI'}
                        </p>
                        <p className="text-[11px] text-white/50 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href="/conta"
                        onClick={() => setUserMenuOpen(false)}
                        className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.07] hover:text-white"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[var(--yomi-accent)]" />
                        Minha Conta & Nuvem
                      </Link>
                      <Link
                        href="/conta/backup"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.07] hover:text-white"
                      >
                        <HardDriveDownload className="w-3.5 h-3.5 text-[var(--yomi-accent)]" />
                        Backup (.kuro)
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sair e limpar sessão
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Link
                    href="/conta"
                    className="rounded-full border border-white/12 bg-white/[0.04] hover:bg-white/[0.09] px-3.5 py-2 text-xs font-medium text-white/85 transition-colors"
                  >
                    Minha Conta
                  </Link>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="rounded-full border border-white/15 bg-white/[0.07] hover:bg-white/12 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    Entrar / Criar conta
                  </button>
                </div>
              )}

              {/* Botão Menu Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                className="md:hidden inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/80 hover:text-white"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sheet Inferior Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/75"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/10 bg-[#0E0E14] p-6 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <nav className="grid gap-2">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-white/40">→</span>
                </Link>
              ))}
              <Link
                href="/conta"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white"
              >
                <span>Minha Biblioteca</span>
                <BookOpen className="w-4 h-4 text-[var(--yomi-accent)]" />
              </Link>
            </nav>

            {/* Seletor de tema no mobile */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3">
              <span className="text-xs text-white/65">Cor de destaque</span>
              <div className="flex items-center gap-2">
                {(Object.keys(THEME_PRESETS) as YomiThemePreset[]).map((key) => {
                  const preset = THEME_PRESETS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setThemePreset(key)}
                      aria-label={`Tema ${preset.name}`}
                      className={cn(
                        'h-5 w-5 rounded-full',
                        themePreset === key && 'ring-2 ring-white'
                      )}
                      style={{ backgroundColor: preset.primary }}
                    />
                  );
                })}
              </div>
            </div>

            {!user && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="mt-4 w-full rounded-full bg-white text-black font-semibold text-sm py-3"
              >
                Entrar ou Criar Conta
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
