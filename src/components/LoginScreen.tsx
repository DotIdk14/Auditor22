import React, { useState } from 'react';
import { Lock, ShieldAlert, BadgeCheck, Loader2, Key, User, Eye, EyeOff } from 'lucide-react';
import { PORTFOLIO_GOOGLE_DISABLED_MESSAGE } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (token: string, username: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showManualLogin, setShowManualLogin] = useState<boolean>(false);
  
  // Estados para login manual
  const [username, setUsername] = useState<string>('demo');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Versión portfolio: login con Google desactivado para no exponer credenciales reales.
  const handleGoogleLogin = async () => {
    setErrorMessage(PORTFOLIO_GOOGLE_DISABLED_MESSAGE);
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
                Tip: esta es la versión portfolio, sin cuentas reales. Usa el acceso demo (usuario demo / contraseña demo1234).
              </p>
            )}
          </div>
        )}

        {/* Opciones de Login */}
        <div className="space-y-4">
          {!showManualLogin ? (
            <>
              {/* Versión portfolio: Google desactivado con explicación */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold block mb-1">Versión demo para portfolio</span>
                El inicio de sesión con Google está desactivado a propósito para no exponer credenciales ni datos reales. Todas las llamadas y análisis son simulados. Usa el acceso demo de abajo.
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled
                title={PORTFOLIO_GOOGLE_DISABLED_MESSAGE}
                className="w-full bg-[#1c1c1e] text-gray-500 border border-zinc-800 rounded-2xl py-3 px-4 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                id="google-login-button"
              >
                <span>Continuar con Google (desactivado)</span>
              </button>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-xs text-gray-300 leading-relaxed">
                <span className="font-bold text-indigo-300 block mb-1">Acceso demo</span>
                Usuario: <span className="font-mono font-bold">demo</span><br />
                Contraseña: <span className="font-mono font-bold">demo1234</span>
              </div>
              
              <button
                onClick={() => setShowManualLogin(true)}
                className="w-full bg-transparent hover:bg-zinc-800/50 text-gray-400 hover:text-white rounded-2xl py-3 px-4 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Key className="w-3 h-3" />
                Acceder con contraseña demo
              </button>
            </>
          ) : (
            <form onSubmit={handleManualLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <label className="text-[10px] text-gray-400 tracking-wider font-mono font-bold uppercase block mb-1.5 ml-1">
                  Usuario demo
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="demo"
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
