'use client';

import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { YomiLogo } from '@/components/brand/YomiLogo';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'register';
  authError: string | null;
  onClose: () => void;
  onClearError: () => void;
  onGoogleLogin: () => Promise<void>;
  onEmailLogin: (email: string, password: string) => Promise<boolean>;
  onEmailRegister: (
    name: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  onResetPassword: (email: string) => Promise<boolean>;
}

export function AuthModal({
  open,
  initialMode,
  authError,
  onClose,
  onClearError,
  onGoogleLogin,
  onEmailLogin,
  onEmailRegister,
  onResetPassword,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setResetSent(false);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const currentHost =
    typeof window !== 'undefined' ? window.location.hostname : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setResetSent(false);
    setSubmitting(true);
    try {
      const ok =
        mode === 'login'
          ? await onEmailLogin(email, password)
          : await onEmailRegister(name, email, password);
      if (ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onResetPassword(email);
      if (ok) {
        setResetSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/12 bg-[#0E0E14] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar janela de autenticação"
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex flex-col items-center text-center space-y-2">
          <YomiLogo markOnly height={36} />
          <h2
            id="auth-modal-title"
            className="font-display text-2xl font-extrabold text-white"
          >
            {mode === 'login' ? 'Entrar no YOMI' : 'Criar conta gratuita'}
          </h2>
          <p className="text-xs text-white/55">
            {mode === 'login'
              ? 'Acesse capítulos completos, comentários e sua nuvem.'
              : 'Leia sem limites no navegador e sincronize em qualquer aparelho.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 grid grid-cols-2 rounded-full border border-white/10 bg-black/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setResetSent(false);
              onClearError();
            }}
            className={`rounded-full py-2 transition ${
              mode === 'login'
                ? 'bg-[var(--yomi-accent)] text-white shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setResetSent(false);
              onClearError();
            }}
            className={`rounded-full py-2 transition ${
              mode === 'register'
                ? 'bg-[var(--yomi-accent)] text-white shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {authError && (
          <div className="mb-4 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3.5 text-xs text-rose-100 space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{authError}</span>
            </div>
            {authError.includes('Authorized domains') && currentHost && (
              <p className="pl-6 text-[11px] text-rose-200/80">
                Domínio atual:{' '}
                <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-white">
                  {currentHost}
                </code>
              </p>
            )}
          </div>
        )}

        {resetSent && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              E-mail de redefinição enviado! Verifique sua caixa de entrada.
            </span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/55"
              >
                Nome ou apelido
              </label>
              <input
                id="auth-name"
                type="text"
                required
                minLength={2}
                maxLength={32}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como quer ser chamado"
                className="w-full rounded-xl border border-white/12 bg-[#14141C] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/55"
            >
              E-mail
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-white/12 bg-[#14141C] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="auth-password"
                className="block text-[11px] font-medium uppercase tracking-wider text-white/55"
              >
                Senha
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!email.trim() || submitting}
                  className="text-[11px] font-medium text-white/55 hover:text-white disabled:opacity-40"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              className="w-full rounded-xl border border-white/12 bg-[#14141C] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[var(--yomi-accent)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--yomi-accent)] py-3 text-sm font-semibold text-white shadow-[0_0_24px_var(--yomi-accent-glow)] transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Entrar com E-mail' : 'Criar Minha Conta'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/35">
          <div className="h-px flex-1 bg-white/10" />
          <span>ou</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              await onGoogleLogin();
            } finally {
              setSubmitting(false);
            }
          }}
          className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-white py-3 text-xs sm:text-sm font-semibold text-black shadow transition hover:bg-white/90 disabled:opacity-50"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          Continuar com Google
        </button>
      </div>
    </div>
  );
}
