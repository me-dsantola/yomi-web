import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBpt30WLATz1vAtOIsJLnLCIyz8jNW3V-s',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'kuro-reader.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kuro-reader',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'kuro-reader.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '885390508088',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || undefined,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseClient(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} {
  if (!appInstance) {
    appInstance =
      getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }
  if (!dbInstance) {
    dbInstance = getFirestore(appInstance);
  }
  return { app: appInstance, auth: authInstance, db: dbInstance };
}

export async function signInWithGoogleWeb(): Promise<User | null> {
  const { auth } = getFirebaseClient();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const isMobileSafariOrEmbedded =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod|android/i.test(navigator.userAgent) &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|crios/i.test(navigator.userAgent);

  if (isMobileSafariOrEmbedded) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export async function signInWithEmailWeb(
  email: string,
  password: string
): Promise<User> {
  const { auth } = getFirebaseClient();
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  return credential.user;
}

export async function registerWithEmailWeb(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const { auth } = getFirebaseClient();
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  const trimmedName = name.trim();
  if (trimmedName) {
    await updateProfile(credential.user, { displayName: trimmedName });
  }
  return credential.user;
}

export async function resetPasswordWeb(email: string): Promise<void> {
  const { auth } = getFirebaseClient();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutAndClearCaches(
  onClearLocalState?: () => void
): Promise<void> {
  try {
    const { auth } = getFirebaseClient();
    await firebaseSignOut(auth);
  } catch {
    // Continua limpando caches locais mesmo em falha de rede
  }
  if (onClearLocalState) {
    onClearLocalState();
  }
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.clear();
      window.localStorage.removeItem('yomi-reader-preferences');
    } catch {
      // Ignora ambientes restritos
    }
  }
}
