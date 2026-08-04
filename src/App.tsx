import React, { useState, useEffect } from 'react';
import { 
  FileAudio, 
  Settings, 
  BookOpen, 
  BarChart3, 
  HelpCircle, 
  Activity, 
  TrendingUp, 
  Users, 
  ListMusic, 
  Trash2,
  Lock,
  Plus,
  Folder,
  Database,
  LogOut,
  UserCheck,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SalesCall } from './types';
import AudioUpload from './components/AudioUpload';
import AuditorDashboard from './components/AuditorDashboard';
import LoginScreen from './components/LoginScreen';
import { deleteAudioFromDB, clearAllAudiosFromDB } from './utils/audioCache';
import { initAuth } from './lib/firebase';

export default function App() {
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [driveStatus, setDriveStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Estado seguro de autenticación del Supervisor
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [sessionUser, setSessionUser] = useState<string>('');

  // Protección contra inspección de código y copia no autorizada
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear F12
      if (e.key === 'F12') e.preventDefault();
      
      // Bloquear Ctrl+Shift+I (Inspeccionar), Ctrl+Shift+C (Seleccionar elemento), 
      // Ctrl+Shift+J (Consola), Ctrl+U (Ver código fuente)
      if (e.ctrlKey && (
        (e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J' || e.key === 'i' || e.key === 'c' || e.key === 'j')) || 
        (e.key === 'U' || e.key === 'u')
      )) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Inicialización de autenticación para servicios (como Drive) y verificación de sesión
  useEffect(() => {
    // Restaurar sesión de Google Drive si existe
    initAuth();

    const token = localStorage.getItem('utel_supervisor_token');
    const storedUser = localStorage.getItem('utel_supervisor_user');
    if (token) {
      fetch('/api/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsAuthenticated(true);
            setSessionUser(storedUser || 'Supervisor');
          } else {
            localStorage.removeItem('utel_supervisor_token');
            localStorage.removeItem('utel_supervisor_user');
          }
        })
        .catch(err => {
          console.error("No se pudo verificar la sesión con el servidor:", err);
          // Fallback seguro de seguridad para supervisor
          localStorage.removeItem('utel_supervisor_token');
          localStorage.removeItem('utel_supervisor_user');
        })
        .finally(() => {
          setCheckingSession(false);
        });
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleLoginSuccess = (token: string, username: string) => {
    localStorage.setItem('utel_supervisor_token', token);
    localStorage.setItem('utel_supervisor_user', username);
    setSessionUser(username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('utel_supervisor_token');
    localStorage.removeItem('utel_supervisor_user');
    setIsAuthenticated(false);
    setSessionUser('');
    setCalls([]);
  };

  const [driveRecordings, setDriveRecordings] = useState<any[]>([]);

  // Sincronizar con Google Drive
  const syncWithDrive = async () => {
    const driveToken = localStorage.getItem('utel_google_drive_token');
    if (!driveToken) {
      setDriveStatus('disconnected');
      return;
    }

    setIsSyncingDrive(true);
    try {
      // 1. Sincronizar historial de auditorías (JSONs)
      const response = await fetch(`/api/drive-history?accessToken=${driveToken}`);
      if (!response.ok) throw new Error('Fallo al sincronizar historial de Drive');
      
      const data = await response.json();
      if (data.calls && Array.isArray(data.calls)) {
        setCalls(prev => {
          const combined = [...prev];
          const existingIds = new Set(prev.map(c => c.id));
          
          data.calls.forEach((driveCall: SalesCall) => {
            if (!existingIds.has(driveCall.id)) {
              combined.push({
                ...driveCall,
                isFromDrive: true
              });
            }
          });
          
          return combined.sort((a, b) => 
            new Date(b.metadata.uploadedAt).getTime() - new Date(a.metadata.uploadedAt).getTime()
          );
        });
      }

      // 2. Sincronizar lista de grabaciones disponibles (Audios nuevos)
      const q = encodeURIComponent("mimeType contains 'audio/' and trashed = false");
      const recordingsUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size,modifiedTime)&pageSize=15&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;
      const recResp = await fetch(recordingsUrl, {
        headers: { 'Authorization': `Bearer ${driveToken}` }
      });
      
      if (recResp.ok) {
        const recData = await recResp.json();
        setDriveRecordings(recData.files || []);
      }

      setDriveStatus('connected');
    } catch (err) {
      console.error("Error syncing with Drive:", err);
      setDriveStatus('error');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Cargar llamadas reales de forma dinamica al montar el componente y fusionar con el cache local del dispositivo
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    
    // 1. Cargar cache local
    let cachedCalls: SalesCall[] = [];
    try {
      const localData = localStorage.getItem('utel_audited_calls_v1');
      if (localData) {
        cachedCalls = JSON.parse(localData);
      }
    } catch (e) {
      console.error("Error al cargar historial local:", e);
    }

    // 2. Cargar del servidor efímero
    fetch('/api/llamadas')
      .then(async res => {
        if (!res.ok) throw new Error('Respuesta del servidor fallida');
        return await res.json();
      })
      .then(serverData => {
        if (serverData && Array.isArray(serverData)) {
          const serverIds = new Set(serverData.map(c => c.id));
          const merged = [...serverData];
          
          cachedCalls.forEach(cached => {
            if (!serverIds.has(cached.id)) {
              merged.push(cached);
            }
          });

          setCalls(merged);
          
          if (merged.length > 0) {
            const lastActiveId = localStorage.getItem('utel_last_selected_call_id');
            if (lastActiveId && merged.some(c => c.id === lastActiveId)) {
              setSelectedCallId(lastActiveId);
            } else {
              setSelectedCallId(merged[0].id);
            }
          }
        } else if (cachedCalls.length > 0) {
          setCalls(cachedCalls);
          setSelectedCallId(cachedCalls[0].id);
        }
      })
      .catch(err => {
        console.error("Usando cache local:", err);
        if (cachedCalls.length > 0) {
          setCalls(cachedCalls);
          setSelectedCallId(cachedCalls[0].id);
        }
      })
      .finally(() => {
        setIsLoading(false);
        // 3. Sincronizar con Drive en segundo plano
        syncWithDrive();
      });
  }, [isAuthenticated]);

  // Guardar en cache local cuando cambien las llamadas de forma reactiva (excepto en estado de carga)
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('utel_audited_calls_v1', JSON.stringify(calls));
      } catch (e) {
        console.error("Error al guardar cache local:", e);
      }
    }
  }, [calls, isLoading]);

  // Guardar la última llamada seleccionada
  useEffect(() => {
    if (selectedCallId) {
      localStorage.setItem('utel_last_selected_call_id', selectedCallId);
    }
  }, [selectedCallId]);

  const [isImportingFromDrive, setIsImportingFromDrive] = useState<string | null>(null);

  const handleImportFromDrive = async (fileId: string, fileName: string) => {
    const driveToken = localStorage.getItem('utel_google_drive_token');
    if (!driveToken) return;

    setIsImportingFromDrive(fileId);
    try {
      const response = await fetch('/api/drive-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName,
          accessToken: driveToken,
          engine: 'gemini' // Por defecto en el import rápido
        })
      });

      if (!response.ok) {
        throw new Error('Fallo al importar la grabación seleccionada.');
      }

      const completedCall = await response.json();
      handleUploadSuccess(completedCall);
    } catch (err) {
      console.error("Error importing from drive list:", err);
      alert('Error al procesar la grabación de Drive. Por favor, intenta usar el cargador avanzado.');
    } finally {
      setIsImportingFromDrive(null);
    }
  };

  const activeCall = calls.find(c => c.id === selectedCallId) || calls[0];

  const handleUploadSuccess = async (newCall: SalesCall) => {
    setCalls(prev => {
      const filtered = prev.filter(c => c.id !== newCall.id);
      return [newCall, ...filtered];
    });
    setSelectedCallId(newCall.id);

    // Intentar guardar en Drive automáticamente si hay token
    const driveToken = localStorage.getItem('utel_google_drive_token');
    if (driveToken) {
      try {
        await fetch('/api/drive-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callData: newCall, 
            accessToken: driveToken 
          })
        });
        console.log("Auditoría sincronizada exitosamente con Google Drive.");
      } catch (err) {
        console.error("Error al guardar respaldo en Drive:", err);
      }
    }
  };

  const handleLoadDemo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cargar-demo', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`Error de servidor (${response.status})`);
      }
      const newCall = await response.json();
      setCalls(prev => {
        return [newCall, ...prev];
      });
      setSelectedCallId(newCall.id);
    } catch (err: any) {
      console.error("Error al cargar demo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCall = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/llamadas/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Error eliminando registro del servidor:", err);
    }

    // Limpiar audio guardado en IndexedDB local
    try {
      await deleteAudioFromDB(id);
    } catch (dbErr) {
      console.error("Error al borrar el audio local indexado:", dbErr);
    }

    const updated = calls.filter(c => c.id !== id);
    setCalls(updated);
    if (selectedCallId === id) {
      setSelectedCallId(updated[0]?.id || '');
    }
  };

  // Cálculos de KPI de todas las llamadas de la base de datos local
  const totalCallsCount = calls.length;
  const avgSalesScore = Math.round(
    calls.reduce((acc, curr) => acc + curr.score.global, 0) / (totalCallsCount || 1)
  );
  const salesClosedCount = calls.filter(c => c.analysis.salesOutcome === 'venta_cerrada').length;
  const convertRatePercent = Math.round((salesClosedCount / (totalCallsCount || 1)) * 100);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-white tracking-wide">Iniciando Servidor de Auditoría...</h3>
            <p className="text-xs text-gray-500">Comprobando credenciales seguras de supervisor.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-indigo-950 selection:text-indigo-200 pb-12">
      
      {/* Dynamic Navigation/Header */}
      <header className="sticky top-0 z-40 bg-[#111111] border-b border-[#222222] py-4 px-6 md:px-12 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <FileAudio className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white font-display tracking-tight flex items-center gap-1.5 leading-none">
              Auditor
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                v1.0.1
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Gestión de Calidad Educativa y Matriz PCE</p>
          </div>
        </div>

        {/* Header Call Selector and Control Button to avoid visual wear and tear */}
        <div className="flex items-center gap-3">
          {calls.length > 0 && (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <span className="text-[10.5px] text-gray-400 font-mono font-semibold hidden md:inline">Audición:</span>
              <select
                value={selectedCallId}
                onChange={(e) => setSelectedCallId(e.target.value)}
                className="bg-[#181818] border border-zinc-800 hover:border-gray-550 text-gray-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[150px] sm:max-w-[220px] truncate font-medium transition-all"
                id="header-call-quick-select"
              >
                {calls.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.metadata.fileName} ({c.score.global}%) {c.isLocalCacheOnly ? '[Solo Local]' : '[Guardado]'}
                  </option>
                ))}
              </select>
            </div>
          )}



          {/* Supervisor Badge Profile */}
          <div className="flex items-center gap-2 border-r border-[#222222] pr-3 mr-1">
            <div className="flex flex-col text-right hidden sm:block">
              <span className="text-[9px] text-[#00c8a5] font-mono leading-none font-bold uppercase tracking-widest block">SUPERVISOR</span>
              <span className="text-xs text-gray-300 font-semibold truncate mt-0.5 max-w-[125px] inline-block" title={sessionUser}>{sessionUser}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-500/15"
              id="header-logout-button"
              title="Cerrar Sesión de Supervisor"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsManagerOpen(!isManagerOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-500/25 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer shadow-sm"
            id="toggle-manager-button"
            title="Cargar grabaciones de audio o audiciones de pruebas"
          >
            <Plus className="w-4 h-4" />
            <span>{isManagerOpen ? 'Ocultar Cargador' : 'Cargar / Gestionar'}</span>
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 flex flex-col gap-8">
        
        {/* KPI Row (Visual Dashboard) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div id="kpi-card-total" className="bg-[#121212] p-5 rounded-2xl border border-[#222222] shadow-md flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/15 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <ListMusic className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium block">Auditorías Totales</span>
              <div className="text-2xl font-light text-white font-display">{totalCallsCount} <span className="text-xs text-gray-500 font-normal">llamadas</span></div>
            </div>
          </div>

          {/* Card 2 */}
          <div id="kpi-card-score" className="bg-[#121212] p-5 rounded-2xl border border-[#222222] shadow-md flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium block">Promedio Global Auditor</span>
              <div className="text-2xl font-light text-white">{avgSalesScore}%</div>
            </div>
          </div>

          {/* Card 3 */}
          <div id="kpi-card-conversion" className="bg-[#121212] p-5 rounded-2xl border border-[#222222] shadow-md flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/15 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium block">Eficiencia de Cierres</span>
              <div className="text-2xl font-light text-white font-display">
                {convertRatePercent}% <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-block ml-1 font-bold">{salesClosedCount} de {totalCallsCount}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Collapsible File Manager & Seeder Card Panel */}
        {isManagerOpen && (
          <section className="bg-[#121212] rounded-2xl border border-[#222222] p-6 shadow-xl animate-fadeIn flex flex-col gap-6" id="audio-management-collapsible-panel">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Gestión y Carga de Grabaciones (Local & Test Sandbox)
                </h2>
                <p className="text-xs text-gray-500 mt-1">Sube archivos MP3/WAV o siembra llamadas pre-diseñadas para comprobar la matriz PCE.</p>
              </div>
              <button
                onClick={() => setIsManagerOpen(false)}
                className="text-gray-400 hover:text-white text-xs bg-[#1a1a1a] hover:bg-[#252525] px-3 py-1.5 rounded-lg transition-colors border border-zinc-800 cursor-pointer"
              >
                Ocultar Gestor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Form: AudioUpload component */}
              <div className="md:col-span-12 lg:col-span-7">
                <AudioUpload onUploadSuccess={(newCall) => {
                  handleUploadSuccess(newCall);
                  setIsManagerOpen(false); // auto-collapse to center focus
                }} />
              </div>

              {/* Right Side: Quick History list and Help */}
              <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-4">
                <div className="bg-[#181818] p-5 rounded-2xl border border-[#222222]">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2 flex-wrap gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold font-mono">
                        Listado de Audiciones ({calls.length})
                      </span>
                      <span className="text-[9px] text-[#00c8a5] font-mono font-medium flex items-center gap-1 mt-0.5">
                        <Database className="w-3 h-3" /> Caché de dispositivo activo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLoadDemo}
                        disabled={isLoading}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 rounded px-2.5 py-1 hover:bg-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <span>+ Caso de Prueba</span>
                      </button>
                      {calls.length > 0 && (
                        <button
                          onClick={async () => {
                            if (window.confirm('¿Estás seguro de que deseas vaciar el caché local de este dispositivo?')) {
                              localStorage.removeItem('utel_audited_calls_v1');
                              localStorage.removeItem('utel_last_selected_call_id');
                              try {
                                await clearAllAudiosFromDB();
                              } catch (dbErr) {
                                console.error("Error al vaciar IndexedDB local:", dbErr);
                              }
                              setIsLoading(true);
                              fetch('/api/llamadas')
                                .then(res => res.json())
                                .then(data => {
                                  if (data && Array.isArray(data)) {
                                    setCalls(data);
                                    setSelectedCallId(data[0]?.id || '');
                                  } else {
                                    setCalls([]);
                                    setSelectedCallId('');
                                  }
                                })
                                .catch(() => {
                                  setCalls([]);
                                  setSelectedCallId('');
                                })
                                .finally(() => setIsLoading(false));
                            }
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title="Vaciar el historial de llamadas en este dispositivo"
                        >
                          Limpiar Caché
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : calls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <p className="text-xs text-gray-500 italic">No hay audiciones registradas.</p>
                      <button
                        onClick={handleLoadDemo}
                        className="text-xs text-indigo-400 hover:underline font-bold"
                      >
                        Hacer clic para sembrar caso de prueba
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {calls.map((call) => {
                        const isActive = call.id === selectedCallId;
                        return (
                          <div
                            key={call.id}
                            onClick={() => setSelectedCallId(call.id)}
                            className={`group relative p-2 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                              isActive
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                : 'bg-[#121212] border-[#222222] text-gray-300 hover:bg-[#222222] hover:text-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex flex-col truncate pr-4">
                                <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
                                  {call.metadata.fileName}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className={`text-[9.5px] font-mono ${isActive ? 'text-indigo-200' : 'text-gray-500'}`}>
                                    Score: {call.score.global}% • {Math.round(call.metadata.duration)}s
                                  </span>
                                  {call.isLocalCacheOnly ? (
                                    <span className="text-[8.5px] bg-amber-500/10 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-wide">
                                      Solo Local
                                    </span>
                                  ) : (
                                    <span className="text-[8.5px] bg-[#00c8a5]/10 text-[#00c8a5] font-mono px-1.5 py-0.5 rounded border border-[#00c8a5]/20 font-bold uppercase tracking-wide">
                                      Guardado
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                onClick={(e) => handleDeleteCall(call.id, e)}
                                className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${
                                  isActive 
                                    ? 'hover:bg-indigo-700 text-indigo-200 hover:text-white' 
                                    : 'hover:bg-zinc-800 text-gray-400 hover:text-rose-450'
                                }`}
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Workflow Card */}
                <div className="bg-[#0f0f0f] text-gray-400 p-4 rounded-xl border border-[#222222] text-[11px] flex flex-col gap-2">
                  <h4 className="font-bold text-white flex items-center gap-1 leading-none">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    Flujo de Trabajo
                  </h4>
                  <ul className="list-disc list-inside flex flex-col gap-1 pl-1 text-gray-400">
                    <li>Sube archivos <strong className="text-white font-medium">MP3, WAV o MPEG</strong>.</li>
                    <li>Soporta servidores locales o procesamiento en la nube corporativa.</li>
                    <li>El sistema califica los <strong className="text-white font-medium">22 parámetros oficiales</strong> de la rúbrica PCE.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dashboard Workspace - 100% full-width to prevent visual wear and tear */}
        <div className="w-full">
          {activeCall ? (
            <AuditorDashboard activeCall={activeCall} />
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 animate-fadeIn">
              {/* Left Side: Empty State / Intro */}
              <div className="lg:col-span-7 bg-[#121212] rounded-2xl border border-[#222222] p-12 text-center shadow-lg flex flex-col gap-5 items-center justify-center min-h-[400px]">
                <FileAudio className="w-16 h-16 text-indigo-500/30 animate-pulse" />
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Historial de Auditoría PCE</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-md mx-auto">
                    Selecciona una llamada del historial a la derecha o utiliza el cargador de archivos para procesar una nueva audición.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  <button
                    onClick={() => setIsManagerOpen(true)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Audición / Drive
                  </button>
                  <button
                    onClick={handleLoadDemo}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Cargando...' : 'Caso de Prueba'}
                  </button>
                </div>
              </div>

              {/* Right Side: Historial Siempre Visible en el Empty State */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-[#121212] rounded-2xl border border-[#222222] p-6 shadow-lg h-full overflow-hidden flex flex-col">
                  {/* Nueva sección: Grabaciones de audio directas de Drive */}
                  {driveRecordings.length > 0 ? (
                    <div className="mb-8 animate-fadeIn">
                      <div className="flex items-center justify-between mb-3 border-b border-[#222222] pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-amber-600/10 rounded-lg text-amber-500">
                            <Folder className="w-4 h-4" />
                          </div>
                          <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Grabaciones en Drive</h3>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono italic">Nuevas para auditar</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {driveRecordings.map((rec) => (
                          <div 
                            key={rec.id}
                            className="p-2.5 bg-[#161616] border border-zinc-800 rounded-xl flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-[11px] font-medium text-gray-300 truncate">{rec.name}</p>
                                <p className="text-[9px] text-gray-500">{new Date(rec.modifiedTime).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleImportFromDrive(rec.id, rec.name)}
                              disabled={!!isImportingFromDrive}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-[9px] font-bold rounded-lg transition-all active:scale-[0.95]"
                            >
                              {isImportingFromDrive === rec.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                'AUDITAR'
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : driveStatus === 'connected' ? (
                    <div className="mb-8 p-4 bg-[#151515] border border-dashed border-zinc-800 rounded-xl text-center">
                      <Folder className="w-5 h-5 text-amber-500 mx-auto mb-2 opacity-70" />
                      <p className="text-[11px] font-bold text-gray-200">¿No aparecen tus grabaciones recientes?</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        En cuentas institucionales, tus archivos suelen estar dentro de subcarpetas o en <strong>Unidades Compartidas</strong> de tu organización.
                      </p>
                      <p className="text-[10.5px] text-indigo-400 font-semibold mt-2.5">
                        Usa el cargador de audio y haz clic en "Importar de Drive" para explorar carpetas y Unidades Compartidas.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between mb-6 border-b border-[#222222] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <Activity className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historial en Drive</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={syncWithDrive}
                        disabled={isSyncingDrive}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-indigo-400 transition-all active:rotate-180 duration-500"
                        title="Sincronizar con Drive"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin text-indigo-400' : ''}`} />
                      </button>
                      <span className="text-[10px] bg-zinc-800 text-gray-400 px-2 py-0.5 rounded-full font-mono">{calls.length} Items</span>
                    </div>
                  </div>

                  {calls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                      <Database className="w-8 h-8 opacity-20 mb-3" />
                      <p className="text-xs italic">No hay llamadas en el historial local.</p>
                      <p className="text-[10px] mt-1 opacity-60">Sube un audio para comenzar.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto pr-2 max-h-[450px] custom-scrollbar">
                      {calls.map((call) => (
                        <div
                          key={call.id}
                          onClick={() => setSelectedCallId(call.id)}
                          className="group p-3 bg-[#181818] hover:bg-[#222222] border border-zinc-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                call.score.global >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 
                                call.score.global >= 60 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                <FileAudio className="w-5 h-5" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-gray-200 truncate">{call.metadata.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-mono">{new Date(call.metadata.uploadedAt).toLocaleDateString()}</span>
                                  <span className={`text-[10px] font-bold ${
                                    call.score.global >= 80 ? 'text-emerald-500' : 
                                    call.score.global >= 60 ? 'text-amber-500' : 'text-rose-500'
                                  }`}>{call.score.global}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleDeleteCall(call.id, e)}
                                className="p-1.5 text-gray-500 hover:text-rose-450 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-[#222222]">
                    <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-start gap-3">
                      <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Estas auditorías están seguras en tu cuenta de <strong className="text-indigo-400">Google Drive</strong>. Puedes recuperarlas desde cualquier dispositivo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
