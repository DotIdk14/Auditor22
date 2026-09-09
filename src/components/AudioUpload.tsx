import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Check, AlertCircle, Play, Settings, RefreshCw, Layers, ShieldCheck, Folder } from 'lucide-react';
import { SalesCall } from '../types';
import { saveAudioToDB } from '../utils/audioCache';

// Versión portfolio: sin integración con Google (login con Google y Drive desactivados).

interface AudioUploadProps {
  onUploadSuccess: (newCall: SalesCall) => void;
}

export default function AudioUpload({ onUploadSuccess }: AudioUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<'gemini' | 'ollama'>('gemini');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadDemo = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir el explorador de archivos
    setIsLoadingDemo(true);
    setUploadError(null);
    try {
      const response = await fetch('/api/cargar-demo', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`Error de servidor (${response.status})`);
      }
      const data = await response.json();
      onUploadSuccess(data);
    } catch (err: any) {
      console.error("Error al cargar demo:", err);
      setUploadError(err.message || 'Error al cargar la llamada de prueba.');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Formatear tamaño de archivos
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Generar un ID Único seguro antes de subir el archivo
  const generateUniqueId = (fileName: string): string => {
    const timestamp = Date.now();
    const cleanName = fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8);
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `call_${cleanName}_${timestamp}_${randomSuffix}`;
  };

  // Versión portfolio: estados del explorador de Drive eliminados (integración desactivada).

  // Versión portfolio: importación desde Drive desactivada (sin credenciales reales).
  const handleDriveImport = async () => {
    setUploadError('La importación desde Google Drive está desactivada en la versión portfolio para no exponer credenciales reales. Usa la carga local de audio o una llamada de prueba.');
  };

  // Versión portfolio: funciones del explorador de Drive eliminadas (integración desactivada).

  const handleFileSelection = (file: File) => {
    // Validar extensiones estándar de audio (incluyendo mpeg)
    const isWav = file.name.endsWith('.wav');
    const isMpeg = file.name.endsWith('.mpeg') || file.name.endsWith('.mpg');
    const isMp3 = file.name.endsWith('.mp3') || file.type === 'audio/mpeg' || file.type === 'audio/mp3';
    
    if (!isMp3 && !isWav && !isMpeg) {
      setUploadError('Formato no soportado. Por favor, selecciona únicamente archivos de audio (.mp3, .mpeg o .wav)');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    const uniqueId = generateUniqueId(file.name);
    setGeneratedId(uniqueId);
  };

  const startAnalysis = async () => {
    if (!selectedFile) return;

    setUploadError(null);
    // Animación de Progreso de Subida Real/Dinámica hacia AssemblyAI
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('engine', engine);
      formData.append('ollamaUrl', ollamaUrl);
      formData.append('ollamaModel', ollamaModel);

      // Simular progresión de carga y análisis mientras se completa la solicitud HTTP
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null) return null;
          if (prev < 92) return prev + Math.floor(Math.random() * 6) + 2;
          return prev;
        });
      }, 2500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMessage = 'Ocurrió un error en el servidor al auditar el audio.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          errorMessage = `Error de servidor (${response.status} ${response.statusText || 'Error desconocido'})`;
        }
        throw new Error(errorMessage);
      }

      let completedCall;
      try {
        completedCall = await response.json();
      } catch (jsonErr) {
        throw new Error('La respuesta del servidor de audición no tiene un formato de datos (JSON) válido.');
      }

      // Guardar el archivo de audio original en el IndexedDB local vinculado al ID de llamada final
      try {
        await saveAudioToDB(completedCall.id, selectedFile);
      } catch (dbErr) {
        console.error("Error al persistir audio en IndexedDB local:", dbErr);
      }

      setUploadProgress(100);

      setTimeout(() => {
        onUploadSuccess(completedCall);
        setUploadProgress(null);
        setSelectedFile(null);
        setGeneratedId(null);
      }, 700);

    } catch (err: any) {
      console.error("Error cargando llamada:", err);
      setUploadError(err.message || 'Error de red o procesamiento fallido.');
      setUploadProgress(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setGeneratedId(null);
    setUploadError(null);
  };

  return (
    <div className="bg-[#121212] rounded-2xl border border-[#222222] p-6 shadow-sm">
      <h2 className="text-base font-semibold text-white tracking-tight mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-indigo-400" />
        Auditoría de Llamada de Ventas
      </h2>

      {/* 1. Paso de Selección / Dropzone si no hay archivo */}
      {!selectedFile && (
        <div className="space-y-4">
          <div
            id="drag-and-drop-container"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerInputClick}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-950/20 scale-[1.01]'
                : 'border-zinc-800 hover:border-indigo-500/60 hover:bg-[#161616]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mp3,audio/mpeg,.wav,audio/wav,.mpeg,.mpg"
              onChange={handleFileChange}
              className="hidden"
              id="audio-file-input"
            />

            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3">
              <FileAudio className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-gray-300">
              Arrastra y suelta tu archivo de audio <span className="text-indigo-400 font-semibold text-xs bg-indigo-500/10 border border-indigo-550/20 px-2 py-0.5 rounded-full inline-block">MP3 / MPEG / WAV</span> aquí o haz clic para explorar
            </p>
            <p className="text-xs text-gray-500 mt-2">
              El archivo se cargará localmente antes de procesarse. Soporta hasta 50 MB
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleDriveImport}
              title="Importación desde Drive desactivada en la versión portfolio"
              className="px-4 py-2.5 bg-[#121212] text-gray-500 border border-zinc-800 rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
            >
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              Importar de Drive (desactivado)
            </button>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              className="px-4 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 active:scale-[0.98] text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileAudio className={`w-3.5 h-3.5 ${isLoadingDemo ? 'animate-spin' : ''}`} />
              {isLoadingDemo ? 'Generando...' : 'Llamada de Prueba'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Archivo Seleccionado y Opciones de Configuración */}
      {selectedFile && uploadProgress === null && (
        <div className="space-y-4 animate-fadeIn">
          {/* Ficha del Archivo */}
          <div className="p-4 bg-[#181818] border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg flex-shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-200 truncate pr-4">{selectedFile.name}</p>
                <p className="text-xs text-mono text-gray-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={cancelSelection}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 hover:bg-rose-950/20 rounded-lg transition-colors border border-transparent hover:border-rose-900/30"
            >
              Cambiar Archivo
            </button>
          </div>

          {/* Selector de Motor de IA */}
          <div className="p-5 bg-[#161616] border border-zinc-800/80 rounded-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#222222]">
              <Settings className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Configuración del Motor de Auditoría</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Opción Estándar */}
              <div
                onClick={() => setEngine('gemini')}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  engine === 'gemini'
                    ? 'border-indigo-500/80 bg-indigo-950/10 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-900/40 text-gray-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Motor de Auditoría Estándar
                  </span>
                  {engine === 'gemini' && <div className="w-2 h-2 bg-indigo-400 rounded-full" />}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Configuración optimizada para un análisis crítico, alta precisión y velocidad de respuesta.
                </p>
              </div>

              {/* Opción Ollama */}
              <div
                onClick={() => setEngine('ollama')}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  engine === 'ollama'
                    ? 'border-emerald-500/80 bg-emerald-950/10 text-emerald-200'
                    : 'border-zinc-800 bg-zinc-900/40 text-gray-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Servidor Local de Análisis
                  </span>
                  {engine === 'ollama' && <div className="w-2 h-2 bg-emerald-400 rounded-full" />}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Realiza el procesamiento en un servidor de red local para mayor privacidad de datos.
                </p>
              </div>
            </div>

            {/* Campos de configuración adicionales para Ollama */}
            {engine === 'ollama' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 block font-medium">Endpoint / Host de Ollama</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-zinc-800 text-xs rounded px-2.5 py-1.5 text-white font-mono focus:border-emerald-500/60 focus:outline-none"
                    placeholder="http://localhost:11434"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 block font-medium">Modelo Descargado (Servidor)</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-zinc-800 text-xs rounded px-2.5 py-1.5 text-white font-mono focus:border-emerald-500/60 focus:outline-none"
                    placeholder="llama3"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 text-[10px] text-emerald-400 bg-emerald-950/15 border border-emerald-900/20 rounded p-2 mt-1">
                  💡 <strong>Nota del Desarrollador:</strong> Asegúrate de levantar Ollama localmente (<code>ollama serve</code>) y habilitar los permisos de CORS de origen cruzado de manera que el servidor pueda conectarse. El modelo (ej. <code>llama3</code> o <code>mistral</code>) debe estar descargado (<code>ollama pull llama3</code>).
                </div>
              </div>
            )}
          </div>

          {/* Botón Iniciar Transcripción como solicitó */}
          <button
            onClick={startAnalysis}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Transcripción y Auditoría
          </button>
        </div>
      )}

      {/* 3. Barra de Progreso Activa */}
      {uploadProgress !== null && (
        <div className="p-8 border border-zinc-800 bg-[#161616] rounded-xl text-center space-y-4 animate-pulse">
          <div className="flex items-center justify-between mb-1 max-w-md mx-auto">
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500">PROCE_LLAMADA_STAGED</span>
            <span className="text-xs font-bold text-indigo-400">{uploadProgress}%</span>
          </div>
          <div className="w-full max-w-md mx-auto bg-[#1e1e1e] rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-indigo-550 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {generatedId && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-mono">
              <Check className="w-3 h-3 text-emerald-400" />
              ID: <span className="font-bold text-gray-400">{generatedId}</span>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs text-gray-300 font-medium flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              {uploadProgress < 40 
                ? 'Estableciendo conexión segura...' 
                : uploadProgress < 80 
                ? 'Analizando diálogos y locutores...' 
                : 'Ejecutando auditoría y análisis emocional...'}
            </p>
            <p className="text-[11px] text-gray-500">
              Esta operación puede tomar de 30 a 60 segundos dependiendo de la duración del audio.
            </p>
          </div>
        </div>
      )}

      {/* Versión portfolio: modal del explorador de Drive eliminado (integración desactivada). */}

      {/* Avisador de errores */}

      {uploadError && (
        <div id="upload-error-box" className="mt-4 p-3 bg-rose-950/20 text-rose-400 border border-rose-900/30 text-xs rounded-lg flex items-start gap-2 max-w-full overflow-hidden break-words leading-relaxed">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{uploadError}</span>
        </div>
      )}

    </div>
  );
}
