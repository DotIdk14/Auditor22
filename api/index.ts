// Función serverless para Vercel (versión portfolio).
// App Express liviana e INDEPENDIENTE de server.ts: no importa vite,
// @google/genai, axios ni dotenv para mantener la función pequeña,
// con arranque rápido y sin fallos en la plataforma.
// Comparte el generador de demos con el servidor local vía ../lib/demo-calls.
import express from "express";
import multer from "multer";
import { generateHighFidelitySimulatedCall } from "../lib/demo-calls";

const app = express();
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Memoria efímera por instancia (suficiente para la demo portfolio)
let localCallsMemory: any[] = [];
const audioBuffers = new Map<string, Buffer>();

const DEMO_TOKEN = "demo-supervisor-session-token";
const DEMO_PASSWORD = process.env.SUPERVISOR_PASSWORD || "demo1234";

// Login: solo acceso demo con contraseña (Google desactivado en portfolio)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (req.body.email) {
    return res.status(403).json({
      success: false,
      error: "El inicio de sesión con Google está desactivado en la versión portfolio para no exponer credenciales reales. Usa el acceso demo con contraseña."
    });
  }

  if (password) {
    if (password === DEMO_PASSWORD) {
      return res.json({ success: true, token: DEMO_TOKEN, username: username || "Supervisor" });
    }
    return res.status(401).json({
      success: false,
      error: "Contraseña de acceso incorrecta. En la versión portfolio usa la contraseña demo."
    });
  }

  return res.status(400).json({ success: false, error: "Se requiere la contraseña del acceso demo." });
});

// Verificar sesión
app.post("/api/verify-session", (req, res) => {
  if (req.body?.token === DEMO_TOKEN) return res.json({ success: true });
  return res.status(401).json({ error: "Sesión inválida o expirada" });
});

// Llamada de prueba bajo demanda (datos 100% simulados)
app.post("/api/cargar-demo", (req, res) => {
  const uniqueId = `call_demo_${Date.now()}`;
  const demoCall = generateHighFidelitySimulatedCall(
    `Llamada_Comercial_Demo_${Math.floor(Math.random() * 90 + 10)}.mp3`,
    4829310,
    uniqueId
  );
  localCallsMemory = [demoCall, ...localCallsMemory];
  return res.json(demoCall);
});

// Listado de llamadas
app.get("/api/llamadas", (req, res) => {
  return res.json(localCallsMemory);
});

// Borrar llamada
app.delete("/api/llamadas/:id", (req, res) => {
  audioBuffers.delete(req.params.id);
  localCallsMemory = localCallsMemory.filter((c) => c.id !== req.params.id);
  return res.json({ success: true });
});

// Audio (con soporte de rangos para poder saltar segundos)
app.get("/api/audio/:id", (req, res) => {
  const buffer = audioBuffers.get(req.params.id);
  if (!buffer) {
    return res.redirect("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3");
  }

  const totalLength = buffer.length;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
    if (start >= totalLength || end >= totalLength || start < 0 || end < start) {
      res.writeHead(416, { "Content-Range": `bytes */${totalLength}`, "Accept-Ranges": "bytes" });
      return res.end();
    }
    const chunk = buffer.subarray(start, end + 1);
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunk.length,
      "Content-Type": "audio/mpeg"
    });
    res.write(chunk);
    return res.end();
  }

  res.writeHead(200, {
    "Content-Length": totalLength,
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes"
  });
  res.write(buffer);
  return res.end();
});

// Subida de audio: en Vercel no hay claves de IA, así que se audita en modo
// simulado local (misma forma que el fallback del servidor local).
// Nota: Vercel Hobby limita el cuerpo a ~4.5 MB; para archivos grandes
// usa las llamadas de prueba o el servidor local.
app.post("/api/upload", upload.single("audio"), (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo de audio." });
    }
    const uniqueId = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const simulated = generateHighFidelitySimulatedCall(file.originalname, file.size, uniqueId);
    audioBuffers.set(uniqueId, file.buffer);
    localCallsMemory = [simulated, ...localCallsMemory.filter((c) => c.id !== uniqueId)];
    return res.json(simulated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Error al procesar el audio." });
  }
});

// Drive desactivado en portfolio
app.post("/api/drive-import", (req, res) => {
  return res.status(410).json({
    error: "La importación desde Google Drive está desactivada en la versión portfolio. Usa la carga local o las llamadas de prueba."
  });
});

app.post("/api/drive-save", (req, res) => {
  return res.status(410).json({
    error: "El guardado en Google Drive está desactivado en la versión portfolio. Las auditorías se conservan en el caché local del navegador."
  });
});

app.get("/api/drive-history", (req, res) => {
  return res.status(410).json({
    calls: [],
    error: "El historial de Google Drive está desactivado en la versión portfolio."
  });
});

export default app;
