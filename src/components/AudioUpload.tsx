import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Check, AlertCircle, Play, Settings, RefreshCw, Layers, ShieldCheck, Database, Search, Folder, X, ChevronRight, ArrowLeft, Home, HardDrive } from 'lucide-react';
import { SalesCall } from '../types';
import { saveAudioToDB } from '../utils/audioCache';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

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

  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');

  const [activeFolderId, setActiveFolderId] = useState<string>('root');
  const [navigationHistory, setNavigationHistory] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'Mi Unidad' }
  ]);
  const [sharedDrives, setSharedDrives] = useState<any[]>([]);
  const [driveTab, setDriveTab] = useState<'my-drive' | 'shared-drives' | 'recent'>('my-drive');

  const fetchDriveFiles = async (
    token: string,
    folderId: string = 'root',
    tab: 'my-drive' | 'shared-drives' | 'recent' = 'my-drive'
  ) => {
    setIsDriveLoading(true);
    setUploadError(null);
    try {
      if (tab === 'shared-drives') {
        // Listar Unidades Compartidas (Team drives)
        const url = `https://www.googleapis.com/drive/v3/shareddrives?pageSize=50`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Error al listar las Unidades Compartidas. Es posible que tu cuenta no disponga de ellas.');
        }
        
        const data = await response.json();
        setSharedDrives(data.sharedDrives || data.items || []);
        setDriveFiles([]);
      } else if (tab === 'recent') {
        const q = encodeURIComponent("mimeType contains 'audio/' and trashed = false");
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=50&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Error al listar archivos recientes.');
        }

        const data = await response.json();
        setDriveFiles(data.files || []);
      } else {
        // Modo Explorar carpeta
        const q = encodeURIComponent(`'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/' or name contains '.mp3' or name contains '.wav' or name contains '.mpeg' or name contains '.m4a' or name contains '.webm')`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=100&orderBy=folder,name,modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('No se pudo abrir esta carpeta en Google Drive.');
        }

        const data = await response.json();
        setDriveFiles(data.files || []);
      }
      setShowDriveExplorer(true);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error al conectar con Google Drive.');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDriveImport = async () => {
    let accessToken = localStorage.getItem('utel_google_drive_token');
    
    if (!accessToken) {
      setUploadError(null);
      setIsDriveLoading(true);
      try {
        const { googleSignIn } = await import('../lib/firebase');
        const res = await googleSignIn();
        if (res?.accessToken) {
          accessToken = res.accessToken;
          // Reiniciar a "Mi Unidad" desde la raíz al iniciar sesión
          setDriveTab('my-drive');
          setNavigationHistory([{ id: 'root', name: 'Mi Unidad' }]);
          setActiveFolderId('root');
          await fetchDriveFiles(accessToken, 'root', 'my-drive');
        } else {
          setUploadError('No se pudo conectar con Google Drive. Intenta de nuevo.');
        }
      } catch (err: any) {
        setUploadError('Error al iniciar sesión con Google para acceder a Drive.');
      } finally {
        setIsDriveLoading(false);
      }
      return;
    }

    // Si ya hay token, usar los estados actuales para refrescar la vista actual
    await fetchDriveFiles(accessToken, activeFolderId, driveTab);
  };

  const importFileFromDrive = async (fileId: string, fileName: string) => {
    let accessToken = localStorage.getItem('utel_google_drive_token');
    if (!accessToken) return;

    setShowDriveExplorer(false);
    setUploadProgress(10);
    
    try {
      const response = await fetch('/api/drive-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName,
          accessToken,
          engine,
          ollamaUrl,
          ollamaModel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al importar de Drive.');
      }

      const completedCall = await response.json();
      onUploadSuccess(completedCall);
      setUploadProgress(null);
    } catch (err: any) {
      setUploadError(err.message);
      setUploadProgress(null);
    }
  };

  const handleItemClick = async (item: any) => {
    let accessToken = localStorage.getItem('utel_google_drive_token');
    if (!accessToken) return;

    if (item.mimeType === 'application/vnd.google-apps.folder') {
      const nextHistory = [...navigationHistory, { id: item.id, name: item.name }];
      setNavigationHistory(nextHistory);
      setActiveFolderId(item.id);
      await fetchDriveFiles(accessToken, item.id, 'my-drive');
    } else {
      await importFileFromDrive(item.id, item.name);
    }
  };

  const handleSharedDriveClick = async (drive: any) => {
    let accessToken = localStorage.getItem('utel_google_drive_token');
    if (!accessToken) return;

    setDriveTab('my-drive');
    setNavigationHistory([{ id: drive.id, name: drive.name }]);
    setActiveFolderId(drive.id);
    await fetchDriveFiles(accessToken, drive.id, 'my-drive');
  };

  const handleBreadcrumbClick = async (idx: number) => {
    let accessToken = localStorage.getItem('utel_google_drive_token');
    if (!accessToken) return;

    const nextHistory = navigationHistory.slice(0, idx + 1);
    setNavigationHistory(nextHistory);
    const targetFolderId = nextHistory[nextHistory.length - 1].id;
    setActiveFolderId(targetFolderId);
    await fetchDriveFiles(accessToken, targetFolderId, 'my-drive');
  };

  const handleTabChange = async (tab: 'my-drive' | 'shared-drives' | 'recent') => {
    let accessToken = localStorage.getItem('utel_google_drive_token');
    if (!accessToken) return;

    setDriveTab(tab);
    setDriveSearchQuery('');
    if (tab === 'my-drive') {
      setNavigationHistory([{ id: 'root', name: 'Mi Unidad' }]);
      setActiveFolderId('root');
      await fetchDriveFiles(accessToken, 'root', 'my-drive');
    } else if (tab === 'shared-drives') {
      await fetchDriveFiles(accessToken, 'root', 'shared-drives');
    } else {
      await fetchDriveFiles(accessToken, 'root', 'recent');
    }
  };

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
              disabled={isDriveLoading || isLoadingDemo}
              className="px-4 py-2.5 bg-[#121212] hover:bg-[#1a1a1a] text-gray-300 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Folder className={`w-3.5 h-3.5 text-amber-500 ${isDriveLoading ? 'animate-pulse' : ''}`} />
              {isDriveLoading ? 'Conectando...' : 'Importar de Drive'}
            </button>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo || isDriveLoading}
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

      {/* 4. Drive Explorer Modal (Added for better compatibility in Iframes) */}
      {showDriveExplorer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] w-full max-w-lg rounded-2xl border border-zinc-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Google Drive</h3>
              </div>
              <button 
                onClick={() => setShowDriveExplorer(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-gray-400 transition-colors"
                id="close-drive-explorer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs de Google Drive */}
            <div className="flex border-b border-zinc-800 bg-[#151515] px-2 pt-2">
              <button
                onClick={() => handleTabChange('my-drive')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  driveTab === 'my-drive' 
                    ? 'border-indigo-550 text-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Mi Unidad
              </button>
              <button
                onClick={() => handleTabChange('shared-drives')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  driveTab === 'shared-drives' 
                    ? 'border-indigo-550 text-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Unidades Compartidas
              </button>
              <button
                onClick={() => handleTabChange('recent')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  driveTab === 'recent' 
                    ? 'border-indigo-550 text-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Todos los Audios / Recientes
              </button>
            </div>

            {/* Breadcrumbs en caso de Navegar en carpetas */}
            {driveTab === 'my-drive' && (
              <div className="px-4 py-2.5 bg-[#181818] border-b border-zinc-800 flex items-center gap-1.5 flex-wrap overflow-x-auto text-[11px] text-gray-400">
                <Home className="w-3.5 h-3.5 text-gray-500 hover:text-white cursor-pointer" onClick={() => handleBreadcrumbClick(0)} />
                {navigationHistory.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    {index > 0 && <ChevronRight className="w-3 h-3 text-zinc-650" />}
                    {index > 0 && (
                      <span 
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`hover:text-white cursor-pointer truncate max-w-[120px] ${
                          index === navigationHistory.length - 1 ? 'text-indigo-400 font-bold' : ''
                        }`}
                      >
                        {folder.name}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="p-3 border-b border-zinc-800 bg-[#161616]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder={driveTab === 'shared-drives' ? "Buscar unidades compartidas..." : "Buscar archivos o carpetas..."}
                  value={driveSearchQuery}
                  onChange={(e) => setDriveSearchQuery(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[300px]">
              {isDriveLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-xs text-gray-400 font-medium">Buscando en Google Drive...</p>
                </div>
              ) : driveTab === 'shared-drives' ? (
                /* Listado de Unidades Compartidas */
                sharedDrives.filter(d => d.name.toLowerCase().includes(driveSearchQuery.toLowerCase())).length > 0 ? (
                  sharedDrives.filter(d => d.name.toLowerCase().includes(driveSearchQuery.toLowerCase())).map((drive) => (
                    <button
                      key={drive.id}
                      onClick={() => handleSharedDriveClick(drive)}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/5 flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-[#3bc] bg-opacity-10 flex items-center justify-center text-[#3bc] group-hover:bg-[#3bc] group-hover:text-black transition-all">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-gray-200 truncate pr-2">{drive.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Unidad Compartida Organizacional</p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Abrir
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                      <Folder className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-sm font-medium text-gray-400 font-sans">No se encontraron Unidades Compartidas</p>
                    <p className="text-xs text-gray-500 mt-1 px-8 leading-relaxed">Las cuentas institucionales suelen usar Unidades Compartidas. Si no tienes ninguna asignada, revisa la sección "Mi Unidad".</p>
                  </div>
                )
              ) : (
                /* Listado de Archivos y Carpetas de Mi Unidad */
                driveFiles.filter(f => f.name.toLowerCase().includes(driveSearchQuery.toLowerCase())).length > 0 ? (
                  driveFiles.filter(f => f.name.toLowerCase().includes(driveSearchQuery.toLowerCase())).map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    return (
                      <button
                        key={file.id}
                        onClick={() => handleItemClick(file)}
                        className="w-full text-left p-3 rounded-xl hover:bg-white/5 flex items-center justify-between group transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {isFolder ? (
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                              <Folder className="w-4 h-4 fill-amber-500/20 group-hover:fill-current" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                              <FileAudio className="w-4 h-4" />
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="text-[13px] font-medium text-gray-200 truncate pr-2">{file.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {isFolder 
                                ? 'Carpeta / Directorio' 
                                : `${file.size ? formatBytes(parseInt(file.size)) : 'Tamaño desconocido'} • ${new Date(file.modifiedTime).toLocaleDateString()}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {isFolder ? 'Abrir' : 'Importar'}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Carpeta vacía o sin audios</p>
                    <p className="text-xs text-gray-500 mt-1 px-8 leading-relaxed">
                      Esta carpeta no tiene archivos de audio estándar (.mp3, .wav, .mpeg) ni subcarpetas.
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-[#161616] flex items-center justify-between">
              <button 
                onClick={() => {
                  const token = localStorage.getItem('utel_google_drive_token');
                  if (token) fetchDriveFiles(token, activeFolderId, driveTab);
                }}
                className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar lista
              </button>
              {driveTab === 'my-drive' && navigationHistory.length > 1 && (
                <button
                  onClick={() => handleBreadcrumbClick(navigationHistory.length - 2)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Subir nivel
                </button>
              )}
              <div className="text-[10px] text-gray-500 font-mono">
                {driveTab === 'my-drive' ? 'Vista Explorador' : driveTab === 'shared-drives' ? 'Unidades' : 'Audios'}
              </div>
            </div>
          </div>
        </div>
      )}

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
