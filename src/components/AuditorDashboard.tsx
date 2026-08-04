import React, { useRef, useState, useEffect } from 'react';
import { getAudioFromDB } from '../utils/audioCache';
import { 
  Play, 
  Volume2, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Info,
  Award,
  AlertCircle,
  Check,
  X,
  GraduationCap,
  BookOpen,
  Briefcase,
  Users,
  Download
} from 'lucide-react';
import { SalesCall, TranscriptionUtterance, UtelChecklistItem } from '../types';
import { downloadPDFReport, downloadCSVReport, downloadTranscriptionPDF } from '../utils/reportGenerator';

interface AuditorDashboardProps {
  activeCall: SalesCall;
}

export default function AuditorDashboard({ activeCall }: AuditorDashboardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [audioUrl, setAudioUrl] = useState<string>(activeCall.metadata.url);

  useEffect(() => {
    let active = true;
    let urlToRevoke = '';

    const loadLocalAudio = async () => {
      try {
        const cachedBlob = await getAudioFromDB(activeCall.id);
        if (cachedBlob && active) {
          const localUrl = URL.createObjectURL(cachedBlob);
          urlToRevoke = localUrl;
          setAudioUrl(localUrl);
          return;
        }
      } catch (err) {
        console.error("Error al cargar audio del IndexedDB:", err);
      }
      
      if (active) {
        setAudioUrl(activeCall.metadata.url);
      }
    };

    loadLocalAudio();

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [activeCall.id, activeCall.metadata.url]);
  
  // Registrar el ID del item de la lista UTEL PCE que está expandido
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>("C1");
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Saltar al segundo exacto de la frase seleccionada en la transcripción
  const handleSeekToSentence = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (timeInSeconds === undefined || timeInSeconds === null || isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'interesado':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-md font-medium">Interesado / Receptivo</span>;
      case 'receptivo':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-1 rounded-md font-medium">Receptivo</span>;
      case 'molesto':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-2.5 py-1 rounded-md font-medium">Molesto / Altiva Tensión</span>;
      default:
        return <span className="bg-zinc-800 text-gray-300 border border-zinc-700 text-xs px-2.5 py-1 rounded-md font-medium">Neutral / Indiferente</span>;
    }
  };

  // Convertir el resultado comercial en badge
  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'venta_cerrada':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 rounded-md font-semibold">Venta Cerrada 🎉</span>;
      case 'interesado_seguimiento':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1 rounded-md font-semibold">Seguimiento CRM 📅</span>;
      case 'agenda_demostracion':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-3 py-1 rounded-md font-semibold">Demo Agendada 🖥️</span>;
      default:
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-3 py-1 rounded-md font-semibold">No Interesado ❌</span>;
    }
  };

  const getSentimentBubbleStyle = (sentiment: string, isSpeakerSeller: boolean) => {
    if (isSpeakerSeller) {
      switch (sentiment) {
        case 'positive':
          return 'bg-[#061c13] border border-emerald-500/15 text-gray-100 hover:border-emerald-500/30 hover:bg-[#09261b]';
        case 'negative':
          return 'bg-[#240b0f] border border-rose-500/15 text-gray-100 hover:border-rose-500/30 hover:bg-[#2f1015]';
        default:
          return 'bg-[#0e1625] border border-[#3b82f6]/15 text-gray-100 hover:border-[#3b82f6]/30 hover:bg-[#121c2f]';
      }
    } else {
      switch (sentiment) {
        case 'positive':
          return 'bg-[#081a20] border border-teal-500/15 text-gray-100 hover:border-teal-500/35 hover:bg-[#0c242e]';
        case 'negative':
          return 'bg-[#240b0f] border border-rose-500/15 text-gray-100 hover:border-rose-500/35 hover:bg-[#2f1015]';
        default:
          return 'bg-[#161616] border border-zinc-800/80 text-gray-200 hover:border-zinc-700 hover:bg-[#202020]';
      }
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="text-emerald-400 font-bold bg-[#061c13]/80 px-2 py-0.5 rounded-lg border border-emerald-500/15 text-[10px] flex items-center gap-1">😊 Positivo</span>;
      case 'negative':
        return <span className="text-rose-400 font-bold bg-[#240b0f]/80 px-2 py-0.5 rounded-lg border border-rose-500/15 text-[10px] flex items-center gap-1">🚨 Objeción</span>;
      default:
        return <span className="text-yellow-400 font-bold bg-[#242116]/80 px-2 py-0.5 rounded-lg border border-yellow-500/15 text-[10px] flex items-center gap-1">😐 Normal</span>;
    }
  };

  const toggleChecklistDropdown = (id: string) => {
    if (expandedChecklistId === id) {
      setExpandedChecklistId(null);
    } else {
      setExpandedChecklistId(id);
    }
  };

  // Extraer evaluación UTEL si existe, si no generar heurística segura al vuelo
  const utelData = activeCall.analysis.utel;

  // Determinar color de tema para los modelos educativos
  const getModelThemeClass = (type: string) => {
    switch (type) {
      case 'LÍNEA':
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          border: 'border-amber-500/20 bg-[#1e1710]/40',
          text: 'text-amber-400'
        };
      case 'EJECUTIVA':
        return {
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          border: 'border-blue-500/20 bg-[#10171e]/40',
          text: 'text-blue-400'
        };
      case 'HÍBRIDA':
        return {
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          border: 'border-emerald-500/20 bg-[#101e14]/40',
          text: 'text-emerald-400'
        };
      default:
        return {
          badge: 'bg-zinc-800 text-gray-400 border-zinc-700',
          border: 'border-zinc-800 bg-[#121212]',
          text: 'text-zinc-400'
        };
    }
  };

  const modalidad = utelData?.modalidadDetectada || 'NO_DETECTADA';
  const theme = getModelThemeClass(modalidad);

  return (
    <div className="flex flex-col gap-8">
      
      {/* 1. SECCIÓN SUPERIOR: Reproductor de Audio (Izquierda), Rúbrica de Auditoría (Abajo del Reproductor) y Transcripción (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Columna Izquierda (5/12): Reproductor de Audio y la Rúbrica Rediseñada abajo */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Tarjeta del Reproductor */}
          <div className="bg-[#111111] text-white rounded-2xl p-6 shadow-md border border-[#222222] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">AUDITORÍA DE CANAL ACTIVO UTEL</span>
                <h3 className="text-sm font-semibold text-white truncate max-w-xs">{activeCall.metadata.fileName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/25 text-indigo-300 border border-indigo-500/40">
                  {activeCall.id}
                </span>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex flex-col items-center gap-4 py-2">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
                controls
              />
              
              <div className="flex items-center gap-4 w-full">
                {/* Play Button */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (isPlaying) {
                         audioRef.current.pause();
                         setIsPlaying(false);
                      } else {
                         audioRef.current.play().catch(e => console.log('Audio play action context required: ', e));
                         setIsPlaying(true);
                      }
                    }
                  }}
                  className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0"
                  title={isPlaying ? "Pausar" : "Reproducir audio"}
                  id="audio-play-button"
                >
                  {isPlaying ? (
                    <div className="flex gap-1.5 items-center justify-center">
                      <span className="w-1.5 h-4 bg-white rounded-xs animate-bounce" />
                      <span className="w-1.5 h-4 bg-white rounded-xs animate-bounce [animation-delay:0.15s]" />
                    </div>
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Progress Slider */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{formatTime(playbackTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={playbackTime}
                    onChange={(e) => {
                      if (audioRef.current) {
                         audioRef.current.currentTime = parseFloat(e.target.value);
                         setPlaybackTime(parseFloat(e.target.value));
                      }
                    }}
                    className="flex-1 accent-indigo-550 h-1 rounded-lg cursor-pointer opacity-80"
                    id="playback-slider"
                  />
                  <span className="text-xs text-gray-400 font-mono">{formatTime(duration || activeCall.metadata.duration)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center w-full text-xs text-gray-400 border-t border-[#222222] pt-3">
                <div className="flex items-center gap-1.5 opacity-60">
                  <Volume2 className="w-4 h-4" />
                  <span className="font-mono">Estéreo</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  Duración: {Math.round(duration || activeCall.metadata.duration)}s
                </div>
              </div>
            </div>

            <div className="px-3 py-2 bg-[#1a1a1a]/60 rounded-lg border border-[#222222] text-[11px] flex items-center gap-2 text-gray-400">
              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 animate-pulse" />
              <span>Haz clic en los enunciados de la transcripción a la derecha para reproducir desde ese segundo.</span>
            </div>

            {/* Acciones de exportación de Reporte PCE */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#222222]/80">
              <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">EXPORTACIÓN DE AUDITORÍA</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => downloadPDFReport(activeCall)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-rose-500/15 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/30 text-rose-400 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  id="download-pdf-report-btn"
                  title="Descargar reporte detallado en PDF para imprimir o compartir"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span>PDF Completo</span>
                </button>

                <button
                  onClick={() => downloadCSVReport(activeCall)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-[#00c8a5]/15 bg-[#00c8a5]/5 hover:bg-[#00c8a5]/15 hover:border-[#00c8a5]/30 text-[#00c8a5] transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  id="download-csv-report-btn"
                  title="Descargar datos estructurados en formato CSV para MS Excel o Google Sheets"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V3.375m1.125 16.25h1.5m-1.5 0h1.5m0 0h1.5m0 0h1.5m0 0H6.75m10.5 0h1.5m-1.5 0h1.5m0 0h1.5m0 0H18m-11.25 0V6.75m0 0A1.125 1.125 0 018.25 5.625h7.5a1.125 1.125 0 011.125 1.125v12.75" />
                  </svg>
                  <span>CSV de Datos</span>
                </button>
              </div>
            </div>
          </div>

          {/* Rúbrica de Auditoría PCE UTEL */}
          <div className="bg-[#111111] rounded-2xl border border-[#222222] p-6 shadow-md flex flex-col gap-5" id="pce-rubric-card-top">
            <div className="flex items-center justify-between border-b border-[#222222]/80 pb-3">
              <span className="text-xs uppercase tracking-wider text-gray-300 font-bold font-mono">
                RÚBRICA DE AUDITORÍA PCE UTEL
              </span>
              {utelData ? (
                <span className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-black tracking-widest bg-emerald-950/20 text-[#00c8a5] border border-emerald-500/30 uppercase">
                  {utelData.isCompliant ? "Llamada Aprobada" : "Faltan Obligatorios (*)"}
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-black tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-750 uppercase">
                  Auditoría Completa
                </span>
              )}
            </div>

            {/* Calificación del PCE Box (White outlined as in screenshot) */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-transparent border border-gray-400 rounded-2xl">
              {/* Circular Ring Progress */}
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={utelData?.isCompliant ? "text-[#00c8a5]" : "text-amber-500"}
                    strokeDasharray={`${(utelData?.totalScore || activeCall.score.global / 10) * 10}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-xl font-extrabold text-white font-mono">
                    {utelData ? utelData.totalScore.toFixed(1) : (activeCall.score.global / 10).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5">/ 10.0</span>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="font-bold text-white text-base">Calificación del PCE</span>
                <p className="text-xs text-gray-400 leading-normal">
                  Puntaje acumulado sobre las categorías clave verificadas en la llamada. La estructura y ponderación se apega estrictamente a la matriz oficial UTEL.
                </p>
              </div>
            </div>

            {/* Lista Interactiva de Categorías */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] font-mono text-gray-400 font-black uppercase tracking-widest block mb-1">
                Desglose de Puntos Evaluados
              </span>

              <div className="flex flex-col gap-3">
                {utelData?.checklist.map((item: UtelChecklistItem) => {
                  const isExpanded = expandedChecklistId === item.id;
                  const isPassed = item.score >= (item.weight * 0.7);
                  
                  // Truncate title beautifully like in the screenshot e.g. "CONOCE A TU PROSPECTO" -> "CONOCE A TU... "
                  const displayTitle = item.title.length > 15 ? `${item.title.substring(0, 11).toUpperCase()}...` : item.title.toUpperCase();
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`border border-[#222222] rounded-2xl overflow-hidden transition-all duration-200 bg-[#111111]/80 flex flex-col justify-between ${
                        isExpanded ? 'border-indigo-500 bg-[#161616] scale-[1.01]' : 'hover:border-zinc-800'
                      }`}
                    >
                      {/* Categoría Header */}
                      <div 
                        onClick={() => toggleChecklistDropdown(item.id)}
                        className="flex items-center justify-between p-3 px-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 max-w-[80%]">
                          {isPassed ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#00c8a5] flex items-center justify-center text-xs shrink-0 border border-emerald-500/25">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-450 flex items-center justify-center text-xs shrink-0 border border-rose-500/25">
                              <AlertCircle className="w-3" />
                            </div>
                          )}
                          
                          <span className="text-xs font-bold text-gray-300 tracking-wide truncate" title={item.title}>
                            {displayTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold font-mono text-gray-200">
                            {item.score.toFixed(2)} pt
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {/* Detalle Desplegado de Sub-items */}
                      {isExpanded && (
                        <div className="p-3 bg-[#111111]/70 border-t border-[#222222] flex flex-col gap-2.5">
                          <p className="text-[11px] text-gray-300 leading-normal italic bg-neutral-900/30 p-2 rounded border border-neutral-850/50">
                            {item.feedback}
                          </p>
                          
                          {item.subitems && item.subitems.length > 0 && (
                            <div className="flex flex-col gap-2 bg-[#161616]/80 p-2.5 rounded-lg border border-[#222222]/80">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                                Verificación de Parámetros de la Matriz:
                              </span>
                              <div className="grid grid-cols-1 gap-1.5">
                                {item.subitems.map((sub) => (
                                  <div key={sub.id} className="flex items-start justify-between text-xs py-0.5">
                                    <div className="flex items-center gap-2 max-w-[70%]">
                                      {sub.checked ? (
                                        <div className="w-3.5 h-3.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[#00c8a5] flex items-center justify-center text-[9px] scale-90">✓</div>
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded bg-[#202020] border border-[#2d2d2d] text-gray-500 flex items-center justify-center text-[9px] scale-90">𐄂</div>
                                      )}
                                      <span className={`text-[11px] ${sub.checked ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {sub.name}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[10px] text-gray-400 font-semibold">
                                      +{sub.weight.toFixed(2)} pts
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha (7/12): Transcripción de Audio */}
        <div className="lg:col-span-7">
          <div className="bg-[#111111] rounded-2xl border border-[#222222] shadow-md p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Transcripción Cronológica</h2>
                <p className="text-xs text-gray-400">Mapeado de locutores y sentimientos por enunciado</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 flex-wrap">
                <span className="flex items-center gap-1 mr-1"><span className="w-2.2 h-2.2 rounded-full bg-indigo-500 block" /> Vendedor</span>
                <span className="flex items-center gap-1 mr-2"><span className="w-2.2 h-2.2 rounded-full bg-gray-500 block" /> Cliente</span>
                
                <button
                  type="button"
                  onClick={() => downloadTranscriptionPDF(activeCall)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#00c8a5]/25 bg-[#00c8a5]/10 hover:bg-[#00c8a5]/20 text-[#00c8a5] transition-all cursor-pointer outline-none shrink-0"
                  id="download-transcript-pdf-btn"
                  title="Descargar toda la transcripción organizada como un chat en archivo PDF (.pdf)"
                >
                  <Download className="w-3 h-3" />
                  <span>Descargar Chat (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullTranscript(!showFullTranscript)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-indigo-500/25 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-350 transition-all cursor-pointer outline-none shrink-0"
                  id="toggle-full-transcript-top"
                >
                  {showFullTranscript ? "Vista Compacta ↑" : "Mostrar Completo ↓"}
                </button>
              </div>
            </div>

            {/* Diálogo Chat / Timeline */}
            <div className={`flex flex-col gap-6 pr-2 custom-scrollbar flex-1 transition-all ${
              showFullTranscript 
                ? 'max-h-none' 
                : 'min-h-[220px] max-h-[72vh] overflow-y-auto'
            }`}>
              {activeCall.transcription.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8 italic">No hay transcripción disponible.</p>
              ) : (
                activeCall.transcription.map((dialogue: TranscriptionUtterance, index: number) => {
                  const isSeller = dialogue.speaker === 'Vendedor';
                  const isCurrentTime = playbackTime >= dialogue.start && playbackTime <= dialogue.end;

                  return (
                    <div
                      key={index}
                      onClick={() => handleSeekToSentence(dialogue.start)}
                      className={`flex flex-col cursor-pointer group transition-all duration-205 w-full ${
                        isSeller ? 'items-start' : 'items-end'
                      }`}
                      id={`dialogue-row-${index}`}
                    >
                      {/* Header de Hablante */}
                      <div className={`flex items-center gap-2 mb-2 ${isSeller ? 'flex-row' : 'flex-row-reverse'}`}>
                        <span className="text-white font-bold flex items-center gap-1.5">
                          {isSeller ? (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center text-[10px] font-extrabold shadow-md">
                              V
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#374151] border border-zinc-500 text-gray-100 flex items-center justify-center text-[10px] font-extrabold shadow-md">
                              C
                            </div>
                          )}
                          <span className="text-xs font-semibold tracking-wide text-gray-200">{dialogue.speaker}</span>
                        </span>

                        {/* Badge de Horario / Segundo exacto */}
                        <span className="font-mono bg-[#141416] border border-zinc-800 text-gray-300 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {formatTime(dialogue.start)}
                        </span>

                        {/* Badge de Sentimiento */}
                        <span className="scale-95 origin-center">{getSentimentIcon(dialogue.sentiment)}</span>
                      </div>

                      {/* Speech Bubble */}
                      <div
                        className={`rounded-2xl p-5 transition-all duration-300 w-full max-w-[85%] sm:max-w-[75%] md:max-w-[70%] break-words ${getSentimentBubbleStyle(
                          dialogue.sentiment,
                          isSeller
                        )} ${
                          isCurrentTime 
                            ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-950/20' 
                            : 'shadow-sm border border-transparent'
                        }`}
                      >
                        <p className="text-[13.5px] leading-relaxed text-gray-100 whitespace-pre-wrap font-medium">{dialogue.text}</p>
                        <div className="mt-2.5 flex items-center justify-between text-[9.5px] text-gray-500 border-t border-zinc-500/10 pt-2 opacity-30 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="italic">Saltar reproducción al segundo {formatTime(dialogue.start)}</span>
                          <span className="font-mono bg-[#0f0f11] py-0.5 px-1.5 rounded text-gray-400">Confianza: {Math.round(dialogue.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Separador */}
      <div className="border-t border-[#222222] my-1" />

      {/* 2. SECCIÓN DE RESÚMENES, MODALIDAD Y PSICOLOGÍA */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        
        {/* Lado Izquierdo: Resumen Cognitivo y Modalidad Detectada */}
        <div className="flex flex-col gap-6">
          {/* Resumen Ejecutivo del Auditor */}
          <div className="bg-[#121212] rounded-2xl border border-[#222222] p-6 shadow-sm flex flex-col gap-4" id="cognitive-summary-card">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Resumen de Auditoría
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed italic flex-1">
              "{activeCall.analysis.summary}"
            </p>

            <div className="grid grid-cols-2 gap-3 mt-1.5 pt-3 border-t border-[#222222]">
              <div>
                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Temple Cliente</span>
                {getMoodBadge(activeCall.analysis.customerMood)}
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Resultado Comercial</span>
                {getOutcomeBadge(activeCall.analysis.salesOutcome)}
              </div>
            </div>
          </div>

          {/* Modalidad Detectada y Evaluación Detallada */}
          <div className={`rounded-2xl border p-5 shadow-xs flex flex-col gap-3 transition-colors ${theme.border}`} id="modalidad-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-indigo-400 animate-pulse" />
                Análisis de Modalidad
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                {modalidad}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className={`text-sm font-extrabold ${theme.text}`}>
                Justificación de Auditoría
              </h4>
              <div className="text-xs text-gray-300 flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {utelData?.evaluacion_detallada && Object.entries(utelData.evaluacion_detallada).map(([cat, detail]) => (
                  <div key={cat} className="bg-[#1b1b1b] p-2 rounded-lg border border-[#262626]">
                    <span className="font-bold text-[10px] text-gray-400 block mb-0.5 uppercase">{cat}</span>
                    <span className="text-indigo-200">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Percepción y Comportamiento del Cliente */}
        {(() => {
          const emotional = activeCall.analysis.emotionalAnalysis || {
            primaryEmotion: "Receptivo / Interesado",
            emotionalJourney: "Estable con propensión positiva a lo largo del diálogo.",
            purchaseAptitudeScore: Math.round(activeCall.score.global),
            purchaseAptitudeLabel: activeCall.score.global >= 85 ? "Muy Alto" : activeCall.score.global >= 65 ? "Alto" : activeCall.score.global >= 40 ? "Medio" : "Bajo",
            barriersToPurchase: ["Costo de la colegiatura o inscripción inicial"],
            buyingSignals: ["Pregunta detalles de modalidad", "Muestra interés de inicio inmediato"],
            aptitudeReason: `El prospecto demostró una aptitud de compra sólida del ${activeCall.score.global}%.`
          };

          const customerMood = activeCall.analysis.customerMood || 'neutral';
          const moodConfig: Record<string, { emoji: string; text: string; bg: string; border: string; textClass: string }> = {
            receptivo: { emoji: '🤝 Receptivo', text: 'Muestra apertura, escucha activa y responde amablemente.', bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', textClass: 'text-emerald-400' },
            interesado: { emoji: '🤩 Muy Interesado', text: 'Muestra gran entusiasmo por el programa educativo y el costo.', bg: 'bg-teal-950/20', border: 'border-teal-500/30', textClass: 'text-teal-400' },
            neutral: { emoji: '😐 Neutral', text: 'Respuestas pragmáticas, espera aclaración de costos y temario.', bg: 'bg-zinc-900/40', border: 'border-zinc-800', textClass: 'text-gray-400' },
            molesto: { emoji: '⚠️ Molesto / Objeción', text: 'Presenta constantes interrupciones o desacuerdo con ofertas.', bg: 'bg-rose-950/25', border: 'border-rose-500/30', textClass: 'text-rose-400' },
            indiferente: { emoji: '😴 Indiferente', text: 'Monosílabos, parece distraído o con baja atención al asesor.', bg: 'bg-amber-950/20', border: 'border-amber-500/30', textClass: 'text-amber-400' }
          };

          const activeMood = moodConfig[customerMood] || moodConfig.neutral;

          return (
            <div className="bg-[#121212] rounded-2xl border border-[#222222] p-6 shadow-sm flex flex-col gap-5" id="customer-psychology-card">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  Percepción y Comportamiento del Cliente
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  emotional.purchaseAptitudeLabel === 'Muy Alto' || emotional.purchaseAptitudeLabel === 'Alto'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : emotional.purchaseAptitudeLabel === 'Medio'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    : 'bg-rose-500/10 text-rose-450 border-rose-500/25 text-rose-400'
                }`}>
                  Nivel de Cierre: {emotional.purchaseAptitudeLabel}
                </span>
              </div>

              {/* Panel principal en Grid de 2 Columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Widget de Intención de Compra */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/80 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Intención de Compra</span>
                    <p className="text-[11px] text-gray-400">Puntuación numérica estimada a través de objeciones y cierres:</p>
                  </div>
                  
                  <div className="my-3 flex items-center gap-4">
                    {/* Anillo de Porcentaje Visual */}
                    <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-zinc-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={`transition-all duration-1000 ${
                            emotional.purchaseAptitudeScore >= 75
                              ? 'text-[#00c8a5]'
                              : emotional.purchaseAptitudeScore >= 45
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                          strokeWidth="3.2"
                          strokeDasharray={`${emotional.purchaseAptitudeScore}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-sm font-black font-mono text-white">
                        {emotional.purchaseAptitudeScore}%
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            emotional.purchaseAptitudeScore >= 75
                              ? 'bg-[#00c8a5]'
                              : emotional.purchaseAptitudeScore >= 45
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${emotional.purchaseAptitudeScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 block">
                        Clasificación: <strong className="text-gray-300 font-medium">{emotional.purchaseAptitudeLabel} Intención</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Widget de Sentimiento Predominante */}
                <div className={`rounded-xl p-4 border flex flex-col justify-between ${activeMood.bg} ${activeMood.border}`}>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Sentimiento del Cliente</span>
                    <p className="text-[11px] text-gray-400">Tono emocional predominante según el motor auditivo:</p>
                  </div>

                  <div className="my-2.5 flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0 bg-black/20 p-2 rounded-lg border border-white/5">
                      {activeMood.emoji.split(' ')[0]}
                    </div>
                    <div>
                      <span className={`text-sm font-black ${activeMood.textClass} block`}>
                        {activeMood.emoji.split(' ').slice(1).join(' ')}
                      </span>
                      <p className="text-[11px] text-gray-300 leading-tight">
                        {activeMood.text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trayecto Emocional y Diagnóstico de Auditoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#171717] p-3.5 rounded-xl border border-zinc-800/80">
                <div className="space-y-1 border-b md:border-b-0 md:border-r border-zinc-800 pb-2.5 md:pb-0 md:pr-3">
                  <span className="text-[9px] text-indigo-400 font-mono tracking-wider block uppercase font-bold">Camino Mental / Transición</span>
                  <span className="text-xs text-indigo-300 font-medium">{emotional.primaryEmotion}</span>
                  <p className="text-[11px] text-gray-400 leading-normal italic">
                    "{emotional.emotionalJourney}"
                  </p>
                </div>
                <div className="space-y-1 pt-2.5 md:pt-0 md:pl-3">
                  <span className="text-[9px] text-[#00c8a5] font-mono tracking-wider block uppercase font-bold">Diagnóstico Cognitivo</span>
                  <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                    {emotional.aptitudeReason}
                  </p>
                </div>
              </div>

              {/* Señales vs Objeciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#00c8a5] rounded-full" /> Señales de Compra Detectadas
                  </span>
                  <div className="flex flex-col gap-1">
                    {emotional.buyingSignals && emotional.buyingSignals.length > 0 ? (
                      emotional.buyingSignals.map((sig: string, i: number) => (
                        <div key={i} className="text-[11px] text-gray-300 bg-[#161616] p-1.5 px-2.5 border border-zinc-800/80 rounded-lg flex items-start gap-2">
                          <span className="text-[#00c8a5] font-bold">✓</span>
                          <span>{sig}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-500 italic">No se observaron señales directas.</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Objeciones / Barreras
                  </span>
                  <div className="flex flex-col gap-1">
                    {emotional.barriersToPurchase && emotional.barriersToPurchase.length > 0 ? (
                      emotional.barriersToPurchase.map((bar: string, i: number) => (
                        <div key={i} className="text-[11px] text-gray-300 bg-[#161616] p-1.5 px-2.5 border border-zinc-800/80 rounded-lg flex items-start gap-2">
                          <span className="text-rose-450 font-bold">🚨</span>
                          <span>{bar}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2 text-center rounded border border-emerald-900/20">Sin barreras explícitas detectadas.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* 3. SECCIÓN DE RETROALIMENTACIÓN Y COACHING */}
      <div className="bg-[#121212] rounded-2xl border border-[#222222] p-6 shadow-sm flex flex-col gap-5 w-full" id="advisor-performance-card">
        <div className="border-b border-[#222222] pb-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-400" />
            Coaching de Desempeño Educativo y Áreas de Mejora del Asesor
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Strengths */}
          <div className="flex flex-col gap-2.5 bg-[#121212]">
            <h4 className="text-xs font-bold text-emerald-450 text-[#00c8a5] flex items-center gap-1 tracking-wider uppercase pb-1 border-b border-emerald-500/10">
              <ThumbsUp className="w-3.5 h-3.5" />
              Fortalezas Auditadas
            </h4>
            <ul className="flex flex-col gap-2">
              {activeCall.analysis.strengths.map((str, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#00c8a5] rounded-full mt-1.5 flex-shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="flex flex-col gap-2.5 md:border-l md:border-t-0 border-[#222222] md:pl-6 pt-4 md:pt-0">
            <h4 className="text-xs font-bold text-rose-450 text-rose-400 flex items-center gap-1 tracking-wider uppercase pb-1 border-b border-rose-500/10">
              <ThumbsDown className="w-3.5 h-3.5" />
              Áreas de Oportunidad
            </h4>
            <ul className="flex flex-col gap-2">
              {activeCall.analysis.weaknesses.map((weak, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span>{weak}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div className="flex flex-col gap-2.5 md:border-l md:border-t-0 border-[#222222] md:pl-6 pt-4 md:pt-0">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1 tracking-wider uppercase pb-1 border-b border-indigo-500/10">
              <Calendar className="w-3.5 h-3.5" />
              Próximos Pasos Recomendados
            </h4>
            <ul className="flex flex-col gap-2">
              {activeCall.analysis.nextSteps.map((step, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5 bg-[#181818] p-2.5 rounded-lg border border-[#222222]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>


    </div>
  );
}
