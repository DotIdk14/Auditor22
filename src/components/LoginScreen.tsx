import React, { useState } from 'react';
import { Lock, ShieldAlert, BadgeCheck, Loader2, Key, User, Eye, EyeOff } from 'lucide-react';
import { googleSignIn, logoutGoogle } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (token: string, username: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showManualLogin, setShowManualLogin] = useState<boolean>(false);
  
  // Estados para login manual
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await googleSignIn();
      if (!result) {
        throw new Error('No se recibieron credenciales desde Google.');
      }

      const { user } = result;

      // Comunicar con nuestro backend para validar autorización del correo electrónico
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.token, data.username);
      } else {
        // Desconectar sesión si el backend deniega acceso para no atorar el cliente de Firebase
        await logoutGoogle();
        setErrorMessage(data.error || 'Correo electrónico no autorizado.');
      }
    } catch (err: any) {
      console.error('Error durante autenticación Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('La ventana de Google se cerró antes de completar el inicio de sesión.');
      } else {
        setErrorMessage(err.message || 'Fallo de autenticación con Google.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Por favor ingrese la contraseña de acceso.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim() || 'Supervisor de Calidad',
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.token, data.username);
      } else {
        setErrorMessage(data.error || 'Contraseña incorrecta.');
      }
    } catch (err: any) {
      console.error('Manual login error:', err);
      setErrorMessage('Fallo al conectar con el servidor de auditoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans flex items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#121212] border border-[#222222] rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 animate-fadeIn">
        
        {/* Brand identity */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 border border-indigo-500/30">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
              Auditor Cognitivo PCE
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                PRO v1.0.1
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-[280px] mx-auto">
              Portal de Calidad y Calificación de Asesoría Telefónica
            </p>
          </div>
        </div>

        {/* Warning notification about supervisor protection */}
        <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-4 mb-6 text-xs text-gray-400 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#00c8a5] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#00c8a5] flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase">
              Acceso Restringido <BadgeCheck className="w-3.5 h-3.5 inline text-[#00c8a5]" />
            </span>
            <p className="leading-relaxed">
              Este sistema contiene datos confidenciales. Se requiere acceder con una cuenta autorizada o código de acceso.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 mb-5 text-xs font-semibold flex flex-col gap-2 animate-shake">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes('autorizada') && (
              <p className="text-[10px] text-gray-500 font-normal mt-1 border-t border-rose-500/10 pt-2">
                Tip: Verifica que estés iniciando sesión con tu cuenta institucional (@utel.edu.mx), las cuales tienen acceso automático. Para otras cuentas, el administrador debe habilitar el permiso manualmente.
              </p>
            )}
          </div>
        )}

        {/* Opciones de Login */}
        <div className="space-y-4">
          {!showManualLogin ? (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white border border-zinc-800 hover:border-zinc-700 rounded-2xl py-3 px-4 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                id="google-login-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowManualLogin(true)}
                className="w-full bg-transparent hover:bg-zinc-800/50 text-gray-400 hover:text-white rounded-2xl py-3 px-4 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Key className="w-3 h-3" />
                Acceder mediante correo
              </button>
            </>
          ) : (
            <form onSubmit={handleManualLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <label className="text-[10px] text-gray-400 tracking-wider font-mono font-bold uppercase block mb-1.5 ml-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full bg-[#181818] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 tracking-wider font-mono font-bold uppercase block mb-1.5 ml-1">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-[#181818] border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Iniciando...' : 'Entrar al Workspace'}
                </button>
                <button
                  onClick={() => {
                    setShowManualLogin(false);
                    setErrorMessage('');
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-300 py-2 transition-all font-bold uppercase tracking-widest"
                >
                  Regresar a Google Login
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 pt-5 border-t border-[#222222] text-center">
          <span className="text-[9.5px] text-zinc-600 font-mono">
            Portal de Supervisor Protegido 2026
          </span>
        </div>
      </div>
    </div>
  );
}
