'use client';
import {useProfileAccent} from '@/components/profile/useProfileAccent';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  HardDriveDownload,
  BookOpen,
  Library,
  Home,
  Compass,
  Bookmark,
} from 'lucide-react';
import { YomiLogo } from '@/components/brand/YomiLogo';
import { BlobatarCompanion } from '@/components/brand/BlobatarCompanion';
import { useYomiAuth } from '@/components/providers/AppProviders';
import { fetchUserCloudDoc } from '@/lib/firebase/cloudSync';
import { argbIntToHex } from '@/lib/backup/kuroCodec';
import {
  THEME_PRESETS,
  type YomiThemePreset,
} from '@/lib/store/readerStore';
import {
  shouldShowMobileBottomNav,
  type MobileScrollDirection,
} from '@/lib/mobile/readerTouchAndNav';
import { cn } from '@/lib/utils';
import { useLiveRelease } from '@/lib/github/useLiveRelease';

interface YomiNavbarProps {
  latestVersion?: string;
}

const GUEST_NAV_LINKS = [
  { href: '/explorar', label: 'Catálogo' },
  { href: '/download', label: 'Download' },
  { href: '/instalar', label: 'Como Instalar' },
];

const LOGGED_IN_NAV_LINKS = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Catálogo' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/conta', label: 'Perfil' },
  { href: '/download', label: 'Download' },
];

