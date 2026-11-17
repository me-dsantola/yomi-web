'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirebaseClient,
  registerWithEmailWeb,
  resetPasswordWeb,
  signInWithEmailWeb,
  signInWithGoogleWeb,
  signOutAndClearCaches,
} from '@/lib/firebase/client';
import {
  THEME_PRESETS,
  useReaderStore,
  type YomiThemePreset,
} from '@/lib/store/readerStore';
import { AuthModal } from '@/components/auth/AuthModal';
import { KuroAccountSeasons } from '@/components/brand/bloub/KuroAccountSeasons';
import { KURO_WARDROBE_ENABLED } from '@/lib/kuro/features';

type AuthModalMode = 'login' | 'register';

interface AuthContextValue {
  user: User | null;
  loadingAuth: boolean;
  authError: string | null;
  clearAuthError: () => void;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  themePreset: YomiThemePreset;
  setThemePreset: (preset: YomiThemePreset) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useYomiAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useYomiAuth deve ser usado dentro de AppProviders');
  }
  return ctx;
}

function mapFirebaseAuthError(err: any, fallback: string): string | null {
  const code = String(err?.code ?? '');
  if (code === 'auth/popup-closed-by-user') return null;
  if (code === 'auth/unauthorized-domain') {
    return 'Domínio ainda não autorizado no Firebase Console (Authentication > Settings > Authorized domains).';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Este e-mail já está cadastrado. Tente entrar ou redefinir sua senha.';
  }
  if (code === 'auth/weak-password') {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (code === 'auth/invalid-email') {
    return 'Digite um endereço de e-mail válido.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Ative o provedor E-mail/Senha no Firebase Console (Authentication > Sign-in method).';
  }
  return fallback;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const themePreset = useReaderStore((s) => s.themePreset);
  const setThemePreset = useReaderStore((s) => s.setThemePreset);
  const resetPreferences = useReaderStore((s) => s.resetPreferences);

  useEffect(() => {
    try {
      const { auth } = getFirebaseClient();
      const unsub = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setLoadingAuth(false);
        if (nextUser) {
          setAuthModalOpen(false);
          setAuthError(null);
        }
      });
      return () => unsub();
    } catch {
      setLoadingAuth(false);
      return undefined;
    }
  }, []);

  // Sincroniza CSS variables de acento reativo no :root
  useEffect(() => {
    const preset = THEME_PRESETS[themePreset] ?? THEME_PRESETS.crimson;
    const root = document.documentElement;
    root.style.setProperty('--yomi-accent', preset.primary);
    root.style.setProperty('--yomi-accent-secondary', preset.secondary);
    root.style.setProperty('--yomi-accent-glow', preset.glow);
  }, [themePreset]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthError(null);
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthError(null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGoogleWeb();
    } catch (err: any) {
      setAuthError(
        mapFirebaseAuthError(
          err,
          'Não foi possível autenticar com o Google no momento. Tente novamente.'
        )
      );
    }
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null);
      try {
        await signInWithEmailWeb(email, password);
        return true;
      } catch (err: any) {
        setAuthError(
          mapFirebaseAuthError(
            err,
            'Não foi possível entrar com e-mail e senha. Verifique seus dados.'
          )
        );
        return false;
      }
    },
    []
  );

  const registerWithEmail = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<boolean> => {
      setAuthError(null);
      try {
        const created = await registerWithEmailWeb(name, email, password);
        setUser({ ...created });
        return true;
      } catch (err: any) {
        setAuthError(
          mapFirebaseAuthError(
            err,
            'Não foi possível concluir seu cadastro. Tente novamente.'
          )
        );
        return false;
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await resetPasswordWeb(email);
      return true;
    } catch (err: any) {
      setAuthError(
        mapFirebaseAuthError(
          err,
          'Não foi possível enviar o e-mail de redefinição.'
        )
      );
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutAndClearCaches(() => {
      queryClient.clear();
      resetPreferences();
    });
    setUser(null);
  }, [queryClient, resetPreferences]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loadingAuth,
      authError,
      clearAuthError,
      openAuthModal,
      closeAuthModal,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      resetPassword,
      logout,
      themePreset,
      setThemePreset,
    }),
    [
      user,
      loadingAuth,
      authError,
      clearAuthError,
      openAuthModal,
      closeAuthModal,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      resetPassword,
      logout,
      themePreset,
      setThemePreset,
    ]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        {children}
        {KURO_WARDROBE_ENABLED && <KuroAccountSeasons uid={user?.uid??null} />}
        <AuthModal
          open={authModalOpen}
          initialMode={authModalMode}
          authError={authError}
          onClose={closeAuthModal}
          onClearError={clearAuthError}
          onGoogleLogin={loginWithGoogle}
          onEmailLogin={loginWithEmail}
          onEmailRegister={registerWithEmail}
          onResetPassword={resetPassword}
        />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
