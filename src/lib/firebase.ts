// Versión portfolio: autenticación con Google desactivada para no exponer credenciales reales.
// Este módulo conserva las exportaciones que usa la app, pero googleSignIn siempre
// rechaza con un mensaje explicativo. El acceso es solo demo con contraseña (ver LoginScreen).
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const PORTFOLIO_GOOGLE_DISABLED_MESSAGE =
  'El inicio de sesión con Google está desactivado en la versión portfolio para no exponer credenciales reales. Usa el acceso demo con contraseña.';

let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Sin sesión de Google en modo portfolio: notificar fallo de inmediato.
  cachedAccessToken = null;
  if (onAuthFailure) onAuthFailure();
  return () => {};
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  throw new Error(PORTFOLIO_GOOGLE_DISABLED_MESSAGE);
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem('demo_google_drive_token');
    // Limpiar restos de versiones anteriores
    localStorage.removeItem('utel_google_drive_token');
  } catch {
    // Ignorar errores de almacenamiento
  }
};