export function YomiNavbar({ latestVersion = '1.2.11' }: YomiNavbarProps) {
  const pathname = usePathname();
  const {
    user,
    openAuthModal,
    logout,
    themePreset,
    setThemePreset,
  } = useYomiAuth();

  const activeNavLinks = user ? LOGGED_IN_NAV_LINKS : GUEST_NAV_LINKS;

  const liveRelease = useLiveRelease();

  const displayVersion = liveRelease?.version || latestVersion;

  const { data: cloudState } = useQuery({
    queryKey: ['yomi-cloud-doc', user?.uid],
    queryFn: () =>
      fetchUserCloudDoc(user!.uid, user!.email, user!.displayName),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const customizedName =
    cloudState?.profile?.name?.trim() ||
    cloudState?.userDisplayName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Leitor YOMI';

  const customAccentHex = useProfileAccent(cloudState?.profile, cloudState?.avatarDataUrl, cloudState?.bannerDataUrl);
  const hasCustomAvatarPhoto = Boolean(
    cloudState?.avatarDataUrl && !cloudState?.profile?.useBlobatarAsAvatar
  );


  const mascotName =
    cloudState?.mascotName || cloudState?.profile?.blobatarName || 'Kuro';
  const blobatarExpression =
    cloudState?.profile?.blobatarExpression || 'happy';
  const blobatarShape = cloudState?.profile?.blobatarShape || 'auto';

  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] =
    useState<MobileScrollDirection>('idle');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      setScrolled(currentY > 24);
      setScrollY(currentY);

      if (currentY < 48) {
        setScrollDirection('up');
        lastScrollYRef.current = currentY;
      } else if (delta > 10) {
        setScrollDirection('down');
        lastScrollYRef.current = currentY;
      } else if (delta < -8) {
        setScrollDirection('up');
        lastScrollYRef.current = currentY;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const isTextEntryElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (tag === 'INPUT') {
        const inputType = (target as HTMLInputElement).type?.toLowerCase();
        return ![
          'checkbox',
          'radio',
          'range',
          'button',
          'submit',
          'reset',
          'file',
          'color',
        ].includes(inputType);
      }
      return false;
    };

    let maxViewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 0;

    const checkKeyboardState = () => {
      if (typeof window === 'undefined') return;
      maxViewportHeight = Math.max(maxViewportHeight, window.innerHeight);
      const vv = window.visualViewport;
      const viewportCollapsed =
        Boolean(vv) &&
        maxViewportHeight > 0 &&
        vv!.height < maxViewportHeight * 0.75;
      setIsKeyboardOpen(
        Boolean(isTextEntryElement(document.activeElement) || viewportCollapsed)
      );
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isTextEntryElement(e.target)) {
        setIsKeyboardOpen(true);
      }
    };

    const onFocusOut = () => {
      window.setTimeout(checkKeyboardState, 80);
    };

    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', checkKeyboardState);
    return () => {
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', checkKeyboardState);
    };
  }, []);

  // Oculta navbar global dentro do leitor em tela cheia (/ler/...)
  if (pathname?.startsWith('/ler/')) {
    return null;
  }

  const showBottomNav =
    shouldShowMobileBottomNav({
      pathname,
      isKeyboardOpen,
      scrollDirection,
      scrollY,
    }) && !mobileMenuOpen;

  const mobileBottomTabs = [
    {
      href: '/',
      label: 'Início',
      icon: Home,
      isActive: (p: string | null) => p === '/',
    },
    {
      href: '/explorar',
      label: 'Explorar',
      icon: Compass,
      isActive: (p: string | null) => Boolean(p?.startsWith('/explorar')),
    },
    {
      href: '/biblioteca',
      label: 'Biblioteca',
      icon: Bookmark,
      isActive: (p: string | null) => Boolean(p?.startsWith('/biblioteca')),
    },
    {
      href: '/conta',
      label: 'Perfil',
      icon: UserIcon,
      isActive: (p: string | null) => Boolean(p?.startsWith('/conta')),
    },
  ];

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-3 sm:px-6',
          scrolled
            ? 'pt-[max(0.5rem,env(safe-area-inset-top))]'
            : 'pt-[max(0.85rem,env(safe-area-inset-top))]'
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-6xl min-w-0 rounded-full border border-white/[0.08] bg-[#14141E]/75 backdrop-blur-md transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.55)]',
            scrolled ? 'px-2.5 sm:px-4 py-1.5 sm:py-2' : 'px-3 sm:px-5 py-2 sm:py-3'
          )}
        >
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 min-w-0">
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
              {activeNavLinks.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : item.href !== '/#recursos' &&
                      pathname?.startsWith(item.href);
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

              {/* Botão de Download Rápido (sempre visível, compacto em 320px+) */}
              <Link
                href="/download"
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[var(--yomi-accent)] hover:brightness-110 text-white font-semibold text-xs sm:text-sm px-2.5 sm:px-4 min-h-[38px] sm:min-h-[38px] transition-all shadow-[0_0_24px_var(--yomi-accent-glow)] shrink-0"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="sm:hidden">App</span>
                <span className="hidden sm:inline">Baixar</span>
                <span className="hidden sm:inline rounded-full bg-black/30 px-1.5 py-0.5 text-[11px] font-mono">
                  v{displayVersion}
                </span>
              </Link>

              {/* Botão de Conta / Perfil Personalizado */}
              {user ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    aria-label="Abrir menu da conta"
                    aria-expanded={userMenuOpen}
                    className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 rounded-full border border-white/15 bg-white/[0.06] hover:bg-white/10 p-1 sm:pr-3 min-h-[38px] min-w-[38px] text-xs font-medium text-white transition-colors"
                  >
                    {hasCustomAvatarPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cloudState!.avatarDataUrl!}
                        alt={customizedName}
                        className="h-7 w-7 rounded-full object-cover border border-white/15 shrink-0"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        <BlobatarCompanion
                          mascotName={mascotName}
                          hue={cloudState?.profile?.blobatarHue} seed={cloudState?.profile?.blobatarSeed || cloudState?.profile?.name}
                          expression={blobatarExpression}
                          shape={blobatarShape}
                          accentColor={customAccentHex}
                          size={28}
                          background="circle"
                          interactiveCycle={false}
                          followPointer={false}
                          className="rounded-full shrink-0"
                        />
                      </div>
                    )}
                    <span className="hidden sm:inline max-w-[130px] truncate font-semibold">
                      {customizedName}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div
                      onMouseLeave={() => setUserMenuOpen(false)}
                      className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/10 bg-[#0E0E14]/95 backdrop-blur-xl p-2 shadow-2xl"
                    >
                      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.07]">
                        {hasCustomAvatarPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cloudState!.avatarDataUrl!}
                            alt={customizedName}
                            className="h-8 w-8 rounded-full object-cover border border-white/15 shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                            <BlobatarCompanion
                              mascotName={mascotName}
                              hue={cloudState?.profile?.blobatarHue} seed={cloudState?.profile?.blobatarSeed || cloudState?.profile?.name}
                              expression={blobatarExpression}
                              shape={blobatarShape}
                              accentColor={customAccentHex}
                              size={32}
                              background="circle"
                              interactiveCycle={false}
                              followPointer={false}
                              className="rounded-full shrink-0"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {customizedName}
                          </p>
                          <p className="text-[11px] text-white/50 truncate">
                            {user.email || `Mascote ${mascotName}`}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/biblioteca"
                        onClick={() => setUserMenuOpen(false)}
                        className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.07] hover:text-white"
                      >
                        <Library className="w-3.5 h-3.5 text-[var(--yomi-accent)]" />
                        Minha Biblioteca
                      </Link>
                      <Link
                        href="/conta"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.07] hover:text-white"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[var(--yomi-accent)]" />
                        Meu Perfil & Nuvem
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
                    <span className="sm:hidden">Entrar</span>
                    <span className="hidden sm:inline">Entrar / Criar conta</span>
                  </button>
                </div>
              )}

              {/* Botão Menu Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                className="md:hidden inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] min-h-[40px] min-w-[40px] p-2 text-white/80 hover:text-white shrink-0"
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

      {/* Navegação Inferior Mobile */}
      <nav
        aria-label="Navegação inferior mobile"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-[#070709]/92 backdrop-blur-xl transition-transform duration-300 pb-[env(safe-area-inset-bottom,0px)]',
          showBottomNav
            ? 'translate-y-0'
            : 'translate-y-full pointer-events-none'
        )}
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 px-1.5 pt-1.5 pb-1">
          {mobileBottomTabs.map((tab) => {
            const active = tab.isActive(pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-semibold transition-colors',
                  active
                    ? 'text-white'
                    : 'text-white/55 hover:text-white/85'
                )}
              >
                {active && (
                  <span
                    className="absolute top-0.5 h-0.5 w-6 rounded-full"
                    style={{ backgroundColor: 'var(--yomi-accent)' }}
                  />
                )}
                <Icon
                  className="h-5 w-5 transition-transform"
                  style={active ? { color: 'var(--yomi-accent)' } : undefined}
                />
                <span className="truncate max-w-full">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sheet Inferior Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/75"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-[#0E0E14] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <nav className="grid gap-2">
              {activeNavLinks.map((item) => (
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
              {user ? (
                <Link
                  href="/conta/backup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white"
                >
                  <span>Backup (.kuro)</span>
                  <HardDriveDownload className="w-4 h-4 text-[var(--yomi-accent)]" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/biblioteca"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white"
                  >
                    <span>Minha Biblioteca</span>
                    <BookOpen className="w-4 h-4 text-[var(--yomi-accent)]" />
                  </Link>
                  <Link
                    href="/conta"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white"
                  >
                    <span>Meu Perfil & Nuvem</span>
                    <UserIcon className="w-4 h-4 text-[var(--yomi-accent)]" />
                  </Link>
                </>
              )}
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
