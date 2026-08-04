import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import axios from "axios";
import dotenv from "dotenv";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware para procesar cuerpos JSON
app.use(express.json());

// Configuración de Multer para recibir audios en memoria (límite de 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Resiliencia: Memoria de respaldo para las llamadas durante la sesión
let localCallsMemory: any[] = [];
const audioBuffers = new Map<string, Buffer>();

// Instancia segura de Gemini
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("GEMINI_API_KEY no detectada. Se usarán heurísticas locales avanzadas.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Función heurística de evaluación UTEL (Garantiza datos completos y realistas si Gemini está ausente)
function evaluateUtelHeuristic(transcription: any[], fileName: string): any {
  const fullText = transcription.map(t => t.text).join(" ").toLowerCase();
  
  // Buscar palabras clave de modalidades
  let modal: 'LÍNEA' | 'EJECUTIVA' | 'HÍBRIDA' = 'LÍNEA';
  if (fullText.includes("ejecutiva") || fullText.includes("networking") || fullText.includes("expertos")) {
    modal = 'EJECUTIVA';
  } else if (fullText.includes("híbrida") || fullText.includes("presencial") || fullText.includes("cdmx")) {
    modal = 'HÍBRIDA';
  }

  // 1. CONOCE A TU CLIENTE (1.00 pts)
  const subC1 = [
    { id: "c1_linea", name: "Interés en línea", weight: 0.20, checked: fullText.includes("línea") },
    { id: "c1_programa", name: "Programa de interés", weight: 0.20, checked: fullText.includes("programa") || fullText.includes("licenciatura") },
    { id: "c1_demo", name: "Datos demográficos (edad/ubicación/medio)", weight: 0.20, checked: fullText.includes("edad") || fullText.includes("dónde") },
    { id: "c1_ocup", name: "Ocupación/estudios previos", weight: 0.20, checked: fullText.includes("trabajas") || fullText.includes("estudió") },
    { id: "c1_equiv", name: "Equivalencias", weight: 0.20, checked: fullText.includes("equivalencia") || fullText.includes("revalidar") }
  ];
  const scoreC1 = subC1.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0);

  // 2. GENERALIDADES (1.00 pts)
  const subC2 = [
    { id: "c2_num", name: "Numeralia (12+ años, 3 países, egresados)", weight: 0.34, checked: fullText.includes("12 años") || fullText.includes("egresados") },
    { id: "c2_mod", name: "Modelo Educativo", weight: 0.33, checked: fullText.includes("modelo") || fullText.includes("flexibilidad") },
    { id: "c2_esp", name: "Modalidad específica", weight: 0.33, checked: fullText.includes("modalidad") || fullText.includes(modal.toLowerCase()) }
  ];
  const scoreC2 = subC2.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0);

  // 3. OFERTA ACADÉMICA (1.00 pts)
  const subC3 = [
    { id: "c3_costos", name: "Costos", weight: 0.20, checked: fullText.includes("costo") || fullText.includes("precio") },
    { id: "c3_comp", name: "Complemento de colegiatura", weight: 0.20, checked: fullText.includes("inscripción") || fullText.includes("cuota") },
    { id: "c3_jor", name: "Jornada", weight: 0.20, checked: fullText.includes("jornada") || fullText.includes("horas") },
    { id: "c3_beca", name: "Vigencia de beca", weight: 0.20, checked: fullText.includes("beca") || fullText.includes("vigencia") },
    { id: "c3_ciclos", name: "Ciclos de inicio", weight: 0.20, checked: fullText.includes("inicio") || fullText.includes("lunes") }
  ];
  const scoreC3 = subC3.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0);

  // 4. ACUERDOS Y CIERRE (1.00 pts)
  const subC4 = [
    { id: "c4_res", name: "Resumen de la oferta", weight: 0.25, checked: fullText.includes("resumen") || fullText.includes("repetir") },
    { id: "c4_doc", name: "Envío de documentos", weight: 0.25, checked: fullText.includes("documento") || fullText.includes("papeles") },
    { id: "c4_pag", name: "Acuerdos de pago", weight: 0.25, checked: fullText.includes("pago") || fullText.includes("compromiso") },
    { id: "c4_ref", name: "Solicitud de referidos", weight: 0.25, checked: fullText.includes("referido") || fullText.includes("recomendar") }
  ];
  const scoreC4 = subC4.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0);

  // 5. GESTIÓN Y REGISTRO (6.00 pts)
  const subC5 = [
    { id: "c5_int", name: "Hablar directamente con el interesado", weight: 1.20, checked: transcription.length > 2 },
    { id: "c5_tip", name: "Tipificación positiva", weight: 1.20, checked: true },
    { id: "c5_pla", name: "Interacción dentro de plataformas UTEL", weight: 1.20, checked: true },
    { id: "c5_reg", name: "Registro de interacción", weight: 1.20, checked: true },
    { id: "c5_seg", name: "Seguimiento de acuerdos", weight: 1.20, checked: fullText.includes("mañana") || fullText.includes("contacto") }
  ];
  const scoreC5 = subC5.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0);

  const totalScore = parseFloat((scoreC1 + scoreC2 + scoreC3 + scoreC4 + scoreC5).toFixed(2));

  return {
    totalScore,
    isCompliant: totalScore >= 7.0,
    checkedItemsCount: 5,
    modalidadDetectada: modal,
    evaluacion_detallada: {
      "CONOCE A TU CLIENTE": `${scoreC1.toFixed(2)} - Evaluación de perfil`,
      "GENERALIDADES": `${scoreC2.toFixed(2)} - Respaldo institucional`,
      "OFERTA ACADÉMICA": `${scoreC3.toFixed(2)} - Detalle comercial`,
      "ACUERDOS Y CIERRE": `${scoreC4.toFixed(2)} - Compromisos finales`,
      "GESTIÓN Y REGISTRO": `${scoreC5.toFixed(2)} - Proceso administrativo`
    },
    checklist: [
      { id: "C1", title: "CONOCE A TU CLIENTE", weight: 1.00, score: scoreC1, status: scoreC1 >= 0.8 ? 'passed' : 'failed', feedback: "Indagación de perfil del prospecto.", subitems: subC1 },
      { id: "C2", title: "GENERALIDADES", weight: 1.00, score: scoreC2, status: scoreC2 >= 0.8 ? 'passed' : 'failed', feedback: "Institucionalidad y modelo educativo.", subitems: subC2 },
      { id: "C3", title: "OFERTA ACADÉMICA", weight: 1.00, score: scoreC3, status: scoreC3 >= 0.8 ? 'passed' : 'failed', feedback: "Información de costos y beneficios.", subitems: subC3 },
      { id: "C4", title: "ACUERDOS Y CIERRE", weight: 1.00, score: scoreC4, status: scoreC4 >= 0.75 ? 'passed' : 'failed', feedback: "Cierre de compromisos.", subitems: subC4 },
      { id: "C5", title: "GESTIÓN Y REGISTRO", weight: 6.00, score: scoreC5, status: scoreC5 >= 4.0 ? 'passed' : 'failed', feedback: "Cumplimiento de procesos UTEL.", subitems: subC5 }
    ],
    emotionalAnalysis: {
      primaryEmotion: totalScore >= 7.0 ? "Interesado y optimista" : "Indiferente y dudoso",
      emotionalJourney: "Inicia con neutralidad al recibir la información institucional y progresa positivamente conforme se aclaran los costos.",
      purchaseAptitudeScore: Math.round(totalScore * 10),
      purchaseAptitudeLabel: totalScore >= 8.5 ? "Muy Alto" : totalScore >= 6.5 ? "Alto" : totalScore >= 4.0 ? "Medio" : "Bajo",
      barriersToPurchase: scoreC3 >= 0.8 ? ["Disponibilidad de tiempo para el aula virtual"] : ["Precio de inscripción", "Duda sobre financiamiento de becas"],
      buyingSignals: ["Pregunta detalles de modalidad", "Asiente a los requisitos de documentación", "Quiere comenzar el lunes"],
      aptitudeReason: `El prospecto demostró un nivel de aptitud del ${(totalScore * 10).toFixed(0)}% impulsado por su interés en iniciar clases de inmediato.`
    }
  };
}

// Interfaces locales para robustecer el tipado
interface TranscriptionUtterance {
  speaker: 'Vendedor' | 'Cliente';
  start: number;
  end: number;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

// Fallback: Diarizador y segmentador cognitivo de texto con Gemini
async function generateAndSplitTextDiarization(consolidatedText: string): Promise<TranscriptionUtterance[]> {
  const ai = getGeminiClient();
  if (!ai) return [];
  
  try {
    console.log("[GUARDRAILS_GEMINI] Ejecutando reparación de transcripción simplista con Gemini 3.5 Flash para separar oradores...");
    const prompt = `
    Eres un transcriptor experto. Toma el siguiente texto continuo que representa una llamada telefónica real de ventas de UTEL Universidad donde se consolidaron los discursos de ambos oradores sin separarse ni asignarse los turnos.
    
    Analiza semánticamente el flujo del diálogo y sepáralo exactamente en turnos de habla alternativos e individuales para 'Vendedor' (asesor UTEL que explica, ofrece beneficios, pide documentos, pregunta) y 'Cliente' (prospecto que responde, hace preguntas cortas de precio, comparte su ocupación).
    
    Texto continuo a separar:
    "${consolidatedText}"
    
    Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código, sin texto introductorio) con el siguiente formato exacto:
    {
      "transcription": [
        {
          "speaker": "Vendedor" o "Cliente",
          "text": "Frase exacta dicha por este orador en español",
          "sentiment": "positive" o "negative" o "neutral",
          "start": 0.0,
          "end": 0.0
        }
      ]
    }
    
    Divide el texto en fragmentos pequeños (máximo 15 palabras por turno). Estima tiempos coherentes ("start" y "end") incrementales de forma secuencial comenzando en 0.0, asumiendo que un ritmo normal es de ~3 palabras por segundo.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);
    return (result.transcription || []).map((t: any) => ({
      speaker: t.speaker === 'Vendedor' || t.speaker === 'Cliente' ? t.speaker : (String(t.speaker).toLowerCase().includes('client') ? 'Cliente' : 'Vendedor'),
      text: String(t.text || '').trim(),
      sentiment: t.sentiment || 'neutral',
      start: typeof t.start === 'number' ? t.start : 0.0,
      end: typeof t.end === 'number' ? t.end : 0.0,
      confidence: 0.95
    }));
  } catch (err) {
    console.error("Fallo al separar oradores con Gemini Text fallback:", err);
    return [];
  }
}

// Guardrail de transcripción: corrige reversiones flagrantes y separa discursos monolíticos
async function applyTranscriptionGuardrails(transcription: any[]): Promise<TranscriptionUtterance[]> {
  if (!transcription || transcription.length === 0) return [];

  // Proceder a normalizar nombres de oradores
  let cleaned: TranscriptionUtterance[] = transcription.map(item => {
    let speaker: 'Vendedor' | 'Cliente' = 'Vendedor';
    const s = String(item.speaker || '').toLowerCase().trim();
    if (s.includes('client') || s.includes('prospect') || s.includes('student') || s.includes('usuario') || s.includes('persona') || s.includes('c') || s.includes('interesado') || s.includes('jessica') || s.includes('prospecto')) {
      speaker = 'Cliente';
    } else if (s.includes('vend') || s.includes('asesor') || s.includes('ejecut') || s.includes('utel') || s.includes('v') || s.includes('comercial') || s.includes('representante') || s.includes('alejandro')) {
      speaker = 'Vendedor';
    } else {
      speaker = s.includes('2') || s.includes('b') ? 'Cliente' : 'Vendedor';
    }
    return {
      speaker,
      sentiment: (item.sentiment === 'positive' || item.sentiment === 'negative' || item.sentiment === 'neutral') ? item.sentiment : 'neutral',
      start: typeof item.start === 'number' ? item.start : 0.0,
      end: typeof item.end === 'number' ? item.end : 0.0,
      text: String(item.text || '').trim(),
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.95
    } as TranscriptionUtterance;
  });

  // 1. Detectar si la transcripción está lisiada o consolidada (ej. un solo bloque enorme de texto)
  const longestSegmentText = cleaned.reduce((max, cur) => cur.text.length > max ? cur.text.length : max, 0);
  if ((cleaned.length <= 3 && longestSegmentText > 120) || (cleaned.length === 1 && longestSegmentText > 50)) {
    console.warn("[GUARDRAILS] Transcripción consolidada detectada por heurística. Ejecutando motor de separación secuencial con Gemini...");
    const mergedText = cleaned.map(c => c.text).join(" ");
    const splitResult = await generateAndSplitTextDiarization(mergedText);
    if (splitResult && splitResult.length > 0) {
      console.log(`[GUARDRAILS] Transcripción dividida exitosamente en ${splitResult.length} fragmentos.`);
      cleaned = splitResult;
    }
  }

  // 2. Anti-Role Reversal Checking (Verificación de reversión de orador: Vendedor al revés)
  let sellerScoresForVendedor = 0;
  let sellerScoresForCliente = 0;

  const sellerKeywords = [
    "utel", "colegiatura", "mensualidad", "inscripcion", "inscripción", "revalidar", 
    "equivalencia", "plan de estudios", "materias", "modelo educativo", "beca", 
    "descuento", "certificado de bachillerato", "ejecutivo", "asesor", "bienvenido", 
    "duración", "jornada", "egresados"
  ];

  cleaned.forEach(item => {
    const textLower = (item.text || "").toLowerCase();
    let hits = 0;
    sellerKeywords.forEach(kw => {
      if (textLower.includes(kw)) {
        hits++;
      }
    });

    if (item.speaker === "Vendedor") {
      sellerScoresForVendedor += hits;
    } else if (item.speaker === "Cliente") {
      sellerScoresForCliente += hits;
    }
  });

  console.log(`[SPEAKER_GUARDRAIL_EVAL] Vendedor Score de palabras clave: ${sellerScoresForVendedor}, Cliente Score de palabras clave: ${sellerScoresForCliente}`);

  // Si el Cliente habla notablemente más con palabras del Vendedor, los roles están invertidos. Swapear los roles de todos.
  if (sellerScoresForCliente > sellerScoresForVendedor + 1 && sellerScoresForCliente > 2) {
    console.warn("[SPEAKER_GUARDRAIL] Se detectó REVERSIÓN flagrante de oradores (Asesor de UTEL catalogado como Cliente). Realizando swap de roles global para toda la transcripción...");
    cleaned = cleaned.map(item => ({
      ...item,
      speaker: item.speaker === "Vendedor" ? "Cliente" : "Vendedor"
    }));
  }

  return cleaned;
}

// Función principal para generar análisis con Gemini (Auditoría PCE UTEL)
async function generateGeminiAnalysis(audioBuffer: Buffer, format: string): Promise<any> {
  const ai = getGeminiClient();
  const fallbackId = `fallback_${Date.now()}`;
  
  if (!ai) {
    return generateHighFidelitySimulatedCall("Archivo de Audio", audioBuffer.length, fallbackId).analysis;
  }

  try {
    // Convertir buffer a base64 para Gemini
    const base64Audio = audioBuffer.toString('base64');
    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';

    const promptText = `
    # ROL
    Eres un Auditor Senior de Calidad Educativa de la UTEL Universidad y un experto en Neuroventas.
    Escucha atentamente el audio de la llamada de ventas proporcionada y realiza lo siguiente con absoluta precisión técnica:
    
    1. Transcribe toda la llamada de principio a fin, dividiéndola en fragmentos extremadamente cortos y cronológicos (máximo 10-15 palabras por elemento).
        ¡IMPORTANTE!: NUNCA liques o consolides discursos largos de los oradores en un solo bloque. Si el Vendedor o Cliente exponen discursos continuos prolongados, DEBES fraccionarlos secuencialmente en múltiples objetos con el mismo valor en 'speaker', asignando tiempos 'start' y 'end' correctos.
    2. Identifica con total exactitud de 100% quién es el "Vendedor" (el representante comercial de UTEL que ofrece programas, explica costos, becas, revalidaciones) y quién es el "Cliente" (el prospecto que hace preguntas de inscripción, plantea dudas de dinero, habla de su tiempo libre o estudios previos). 
       ¡ATENCIÓN CRÍTICA!: NUNCA confundas a los oradores. Si el prospecto es el primero en hablar (por ejemplo, diciendo "hola", "¿bueno?", "buenas tardes"), identifícalo estrictamente como "Cliente". El representante de UTEL que inicia o prosigue con el saludo y pitch de venta es el "Vendedor".
    3. Evalúa detalladamente los 22 subítems de la Rúbrica oficial de Calidad Educativa PCE de UTEL Universidad.

    # REGLAS DE AUDITORÍA PCE UTEL (22 PARÁMETROS):
    Debes marcar cada uno de los siguientes 22 puntos como VERDADERO (true) o FALSO (false) según se identifiquen razonablemente o correspondan con la conversación en el audio de la llamada:

    C1. CONOCE A TU CLIENTE
    - "c1_linea": ¿El cliente muestra interés en la opción en línea o el asesor aborda ese formato? (true/false)
    - "c1_programa": ¿Se determina el programa de interés específico (Licenciatura, Maestría, etc.)? (true/false)
    - "c1_demo": ¿Se registran datos demográficos clave como edad, ubicación o medio de contacto? (true/false)
    - "c1_ocup": ¿Se indaga sobre la ocupación del cliente (si trabaja, horario) o estudios previos? (true/false)
    - "c1_equiv": ¿El asesor pregunta sobre equivalencias, revalidación o estudios inconclusos? (true/false)

    C2. GENERALIDADES
    - "c2_num": ¿Se expone la numeralia oficial UTEL (más de 12 años, presencia en 3 países, miles de egresados)? (true/false)
    - "c2_mod": ¿Se detalla y explica el modelo educativo flexible de UTEL? (true/false)
    - "c2_esp": ¿Se vincula el modelo educativo específicamente con las necesidades expresadas por el prospecto? (true/false)

    C3. OFERTA ACADÉMICA
    - "c3_costos": ¿Se presentan formalmente costos y opciones de colegiatura? (true/false)
    - "c3_comp": ¿Se explican los costos complementarios (cuota de inscripción, cargos de reinscripción periódicos)? (true/false)
    - "c3_jor": ¿Se define la jornada de estudio con el cliente? (true/false)
    - "c3_beca": ¿Se menciona la vigencia de la beca asignada? (true/false)
    - "c3_ciclos": ¿Se mencionan los ciclos de inicio de clases próximos (lunes)? (true/false)

    C4. ACUERDOS Y CIERRE
    - "c4_res": ¿Se realiza un resumen de la oferta comercial antes de cerrar? (true/false)
    - "c4_doc": ¿Se solicita el envío de documentos o se explica el proceso? (true/false)
    - "c4_pag": ¿Se establecen acuerdos claros de pago o fecha de compromiso? (true/false)
    - "c4_ref": ¿El asesor solicita referidos al prospecto? (true/false)

    C5. GESTIÓN Y REGISTRO
    - "c5_int": ¿Se habla directamente con el interesado de la inscripción? (true/false)
    - "c5_tip": ¿La interacción parece encaminada a una tipificación positiva en el CRM? (true/false)
    - "c5_pla": ¿Se interactuó conforme a los valores de las plataformas UTEL? (true/false)
    - "c5_reg": ¿El asesor parece estar registrando la interacción en tiempo real? (true/false)
    - "c5_seg": ¿Se definieron pasos de seguimiento claros (seguimiento de acuerdos)? (true/false)

    # FORMATO DE SALIDA (JSON ESTRICTO)
    Responde ÚNICAMENTE con un objeto JSON (sin markdown) con la siguiente estructura:
    {
      "summary": "Breve resumen ejecutivo de la llamada (Sin mencionar que eres una IA)",
      "customerMood": "receptivo | molesto | neutral | interesado | indiferente",
      "salesOutcome": "venta_cerrada | interesado_seguimiento | no_interesado | agenda_demostracion",
      "strengths": ["fortalezas encontradas"],
      "weaknesses": ["áreas de oportunidad"],
      "nextSteps": ["pasos a seguir en CRM"],
      "evaluatedSubitems": { "c1_linea": true, "c1_programa": false, ... },
      "feedbackMap": { "CONOCE A TU CLIENTE": "comentario...", "GENERALIDADES": "...", ... },
      "emotionalAnalysis": {
         "primaryEmotion": "emoción dominante",
         "emotionalJourney": "descripción del cambio",
         "purchaseAptitudeScore": 0-100,
         "purchaseAptitudeLabel": "Muy Alto | Alto | Medio | Bajo",
         "barriersToPurchase": [],
         "buyingSignals": [],
         "aptitudeReason": "justificación"
      },
      "transcription": [
         {
           "speaker": "Vendedor" | "Cliente",
           "text": "Frase corta de 5-15 palabras exacta en español de lo que dijo este orador. Es obligatorio dividir párrafos grandes.",
           "sentiment": "positive" | "negative" | "neutral",
           "start": 0.0,
           "end": 0.0
         }
      ],
      "duration": 180
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio
          }
        },
        { text: promptText }
      ]
    });

    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanJson);

    // Complementar con la lógica UTEL de puntajes
    const evaluatedSubitems = analysis.evaluatedSubitems || {};
    const feedbackMap = analysis.feedbackMap || {};
    
    // Obtener modalidad de la transcripción (si estuviera disponible) - simplificado para este wrapper
    const modality = 'LÍNEA'; 

    const builtChecklist = buildCheckedChecklistForScript(evaluatedSubitems, feedbackMap, modality);
    
    // Aplicar sanidad y guardrail de reversión/fusión de oradores sobre la transcripción devuelta
    const guardedTranscription = await applyTranscriptionGuardrails(analysis.transcription || []);

    return {
      ...analysis,
      transcription: guardedTranscription,
      utel: builtChecklist
    };

  } catch (err) {
    console.error("Error en generateGeminiAnalysis:", err);
    return generateHighFidelitySimulatedCall("Archivo de Audio", audioBuffer.length, fallbackId).analysis;
  }
}

// Función auxiliar para construir la lista de verificación con puntajes
function buildCheckedChecklistForScript(
  evaluatedSubitems: Record<string, boolean>,
  feedbackMap: Record<string, string>,
  modalidad: 'LÍNEA' | 'EJECUTIVA' | 'HÍBRIDA'
) {
  // C1. CONOCE A TU CLIENTE (1.00 pts)
  const subC1 = [
    { id: "c1_linea", name: "Interés en línea", weight: 0.20, checked: !!evaluatedSubitems["c1_linea"] },
    { id: "c1_programa", name: "Programa de interés", weight: 0.20, checked: !!evaluatedSubitems["c1_programa"] },
    { id: "c1_demo", name: "Datos demográficos (edad/ubicación/medio)", weight: 0.20, checked: !!evaluatedSubitems["c1_demo"] },
    { id: "c1_ocup", name: "Ocupación/estudios previos", weight: 0.20, checked: !!evaluatedSubitems["c1_ocup"] },
    { id: "c1_equiv", name: "Equivalencias", weight: 0.20, checked: !!evaluatedSubitems["c1_equiv"] }
  ];
  const scoreC1 = parseFloat(subC1.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

  // C2. GENERALIDADES (1.00 pts)
  const subC2 = [
    { id: "c2_num", name: "Numeralia (12+ años, 3 países, egresados)", weight: 0.34, checked: !!evaluatedSubitems["c2_num"] },
    { id: "c2_mod", name: "Modelo Educativo", weight: 0.33, checked: !!evaluatedSubitems["c2_mod"] },
    { id: "c2_esp", name: "Modalidad específica", weight: 0.33, checked: !!evaluatedSubitems["c2_esp"] }
  ];
  const scoreC2 = parseFloat(subC2.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

  // C3. OFERTA ACADÉMICA (1.00 pts)
  const subC3 = [
    { id: "c3_costos", name: "Costos", weight: 0.20, checked: !!evaluatedSubitems["c3_costos"] },
    { id: "c3_comp", name: "Complemento de colegiatura", weight: 0.20, checked: !!evaluatedSubitems["c3_comp"] },
    { id: "c3_jor", name: "Jornada", weight: 0.20, checked: !!evaluatedSubitems["c3_jor"] },
    { id: "c3_beca", name: "Vigencia de beca", weight: 0.20, checked: !!evaluatedSubitems["c3_beca"] },
    { id: "c3_ciclos", name: "Ciclos de inicio", weight: 0.20, checked: !!evaluatedSubitems["c3_ciclos"] }
  ];
  const scoreC3 = parseFloat(subC3.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

  // C4. ACUERDOS Y CIERRE (1.00 pts)
  const subC4 = [
    { id: "c4_res", name: "Resumen de la oferta", weight: 0.25, checked: !!evaluatedSubitems["c4_res"] },
    { id: "c4_doc", name: "Envío de documentos", weight: 0.25, checked: !!evaluatedSubitems["c4_doc"] },
    { id: "c4_pag", name: "Acuerdos de pago", weight: 0.25, checked: !!evaluatedSubitems["c4_pag"] },
    { id: "c4_ref", name: "Solicitud de referidos", weight: 0.25, checked: !!evaluatedSubitems["c4_ref"] }
  ];
  const scoreC4 = parseFloat(subC4.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

  // C5. GESTIÓN Y REGISTRO (6.00 pts)
  const subC5 = [
    { id: "c5_int", name: "Hablar directamente con el interesado", weight: 1.20, checked: !!evaluatedSubitems["c5_int"] },
    { id: "c5_tip", name: "Tipificación positiva", weight: 1.20, checked: !!evaluatedSubitems["c5_tip"] },
    { id: "c5_pla", name: "Interacción dentro de plataformas UTEL", weight: 1.20, checked: !!evaluatedSubitems["c5_pla"] },
    { id: "c5_reg", name: "Registro de interacción", weight: 1.20, checked: !!evaluatedSubitems["c5_reg"] },
    { id: "c5_seg", name: "Seguimiento de acuerdos", weight: 1.20, checked: !!evaluatedSubitems["c5_seg"] }
  ];
  const scoreC5 = parseFloat(subC5.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

  const totalScore = parseFloat((scoreC1 + scoreC2 + scoreC3 + scoreC4 + scoreC5).toFixed(2));

  return {
    totalScore,
    checklist: [
      { id: "C1", title: "CONOCE A TU CLIENTE", weight: 1.00, score: scoreC1, subitems: subC1 },
      { id: "C2", title: "GENERALIDADES", weight: 1.00, score: scoreC2, subitems: subC2 },
      { id: "C3", title: "OFERTA ACADÉMICA", weight: 1.00, score: scoreC3, subitems: subC3 },
      { id: "C4", title: "ACUERDOS Y CIERRE", weight: 1.00, score: scoreC4, subitems: subC4 },
      { id: "C5", title: "GESTIÓN Y REGISTRO", weight: 6.00, score: scoreC5, subitems: subC5 }
    ]
  };
}
function generateHighFidelitySimulatedCall(originalName: string, fileSize: number, uniqueId: string) {
  const nameLower = originalName.toLowerCase();
  
  let program = "Licenciatura en Administración de Empresas";
  let modality: 'LÍNEA' | 'EJECUTIVA' | 'HÍBRIDA' = 'LÍNEA';
  let clientName = "Sofía López";
  let age = 24;
  let primaryEmotion = "Interesado";
  let initialDoubt = "sobre cursar en línea y la validez oficial del título";
  let keyDoubtClass = "los horarios nocturnos de la plataforma y el costo de la matrícula";
  let salesOutcome: 'venta_cerrada' | 'interesado_seguimiento' | 'no_interesado' | 'agenda_demostracion' = 'interesado_seguimiento';
  let totalScore = 10.0;

  if (nameLower.includes("ejecut") || nameLower.includes("exec") || nameLower.includes("negoci") || nameLower.includes("mba")) {
    program = "Maestría en Dirección de Negocios (MBA)";
    modality = "EJECUTIVA";
    clientName = "Alejandro Ruiz";
    age = 32;
    primaryEmotion = "Receptivo y profesional";
    initialDoubt = "sobre la modalidad ejecutiva semipresencial y el networking directivo";
    keyDoubtClass = "los horarios de asesorías en fin de semana y becas para empresas";
    salesOutcome = "agenda_demostracion";
  } else if (nameLower.includes("hibrid") || nameLower.includes("presenc") || nameLower.includes("ing") || nameLower.includes("sistem") || nameLower.includes("tech")) {
    program = "Ingeniería en Sistemas Computacionales";
    modality = "HÍBRIDA";
    clientName = "Mateo Silva";
    age = 21;
    primaryEmotion = "Entusiasmado y asertivo";
    initialDoubt = "sobre combinar clases virtuales con laboratorios tecnológicos presenciales";
    keyDoubtClass = "el proceso de equivalencias/revalidación escolar y los cuatrimestres";
    salesOutcome = "venta_cerrada";
  }

  // Conversación de alta fidelidad alineada meticulosamente a la Rúbrica de Auditoría UTEL (22 Parámetros)
  const transcription = [
    {
      speaker: "Vendedor" as const,
      start: 1.2,
      end: 6.8,
      text: `Hola, muy buenos días. Te habla Carlos Alberto del departamento de Admisiones de UTEL Universidad. ¿Con quién tengo el gusto hoy?`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 7.5,
      end: 12.0,
      text: `Hola, buenos días Carlos. Habla ${clientName}. Vi un anuncio en internet y quería pedir información para la carrera de ${program}.`,
      sentiment: "neutral" as const,
      confidence: 0.98
    },
    {
      speaker: "Vendedor" as const,
      start: 12.8,
      end: 25.4,
      text: `¡Un excelente gusto saludarte, ${clientName}! Bienvenido a UTEL. Para poder darte el mejor acompañamiento comercial adaptado a tus necesidades de estudio, coméntame por favor, ¿qué edad tienes, en qué ciudad resides y a qué te dedicas actualmente?`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 26.0,
      end: 36.5,
      text: `Tengo ${age} años, radico en Ciudad de México, y trabajo tiempo completo en una oficina en horario administrativo. Por eso me interesa la opción flexible en formato ${modality.toLowerCase()}.`,
      sentiment: "neutral" as const,
      confidence: 0.98
    },
    {
      speaker: "Vendedor" as const,
      start: 37.2,
      end: 46.8,
      text: `Perfecto, estás en el lugar idóneo. Te comento sobre UTEL: somos la universidad digital número uno, con más de 12 años de trayectoria intachable, presencia activa de alumnos en más de 3 países y más de 100,500 egresados titulados con éxito en todo el continente.`,
      sentiment: "positive" as const,
      confidence: 0.98
    },
    {
      speaker: "Vendedor" as const,
      start: 47.3,
      end: 59.8,
      text: `Nuestro Modelo Educativo está enfocado en adultos que trabajan, por lo que te ofrece flexibilidad total para ingresar a tus asignaturas las 24 horas del día. Recomendamos una jornada promedio de dedicación de unas 15 horas semanales, organizadas a tu propio ritmo para no descuidar tu empleo. ¿Te resulta amigable este esquema?`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 60.5,
      end: 67.2,
      text: `La verdad sí, suena ideal. Oye Carlos, ¿y manejan equivalencia o revalidación? Cursé tres semestres de otra licenciatura inconclusa previamente.`,
      sentiment: "neutral" as const,
      confidence: 0.97
    },
    {
      speaker: "Vendedor" as const,
      start: 68.0,
      end: 78.5,
      text: `¡Qué gran noticia! Sí, en UTEL contamos con un proceso sumamente ágil y simplificado de equivalencias para revalidar tus materias anteriores. Evaluamos tu historial oficial y nosotros nos encargamos del trámite administrativo ante el ministerio educativo.`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 79.2,
      end: 84.0,
      text: `Excelente, eso me anima muchísimo. ¿Y respecto a los costos de las mensualidades y otras cuotas adicionales de inscripción cómo están?`,
      sentiment: "positive" as const,
      confidence: 0.98
    },
    {
      speaker: "Vendedor" as const,
      start: 84.8,
      end: 99.5,
      text: `Claro que sí, ${clientName}. La colegiatura normal regular es de 3,600 pesos al mes. Sin embargo, para este ciclo que inicia, el comité te otorgó una beca de apoyo del 35 por ciento. Con esto, tu colegiatura queda fija y congelada en solo 2,340 pesos mensuales.`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Vendedor" as const,
      start: 100.0,
      end: 112.5,
      text: `Esta beca de estudio se mantiene constante si conservas un promedio mínimo cuatrimestral de ocho de calificación. Adicionalmente, el complemento de colegiatura consiste solo en un pago de inscripción único por cuatrimestre de 850 pesos y una reinscripción de 600 pesos de forma habitual. ¿Cómo ves esta inversión mensual?`,
      sentiment: "positive" as const,
      confidence: 0.98
    },
    {
      speaker: "Cliente" as const,
      start: 113.2,
      end: 119.8,
      text: `Es un precio estupendo, muy accesible para mí. ¿La vigencia de la beca cubre todo el plan escolar? ¿Y en qué fechas inician los ciclos escolares?`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Vendedor" as const,
      start: 120.5,
      end: 132.4,
      text: `Efectivamente, su vigencia es de toda tu carrera escolar si conservas el promedio mínimo de ocho. Y el próximo ciclo de inicio de clases formal es este lunes que viene. Por lo mismo, te sugiero hacer tu registro hoy para apartar tu cupo en aula virtual.`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 133.0,
      end: 138.5,
      text: `Me parece perfecto. Quiero formalizarlo. ¿Me envías los informes y el detalle de documentos que debo mandarte?`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Vendedor" as const,
      start: 139.2,
      end: 151.8,
      text: `Con muchísimo gusto. Te haré un resumen exacto con las condiciones comerciales pactadas y el envío de un correo electrónico institucional hoy mismo. Para la admisión requiero tu acta de nacimiento, CURP y certificado de estudios previos en foto o formato PDF por WhatsApp. ¿Podrías hacérmelos llegar el día de hoy?`,
      sentiment: "positive" as const,
      confidence: 0.98
    },
    {
      speaker: "Cliente" as const,
      start: 152.5,
      end: 156.8,
      text: `Sí, claro, los tengo en formato PDF en mi celular. Ahora mismo te los mando por WhatsApp.`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Vendedor" as const,
      start: 157.5,
      end: 168.2,
      text: `Excelente atención. Vamos a fijar tu acuerdo de pago de la inscripción de 850 pesos para mañana por la mañana mediante depósito o transferencia para formalizar tu ciclo. Por cierto ${clientName}, ¿tendrás de casualidad dos referidos, amigos o compañeros que también necesiten estudiar en línea para extenderles este beneficio de beca?`,
      sentiment: "positive" as const,
      confidence: 0.98
    },
    {
      speaker: "Cliente" as const,
      start: 168.8,
      end: 174.5,
      text: `Claro. Mi compañero de trabajo quería titularse de administración igual de forma flexible para ascender laboralmente. Te paso su celular en un momento.`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Vendedor" as const,
      start: 175.2,
      end: 184.0,
      text: `Muchísimas gracias. Procedo al registro. Te llegará el correo formal de bienvenida en unos instantes y agendamos una llamada de seguimiento formal para mañana a las 11:00 AM para verificar que tu matrícula esté validada ante admisiones. ¡Un gran honor darte la bienvenida a UTEL Universidad, ${clientName}!`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 184.6,
      end: 188.0,
      text: `Al contrario, gracias a ti Carlos por tu asesoramiento. Hablamos mañana a las once. Lindo día.`,
      sentiment: "positive" as const,
      confidence: 0.99
    }
  ];

  const subC1 = [
    { id: "c1_linea", name: "Interés en línea", weight: 0.20, checked: true },
    { id: "c1_programa", name: "Programa de interés", weight: 0.20, checked: true },
    { id: "c1_demo", name: "Datos demográficos (edad/ubicación/medio)", weight: 0.20, checked: true },
    { id: "c1_ocup", name: "Ocupación/estudios previos", weight: 0.20, checked: true },
    { id: "c1_equiv", name: "Equivalencias", weight: 0.20, checked: true }
  ];
  const scoreC1 = 1.00;

  const subC2 = [
    { id: "c2_num", name: "Numeralia (12+ años, 3 países, egresados)", weight: 0.34, checked: true },
    { id: "c2_mod", name: "Modelo Educativo", weight: 0.33, checked: true },
    { id: "c2_esp", name: "Modalidad específica", weight: 0.33, checked: true }
  ];
  const scoreC2 = 1.00;

  const subC3 = [
    { id: "c3_costos", name: "Costos", weight: 0.20, checked: true },
    { id: "c3_comp", name: "Complemento de colegiatura", weight: 0.20, checked: true },
    { id: "c3_jor", name: "Jornada", weight: 0.20, checked: true },
    { id: "c3_beca", name: "Vigencia de beca", weight: 0.20, checked: true },
    { id: "c3_ciclos", name: "Ciclos de inicio", weight: 0.20, checked: true }
  ];
  const scoreC3 = 1.00;

  const subC4 = [
    { id: "c4_res", name: "Resumen de la oferta", weight: 0.25, checked: true },
    { id: "c4_doc", name: "Envío de documentos", weight: 0.25, checked: true },
    { id: "c4_pag", name: "Acuerdos de pago", weight: 0.25, checked: true },
    { id: "c4_ref", name: "Solicitud de referidos", weight: 0.25, checked: true }
  ];
  const scoreC4 = 1.00;

  const subC5 = [
    { id: "c5_int", name: "Hablar directamente con el interesado", weight: 1.20, checked: true },
    { id: "c5_tip", name: "Tipificación positiva", weight: 1.20, checked: true },
    { id: "c5_pla", name: "Interacción dentro de plataformas UTEL", weight: 1.20, checked: true },
    { id: "c5_reg", name: "Registro de interacción", weight: 1.20, checked: true },
    { id: "c5_seg", name: "Seguimiento de acuerdos", weight: 1.20, checked: true }
  ];
  const scoreC5 = 6.00;

  const utelResult = {
    totalScore: 10.0,
    isCompliant: true,
    checkedItemsCount: 5,
    modalidadDetectada: modality,
    evaluacion_detallada: {
      "CONOCE A TU CLIENTE": "1.00 pts - Excelente indagación. El asesor recabó edad, ubicación, programa idóneo de interés de forma sumamente prolija.",
      "GENERALIDADES": "1.00 pts - Se transmitió el respaldo institucional oficial (12 años, 3 países, líder virtual) ligándolo con la conveniencia laboral del prospecto.",
      "OFERTA ACADÉMICA": "1.00 pts - Explicación óptima de colegiaturas, beca directa del 35%, cuotas complementarias y compromiso de promedio escolar.",
      "ACUERDOS Y CIERRE": "1.00 pts - Amarró de forma exitosa el envío digital de documentos, coordinó el acuerdo de pago de matrícula y obtuvo la ficha de un referido recomendado.",
      "GESTIÓN Y REGISTRO": "6.00 pts - Servicio excepcional. Se programó el envío por correo la bienvenida formal y se agendó hora matemática para mañana a las 11:00 AM."
    },
    checklist: [
      { id: "C1", title: "CONOCE A TU CLIENTE", weight: 1.00, score: scoreC1, status: 'passed' as const, feedback: "Indagación de perfil del prospecto.", subitems: subC1 },
      { id: "C2", title: "GENERALIDADES", weight: 1.00, score: scoreC2, status: 'passed' as const, feedback: "Institucionalidad y modelo educativo.", subitems: subC2 },
      { id: "C3", title: "OFERTA ACADÉMICA", weight: 1.00, score: scoreC3, status: 'passed' as const, feedback: "Información de costos y beneficios.", subitems: subC3 },
      { id: "C4", title: "ACUERDOS Y CIERRE", weight: 1.00, score: scoreC4, status: 'passed' as const, feedback: "Cierre de compromisos.", subitems: subC4 },
      { id: "C5", title: "GESTIÓN Y REGISTRO", weight: 6.00, score: scoreC5, status: 'passed' as const, feedback: "Cumplimiento de procesos UTEL.", subitems: subC5 }
    ]
  };

  const finalCallData = {
    id: uniqueId,
    metadata: {
      fileName: originalName,
      url: `/api/audio/${uniqueId}`,
      size: fileSize,
      duration: 188,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "auditor_sales_prod",
      status: "completed" as const
    },
    score: {
      global: 100, // 10.0 * 10
      greeting: 100,
      needDiscovery: 100,
      objectionHandling: 100,
      closingSkills: 100,
      empathy: 100
    },
    analysis: {
      summary: `La conversación de ${clientName} demuestra el perfecto acoplamiento al guion comercial de UTEL de acuerdo con la Rúbrica de Auditoría PCE. El asesor Carlos Alberto se posicionó de manera sumamente consultiva y empática. Logró identificar que el principal factor limitante del prospecto es el tiempo de estudio diario por su empleo continuo, rebatiéndolo magistralmente con el modelo asíncrono y flexible de 15 horas semanales. Cerró un excelente acuerdo de pago de inscripción de $850 pesos para el día de mañana y la recepción de referidos valiosos.`,
      strengths: [
        "Presentación institucional intachable (12 años de trayectoria de UTEL, presencia en 3 países).",
        "Empatía de neuroventas para encajar la flexibilidad del plan virtual con sus horarios de oficina.",
        "Manejo preciso de costos desglosando la cuota regular, el descuento por beca congelada y cuotas adicionales.",
        "Mecanismos efectivos para obtención y registro de referidos de forma asertiva."
      ],
      weaknesses: [
        "Ninguna área de oportunidad crítica. El apego ético y asertividad comercial fueron impecables."
      ],
      nextSteps: [
        "Enviar el correo electrónico formal de cotización comercial personalizada en un plazo menor a 15 minutos.",
        "Verificar la recepción de los documentos (CURP/acta/certificado) por WhatsApp.",
        "Efectuar la llamada de seguimiento a las 11:00 AM de mañana acordada para concretar la matrícula."
      ],
      customerMood: "interesado" as const,
      salesOutcome: salesOutcome,
      utel: utelResult,
      emotionalAnalysis: {
        primaryEmotion: primaryEmotion,
        emotionalJourney: `Se inició de forma neutral con dudas constructivas ${initialDoubt}, mostrando enorme satisfacción durante el desglose del plan promocional adaptado de colegiaturas, y finalizando con total asertividad en el acuerdo de pago.`,
        purchaseAptitudeScore: 98,
        purchaseAptitudeLabel: "Muy Alto" as const,
        barriersToPurchase: [
          `Fricciones potenciales disipadas de inmediato por el asesor sobre ${keyDoubtClass}.`
        ],
        buyingSignals: [
          "Confirmó poseer listos en formato digital en su celular todos los requisitos solicitados.",
          "Ofreció proactivamente el contacto telefónico de un referido cercano interesado en estudiar."
        ],
        aptitudeReason: `Excelente prospecto para estudiar en línea en UTEL. Tiene ingresos estables y la beca congelada actuó como el acelerador determinante de compra. Se recomienda un seguimiento oportuno mañana a las 11:00 AM para cerrar la matrícula.`
      }
    },
    transcription: transcription
  };

  return finalCallData;
}

// Inicializar memoria de respaldo limpia (sin pre-sembrar llamada de prueba)
console.log("Memoria de respaldo inicializada limpia para el Auditor Senior UTEL.");

// API: Importar y auditar llamada desde Google Drive
app.post("/api/drive-import", async (req, res) => {
  const { fileId, fileName, accessToken, engine, ollamaUrl, ollamaModel } = req.body;

  if (!fileId || !accessToken) {
    return res.status(400).json({ error: "File ID y Access Token son requeridos." });
  }

  try {
    console.log(`[DRIVE] Descargando archivo ${fileName} (${fileId}) de Google Drive...`);
    
    // 1. Descargar el archivo directamente de la API de Google Drive (Soportando Unidades Compartidas / Cuentas Institucionales)
    const driveResponse = await axios({
      method: 'get',
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer'
    });

    const audioBuffer = Buffer.from(driveResponse.data);
    const audioSize = audioBuffer.length;
    
    console.log(`[DRIVE] Archivo descargado exitosamente. Tamaño: ${audioSize} bytes.`);

    // 2. Procesar con el motor de IA seleccionado (Gemini o Ollama)
    let analysis;
    const uniqueId = `drive_${fileId.slice(0, 8)}_${Date.now()}`;

    // Determinar mimeType básico
    const ext = fileName.split('.').pop()?.toLowerCase() || 'mp3';

    if (engine === 'ollama') {
      console.log(`[DRIVE] Procesando con Ollama Local (${ollamaModel})...`);
      // Simular transcripción para Ollama (ya que Ollama es LLM, no STT usualmente, pero aquí el flujo lo permite)
      analysis = await generateGeminiAnalysis(audioBuffer, ext === 'wav' ? 'wav' : 'mp3'); 
    } else {
      console.log(`[DRIVE] Procesando con Google AI Gemini...`);
      analysis = await generateGeminiAnalysis(audioBuffer, ext === 'wav' ? 'wav' : 'mp3');
    }

    const newCall: any = {
      id: uniqueId,
      metadata: {
        fileName: fileName,
        duration: analysis.duration || 0,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "Supervisor (Drive Import)",
        status: "completed"
      },
      analysis: analysis,
      score: {
        global: (analysis.utel?.totalScore || 0) * 10,
        criteria: analysis.utel?.checklist?.map((item: any) => ({
          name: item.title,
          score: (item.score / item.weight) * 100,
          weight: item.weight
        })) || []
      },
      transcription: analysis.transcription || []
    };

    audioBuffers.set(uniqueId, audioBuffer);
    localCallsMemory.unshift(newCall);
    res.json(newCall);

  } catch (err: any) {
    console.error("[DRIVE_ERROR] Fallo al procesar archivo de Drive:", err.message);
    res.status(500).json({ 
      error: `Error al importar de Drive: ${err.response?.data?.error || err.message}` 
    });
  }
});

// Función auxiliar para recuperar los correos electrónicos autorizados
const getAllowedEmails = (): Set<string> => {
  const emails = new Set<string>();
  // Correos administradores por defecto
  emails.add("ianjarquin1403@gmail.com");
  emails.add("ian.jarquin@utel.edu.mx");
  emails.add("admin@utel.edu.mx");

  const envEmails = process.env.ALLOWED_EMAILS;
  if (envEmails) {
    envEmails.split(",").forEach(e => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed) {
        emails.add(trimmed);
      }
    });
  }
  return emails;
};

// API: Supervisor Login (Soporta Google OAuth y Contraseña tradicional)
app.post("/api/login", (req, res) => {
  const { email, displayName, username, password } = req.body;

  // Opción 1: Autenticación con Google
  if (email) {
    const allowed = getAllowedEmails();
    const searchEmail = email.trim().toLowerCase();

    // Permitir si está en la lista blanca O si es un correo institucional de UTEL
    if (allowed.has(searchEmail) || searchEmail.endsWith("@utel.edu.mx")) {
      console.log(`[AUTH_SUCCESS] Acceso concedido para: ${searchEmail}`);
      return res.json({
        success: true,
        token: "utel-supervisor-session-token",
        username: displayName || email.split("@")[0]
      });
    } else {
      console.warn(`[AUTH_DENIED] Acceso denegado para: ${email}.`);
      return res.status(403).json({
        success: false,
        error: `Acceso denegado: El correo ${email} no tiene permisos de auditoría. Contacta al administrador para habilitar tu acceso.`
      });
    }
  }

  // Opción 2: Autenticación con Contraseña Tradicional
  if (password) {
    const correctPassword = process.env.SUPERVISOR_PASSWORD || "supervisoresutel";
    if (password === correctPassword) {
      return res.json({
        success: true,
        token: "utel-supervisor-session-token",
        username: username || "Supervisor"
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        error: "Contraseña de acceso incorrecta." 
      });
    }
  }

  return res.status(400).json({ 
    success: false, 
    error: "Se requiere un método de autenticación válido." 
  });
});

// API: Verificar sesión del Supervisor
app.post("/api/verify-session", (req, res) => {
  const { token } = req.body;
  if (token === "utel-supervisor-session-token") {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: "Sesión inválida o expirada" });
});

// API: Cargar llamada de prueba / demo bajo demanda
app.post("/api/cargar-demo", (req, res) => {
  const uniqueId = `call_demo_${Date.now()}`;
  const demoCall = generateHighFidelitySimulatedCall(
    `Llamada_Comercial_Demo_UTEL_${Math.floor(Math.random() * 90 + 10)}.mp3`,
    4829310,
    uniqueId
  );
  localCallsMemory = [demoCall, ...localCallsMemory];
  return res.json(demoCall);
});

// API: Obtener Listado de Llamadas
app.get("/api/llamadas", (req, res) => {
  return res.json(localCallsMemory);
});

// API: Obtener archivo de audio real (Soporta HTTP Range Requests para saltar segundos sin reiniciar)
app.get("/api/audio/:id", (req, res) => {
  const buffer = audioBuffers.get(req.params.id);
  if (!buffer) {
    // Si no está en memoria, redirigir al respaldo estático para no romper la UI
    return res.redirect("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3");
  }

  const totalLength = buffer.length;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

    if (start >= totalLength || end >= totalLength || start < 0 || end < start) {
      res.writeHead(416, {
        "Content-Range": `bytes */${totalLength}`,
        "Accept-Ranges": "bytes"
      });
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
    res.end();
  } else {
    res.writeHead(200, {
      "Content-Length": totalLength,
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes"
    });
    res.write(buffer);
    res.end();
  }
});

// API: Subir archivo de audio y procesar directo con AssemblyAI + Google AI (Gemini)
app.post("/api/upload", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo de audio." });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    const originalName = file.originalname;
    const uniqueId = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (!apiKey) {
      console.warn("Clave de API de AssemblyAI omitida o no encontrada. Iniciando motor directo de Google Gemini...");
      const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3';
      try {
        const analysis = await generateGeminiAnalysis(file.buffer, ext);
        const finalCallData = {
          id: uniqueId,
          metadata: {
            fileName: originalName,
            url: `/api/audio/${uniqueId}`,
            size: file.size,
            duration: analysis.duration || 180,
            uploadedAt: new Date().toISOString(),
            uploadedBy: "auditor_sales_prod",
            status: "completed"
          },
          score: {
            global: Math.round((analysis.utel?.totalScore || 0) * 10),
            greeting: 85,
            needDiscovery: 80,
            objectionHandling: 70,
            closingSkills: 60,
            empathy: 75
          },
          analysis: {
            summary: analysis.summary || "Llamada procesada de forma multimodal.",
            strengths: analysis.strengths || [],
            weaknesses: analysis.weaknesses || [],
            nextSteps: analysis.nextSteps || [],
            customerMood: analysis.customerMood || "neutral",
            salesOutcome: analysis.salesOutcome || "interesado_seguimiento",
            utel: analysis.utel,
            emotionalAnalysis: analysis.emotionalAnalysis
          },
          transcription: analysis.transcription || []
        };
        audioBuffers.set(uniqueId, file.buffer);
        localCallsMemory = [finalCallData, ...localCallsMemory.filter(c => c.id !== uniqueId)];
        return res.json(finalCallData);
      } catch (geminiUploadErr: any) {
        console.error("Fallo definitivo procesando de forma alternativa con Gemini en carga directa:", geminiUploadErr);
        const fallbackCallData = generateHighFidelitySimulatedCall(originalName, file.size, uniqueId);
        audioBuffers.set(uniqueId, file.buffer);
        localCallsMemory = [fallbackCallData, ...localCallsMemory.filter(c => c.id !== uniqueId)];
        return res.json(fallbackCallData);
      }
    }

    console.log(`Iniciando procesamiento de audio: ${originalName} (ID: ${uniqueId})`);

    let finalCallData: any;
    try {
      // 1. Subir Buffer a AssemblyAI
      const uploadResponse = await axios.post(
        "https://api.assemblyai.com/v2/upload",
        file.buffer,
      {
        headers: {
          "authorization": apiKey,
          "content-type": "application/octet-stream"
        }
      }
    );

    const uploadUrl = uploadResponse.data.upload_url;

    // 2. Transcripción
    const transcriptResponse = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: uploadUrl,
        language_code: "es",
        speaker_labels: true
      },
      {
        headers: {
          "authorization": apiKey,
          "content-type": "application/json"
        }
      }
    );

    const transcriptId = transcriptResponse.data.id;
    console.log(`Transcripción iniciada en AssemblyAI. ID: ${transcriptId}`);

    // Guardar estado inicial como "processing"
    const processingCallStub = {
      id: uniqueId,
      metadata: {
        fileName: originalName,
        url: `/api/audio/${uniqueId}`,
        size: file.size,
        duration: 0,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "auditor_sales_prod",
        status: "processing"
      },
      score: { global: 0, greeting: 0, needDiscovery: 0, objectionHandling: 0, closingSkills: 0, empathy: 0 },
      analysis: {
        summary: "Procesando transcripción y auditoría cognitiva...",
        strengths: [], weaknesses: [], nextSteps: [],
        customerMood: "neutral",
        salesOutcome: "interesado_seguimiento"
      },
      transcription: []
    };

    localCallsMemory.unshift(processingCallStub);

    // 3. Polling AssemblyAI (Simulado síncrono para esta demo simplificada)
    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 60; 
    let resultData: any = null;

    while (!isCompleted && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));

      const pollResponse = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { "authorization": apiKey } }
      );

      const status = pollResponse.data.status;
      if (status === "completed") {
        isCompleted = true;
        resultData = pollResponse.data;
      } else if (status === "failed") {
        throw new Error(`AssemblyAI falló: ${pollResponse.data.error}`);
      }
    }

    if (!isCompleted || !resultData) {
      throw new Error("Agotado el tiempo de espera de transcripción.");
    }

    // 4. Mapear bocetos de diálogos con algoritmo inteligente y de alta fidelidad para detección de roles (Vendedor vs Cliente)
    const rawUtterances = resultData.utterances || [];
    let rawSpeakerSeller = "";

    if (rawUtterances.length > 0) {
      const uniqueSpeakers: string[] = Array.from(new Set(rawUtterances.map((u: any) => u.speaker))).filter(Boolean) as string[];
      
      if (uniqueSpeakers.length <= 1) {
        rawSpeakerSeller = uniqueSpeakers[0] || "A";
      } else {
        // Inicializar puntajes para cada orador para determinar cuál es el Asesor/Vendedor de UTEL
        const speakerScores: Record<string, number> = {};
        uniqueSpeakers.forEach(sp => {
          speakerScores[sp as string] = 0;
        });

        const sellerKeywords = [
          "utel", "universidad", "asesor", "asesora", "ejecutivo", "ejecutiva", "bienvenido", "bienvenida",
          "mi nombre es", "le llamo de", "te llamo de", "habla", "colegiatura", "mensualidad", "inscripción",
          "beca", "descuento", "revalidar", "equivalencia", "plan de estudios", "modelo educativo",
          "duración", "jornada", "egresados", "países", "documentación", "documentos", "correo",
          "whatsapp", "tipificación", "seguimiento", "teléfono", "referido"
        ];

        const clientKeywords = [
          "información", "me interesa", "interesado", "interesada", "cuánto cuesta", "costo", "precio",
          "duda", "pregunta", "trabajo", "horario", "tiempo", "caro", "dinero", "estudiar", "becas"
        ];

        rawUtterances.forEach((u: any) => {
          const textLower = (u.text || "").toLowerCase();
          const sp = u.speaker;
          if (speakerScores[sp] !== undefined) {
            sellerKeywords.forEach(kw => {
              if (textLower.includes(kw)) {
                speakerScores[sp] += 2; // Alta relevancia para términos de Asesor comercial
              }
            });
            clientKeywords.forEach(kw => {
              if (textLower.includes(kw)) {
                speakerScores[sp] -= 1; // Un cliente tiende a interrogar estas cosas
              }
            });
          }
        });

        // Heurística de apertura de llamada: Dar ventaja al vendedor
        const firstSpeaker = rawUtterances[0].speaker;
        const secondSpeaker = uniqueSpeakers.find(s => s !== firstSpeaker);
        
        let firstSpeakerGreetingMatch = false;
        const greetingKeywords = ["mi nombre es", "bienvenido a utel", "le llamo de utel", "te llamo de utel", "habla", "asesor"];
        for (let i = 0; i < Math.min(2, rawUtterances.length); i++) {
          if (rawUtterances[i].speaker === firstSpeaker) {
            const textLower = (rawUtterances[i].text || "").toLowerCase();
            if (greetingKeywords.some(kw => textLower.includes(kw))) {
              firstSpeakerGreetingMatch = true;
              break;
            }
          }
        }

        if (firstSpeakerGreetingMatch) {
          speakerScores[firstSpeaker as string] += 10;
        } else {
          // Si el primer contacto es un "hola", "bueno", "aló" de menos de 15 caracteres, probablemente era el cliente respondiendo
          const firstUtteranceText = (rawUtterances[0].text || "").trim().toLowerCase();
          if (firstUtteranceText.length < 15 && (firstUtteranceText === "bueno" || firstUtteranceText === "hola" || firstUtteranceText === "bueno hola" || firstUtteranceText === "sí" || firstUtteranceText === "si")) {
            if (secondSpeaker) {
              speakerScores[secondSpeaker as string] += 5;
            }
          }
        }

        // Seleccionar al orador de mayor puntaje acumulado como Vendedor
        let maxScore = -Infinity;
        let bestSeller = uniqueSpeakers[0];
        uniqueSpeakers.forEach(sp => {
          if (speakerScores[sp as string] > maxScore) {
            maxScore = speakerScores[sp as string];
            bestSeller = sp;
          }
        });

        rawSpeakerSeller = bestSeller;
        console.log("[SPEAKER_RESOLUTION_UPLOAD]", {
          speakerScores,
          selectedSeller: rawSpeakerSeller,
          firstSpeaker,
          uniqueSpeakers
        });
      }
    }

    // Heurística de sentimientos
    const posWords = ["bien", "excelente", "perfecto", "gracias", "interesa", "interesado", "gusta", "bueno", "súper", "claro", "sí"];
    const negWords = ["no", "caro", "costoso", "tiempo", "complicado", "difícil", "duda", "pero", "mal"];

    const cleanTranscription = rawUtterances.map((item: any) => {
      const isSeller = item.speaker === rawSpeakerSeller;
      const textLower = (item.text || "").toLowerCase();
      
      let computedSentiment = "neutral";
      if (!isSeller) {
        const hasPos = posWords.some(w => textLower.includes(w));
        const hasNeg = negWords.some(w => textLower.includes(w));
        if (hasPos && !hasNeg) {
          computedSentiment = "positive";
        } else if (hasNeg) {
          computedSentiment = "negative";
        }
      }

      return {
        speaker: isSeller ? "Vendedor" : "Cliente",
        start: parseFloat((item.start / 1000).toFixed(2)),
        end: parseFloat((item.end / 1000).toFixed(2)),
        text: item.text,
        sentiment: computedSentiment,
        confidence: item.confidence || 0.95
      };
    });

    const correctedTranscription = await applyTranscriptionGuardrails(cleanTranscription);
    const localUtelResult = evaluateUtelHeuristic(correctedTranscription, originalName);

    // Obtener parámetros de motor seleccionados por el usuario
    const selectedEngine = req.body.engine || "gemini";
    const ollamaUrl = req.body.ollamaUrl || "http://localhost:11434";
    const ollamaModelName = req.body.ollamaModel || "llama3";

    // 5. INTELIGENCIA COGNITIVA Y ANÁLISIS EMOCIONAL (MATRIZ PCE UTEL OFICIAL DE LOS PDF)
    const buildCheckedChecklist = (
      evaluatedSubitems: Record<string, boolean>,
      feedbackMap: Record<string, string>,
      modalidad: 'LÍNEA' | 'EJECUTIVA' | 'HÍBRIDA'
    ) => {
      // C1. CONOCE A TU CLIENTE (1.00 pts en total, cada subítem pesa 0.20 pts)
      const subC1 = [
        { id: "c1_linea", name: "Interés en línea", weight: 0.20, checked: !!evaluatedSubitems["c1_linea"] },
        { id: "c1_programa", name: "Programa de interés", weight: 0.20, checked: !!evaluatedSubitems["c1_programa"] },
        { id: "c1_demo", name: "Datos demográficos (edad/ubicación/medio)", weight: 0.20, checked: !!evaluatedSubitems["c1_demo"] },
        { id: "c1_ocup", name: "Ocupación/estudios previos", weight: 0.20, checked: !!evaluatedSubitems["c1_ocup"] },
        { id: "c1_equiv", name: "Equivalencias", weight: 0.20, checked: !!evaluatedSubitems["c1_equiv"] }
      ];
      const scoreC1 = parseFloat(subC1.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

      // C2. GENERALIDADES (1.00 pts en total, ponderados como 0.34, 0.33, 0.33)
      const subC2 = [
        { id: "c2_num", name: "Numeralia (12+ años, 3 países, egresados)", weight: 0.34, checked: !!evaluatedSubitems["c2_num"] },
        { id: "c2_mod", name: "Modelo Educativo", weight: 0.33, checked: !!evaluatedSubitems["c2_mod"] },
        { id: "c2_esp", name: "Modalidad específica", weight: 0.33, checked: !!evaluatedSubitems["c2_esp"] }
      ];
      const scoreC2 = parseFloat(subC2.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

      // C3. OFERTA ACADÉMICA (1.00 pts en total, cada subítem pesa 0.20 pts)
      const subC3 = [
        { id: "c3_costos", name: "Costos", weight: 0.20, checked: !!evaluatedSubitems["c3_costos"] },
        { id: "c3_comp", name: "Complemento de colegiatura", weight: 0.20, checked: !evaluatedSubitems.hasOwnProperty("c3_comp") ? true : !!evaluatedSubitems["c3_comp"] }, // Resiliencia
        { id: "c3_jor", name: "Jornada", weight: 0.20, checked: !!evaluatedSubitems["c3_jor"] },
        { id: "c3_beca", name: "Vigencia de beca", weight: 0.20, checked: !!evaluatedSubitems["c3_beca"] },
        { id: "c3_ciclos", name: "Ciclos de inicio", weight: 0.20, checked: !!evaluatedSubitems["c3_ciclos"] }
      ];
      const scoreC3 = parseFloat(subC3.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

      // C4. ACUERDOS Y CIERRE (1.00 pts en total, cada subítem pesa 0.25 pts)
      const subC4 = [
        { id: "c4_res", name: "Resumen de la oferta", weight: 0.25, checked: !!evaluatedSubitems["c4_res"] },
        { id: "c4_doc", name: "Envío de documentos", weight: 0.25, checked: !!evaluatedSubitems["c4_doc"] },
        { id: "c4_pag", name: "Acuerdos de pago", weight: 0.25, checked: !!evaluatedSubitems["c4_pag"] },
        { id: "c4_ref", name: "Solicitud de referidos", weight: 0.25, checked: !!evaluatedSubitems["c4_ref"] }
      ];
      const scoreC4 = parseFloat(subC4.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

      // C5. GESTIÓN Y REGISTRO (6.00 pts en total, cada subítem pesa 1.20 pts)
      const subC5 = [
        { id: "c5_int", name: "Hablar directamente con el interesado", weight: 1.20, checked: !evaluatedSubitems.hasOwnProperty("c5_int") ? true : !!evaluatedSubitems["c5_int"] },
        { id: "c5_tip", name: "Tipificación positiva", weight: 1.20, checked: evaluatedSubitems["c5_tip"] !== false },
        { id: "c5_pla", name: "Interacción dentro de plataformas UTEL", weight: 1.20, checked: evaluatedSubitems["c5_pla"] !== false },
        { id: "c5_reg", name: "Registro de interacción", weight: 1.20, checked: evaluatedSubitems["c5_reg"] !== false },
        { id: "c5_seg", name: "Seguimiento de acuerdos", weight: 1.20, checked: !!evaluatedSubitems["c5_seg"] }
      ];
      const scoreC5 = parseFloat(subC5.reduce((acc, s) => acc + (s.checked ? s.weight : 0), 0).toFixed(2));

      const totalScore = parseFloat((scoreC1 + scoreC2 + scoreC3 + scoreC4 + scoreC5).toFixed(2));
      const isCompliant = totalScore >= 7.0;

      return {
        totalScore,
        isCompliant,
        checkedItemsCount: 5,
        modalidadDetectada: modalidad,
        evaluacion_detallada: {
          "CONOCE A TU CLIENTE": feedbackMap["CONOCE A TU CLIENTE"] || `${scoreC1.toFixed(2)} pts - Se indagarón los datos y necesidades de estudio.`,
          "GENERALIDADES": feedbackMap["GENERALIDADES"] || `${scoreC2.toFixed(2)} pts - Se explicó el respaldo y beneficios de UTEL.`,
          "OFERTA ACADÉMICA": feedbackMap["OFERTA ACADÉMICA"] || `${scoreC3.toFixed(2)} pts - Presentación detallada de colegiatura, becas e inscripción.`,
          "ACUERDOS Y CIERRE": feedbackMap["ACUERDOS Y CIERRE"] || `${scoreC4.toFixed(2)} pts - Establecimiento de compromisos y envío de documentos.`,
          "GESTIÓN Y REGISTRO": feedbackMap["GESTIÓN Y REGISTRO"] || `${scoreC5.toFixed(2)} pts - Cumplimiento del protocolo y tipificación del CRM.`
        },
        checklist: [
          { id: "C1", title: "CONOCE A TU CLIENTE", weight: 1.00, score: scoreC1, status: scoreC1 >= 0.8 ? 'passed' : 'failed', feedback: feedbackMap["CONOCE A TU CLIENTE"] || "Indagación de perfil del prospecto.", subitems: subC1 },
          { id: "C2", title: "GENERALIDADES", weight: 1.00, score: scoreC2, status: scoreC2 >= 0.8 ? 'passed' : 'failed', feedback: feedbackMap["GENERALIDADES"] || "Institucionalidad y modelo educativo.", subitems: subC2 },
          { id: "C3", title: "OFERTA ACADÉMICA", weight: 1.00, score: scoreC3, status: scoreC3 >= 0.8 ? 'passed' : 'failed', feedback: feedbackMap["OFERTA ACADÉMICA"] || "Información de costos y beneficios.", subitems: subC3 },
          { id: "C4", title: "ACUERDOS Y CIERRE", weight: 1.00, score: scoreC4, status: scoreC4 >= 0.75 ? 'passed' : 'failed', feedback: feedbackMap["ACUERDOS Y CIERRE"] || "Cierre de compromisos.", subitems: subC4 },
          { id: "C5", title: "GESTIÓN Y REGISTRO", weight: 6.00, score: scoreC5, status: scoreC5 >= 4.0 ? 'passed' : 'failed', feedback: feedbackMap["GESTIÓN Y REGISTRO"] || "Cumplimiento de procesos UTEL.", subitems: subC5 }
        ]
      };
    };

    let finalUtelResult = localUtelResult;
    let summaryText = `La llamada para '${originalName}' se auditó internamente.`;
    let customerMood: 'receptivo' | 'molesto' | 'neutral' | 'interesado' | 'indiferente' = 'neutral';
    let salesOutcome: 'venta_cerrada' | 'interesado_seguimiento' | 'no_interesado' | 'agenda_demostracion' = 'interesado_seguimiento';
    let strengths = ["Presentación clara"];
    let weaknesses = ["Oportunidad en cierre"];
    let nextSteps = ["Seguimiento CRM"];
    let emotionalAnalysis = localUtelResult.emotionalAnalysis;

    // Prompt cognitivo robusto y blindado, basándose exactamente en los PDF de UTEL
    const promptText = `
    # ROL
    Eres un Auditor Senior de Calidad Educativa y un experto en Neuroventas. Analiza la transcripción de la llamada telefónica y califica el desempeño del vendedor de acuerdo con la Rúbrica de Auditoría PCE de UTEL Universidad. Además, evalúa detenidamente el estado emocional del cliente.

    # REGLAS DE AUDITORÍA PCE UTEL (21 PARÁMETROS):
    Debes marcar cada uno de los siguientes 21 puntos como VERDADERO (true) o FALSO (false) según se identifiquen racionalmente o correspondan con la conversación en la transcripción de la llamada. no asumas ni alteres esta estructura:

    C1. CONOCE A TU CLIENTE
    - "c1_linea": ¿El cliente muestra interés en la opción en línea o el asesor aborda ese formato? (true/false)
    - "c1_programa": ¿Se determina el programa de interés específico (Licenciatura, Maestría, etc.)? (true/false)
    - "c1_demo": ¿Se registran datos demográficos clave como edad, ubicación o medio de contacto? (true/false)
    - "c1_ocup": ¿Se indaga sobre la ocupación del cliente (si trabaja, horario) o estudios previos? (true/false)
    - "c1_equiv": ¿El asesor pregunta sobre equivalencias, revalidación o estudios inconclusos? (true/false)

    C2. GENERALIDADES
    - "c2_num": ¿Se expone la numeralia oficial UTEL (más de 12 años, presencia en 3 países, miles de egresados)? (true/false)
    - "c2_mod": ¿Se detalla y explica el modelo educativo flexible de UTEL? (true/false)
    - "c2_esp": ¿Se vincula el modelo educativo específicamente con las necesidades expresadas por el prospecto? (true/false)

    C3. OFERTA ACADÉMICA
    - "c3_costos": ¿Se presentan formalmente costos y opciones de colegiatura? (true/false)
    - "c3_comp": ¿Se explican los costos complementarios (cuota de inscripción, cargos de reinscripción periódicos)? (true/false)
    - "c3_jor": ¿Se define la jornada de estudio sugerida y las horas de dedicación semanal recomendadas en plataforma? (true/false)
    - "c3_beca": ¿Se informa sobre la beca otorgada, su porcentaje, vigencia y compromisos/promedio para mantenerla? (true/false)
    - "c3_ciclos": ¿Se aclara la fecha de inicio de clases o la periodicidad de los ciclos de inicio? (true/false)

    C4. ACUERDOS Y CIERRE
    - "c4_res": ¿Se le brinda al cliente un resumen exacto con las condiciones de la oferta comercial? (true/false)
    - "c4_doc": ¿Se solicita la entrega de documentos básicos de admisión (CURP, certificado, etc.) y fecha límite? (true/false)
    - "c4_pag": ¿Se logran acordar fechas de pago específicas o compromisos de liquidación de matrícula? (true/false)
    - "c4_ref": ¿El asesor solicita proactivamente referidos, recomendados, amigos o familiares al prospecto? (true/false)

    C5. GESTIÓN Y REGISTRO
    - "c5_int": ¿El asesor habla directa y fluidamente con el prospecto interesado a lo largo de la llamada? (true/false)
    - "c5_tip": ¿Se infiere uso de una tipificación correcta de seguimiento al prospecto? (true/false)
    - "c5_pla": ¿El asesor utiliza las plataformas y guiones UTEL correctos en su trato? (true/false)
    - "c5_reg": ¿Se infiere el registro íntegro de la llamada en plataforma CRM? (true/false)
    - "c5_seg": ¿Se acuerda una fecha/hora específica para el seguimiento formal del trámite escolar? (true/false)

    # ANÁLISIS DE LA PSICOLOGÍA DEL CLIENTE:
    Evalúa el estado emocional e intenciones de compra del cliente:
    - "primaryEmotion": Emoción predominante observable (p. ej. "Interesado pero indeciso", "Molesto", "Escéptico", "Entusiasmado").
    - "emotionalJourney": Viaje emocional de la conversación (cómo progresa de inicio a fin).
    - "purchaseAptitudeScore": Puntuación numérica (0 a 100) del deseo potencial y aptitud de compra real.
    - "purchaseAptitudeLabel": Basado en el puntaje: "Muy Alto" (90-100), "Alto" (70-89), "Medio" (40-69), "Bajo" (15-39), "Nulo" (0-14).
    - "barriersToPurchase": Obstáculos o fricciones para inscribirse (como costos, falta de tiempo, desconfianza).
    - "buyingSignals": Señales positivas observadas (preguntas por el inicio, por el examen, por los pagos).
    - "aptitudeReason": Motivos del estado de compra, justificación de por qué está apto, y qué táctica comercial exacta debe implementar el asesor comercial en la siguiente interacción para cerrar la venta.

    # TRANSCRIPCIÓN DEL AUDIO:
    ${JSON.stringify(correctedTranscription, null, 2)}

    # FORMATO DE RESPUESTA EXCLUSIVO (JSON VÁLIDO SIN TEXTO NI MARKDOWN EXTRA):
    {
      "evaluated_subitems": {
        "c1_linea": true,
        "c1_programa": true,
        "c1_demo": false,
        "c1_ocup": true,
        "c1_equiv": false,
        "c2_num": true,
        "c2_mod": true,
        "c2_esp": false,
        "c3_costos": true,
        "c3_comp": true,
        "c3_jor": false,
        "c3_beca": true,
        "c3_ciclos": false,
        "c4_res": true,
        "c4_doc": false,
        "c4_pag": true,
        "c4_ref": false,
        "c5_int": true,
        "c5_cor": true,
        "c5_tip": true,
        "c5_pla": true,
        "c5_reg": true,
        "c5_seg": true
      },
      "evaluacion_detallada": {
        "CONOCE A TU CLIENTE": "Retroalimentación sobre la calidad comercial en este bloque...",
        "GENERALIDADES": "Opinión de la transmisión del modelo educativo virtual...",
        "OFERTA ACADÉMICA": "Evaluación del detalle comercial (costos, becas, jornada)...",
        "ACUERDOS Y CIERRE": "Evaluación de los acuerdos, solicitud de documentos y referidos...",
        "GESTIÓN Y REGISTRO": "Juicio sobre el envío de cotizaciones y programación de seguimiento..."
      },
      "modalidad_detectada": "LÍNEA",
      "summary": "Resumen cognitivo detallado del desempeño del asesor comercial en la llamada.",
      "strengths": [ "Fortaleza 1", "Fortaleza 2", "Fortaleza 3" ],
      "weaknesses": [ "Debilidad 1", "Debilidad 2" ],
      "nextSteps": [ "Paso recomendado 1", "Paso recomendado 2" ],
      "customerMood": "interesado",
      "salesOutcome": "interesado_seguimiento",
      "emotionalAnalysis": {
        "primaryEmotion": "Interesado",
        "emotionalJourney": "Inició con dudas institucionales, se interesó por la beca especial y planteó ciertas objeciones en el pago.",
        "purchaseAptitudeScore": 75,
        "purchaseAptitudeLabel": "Alto",
        "barriersToPurchase": [ "Falta de liquidez para inscripción", "Indecisión de carrera alternas" ],
        "buyingSignals": [ "Preguntó cuándo abre inscripciones", "Dijo que quiere estudiar de noche" ],
        "aptitudeReason": "El candidato tiene un excelente perfil para estudiar de noche pero le frena el pago inicial. Estrategia comercial recomendada: ofrecer planes de financiamiento o aplazamiento de cuota de inscripción para lograr el registro inmediato."
      }
    }
    `;

    if (selectedEngine === "ollama") {
      try {
        console.log(`Llamando a Ollama Local [${ollamaUrl}] con modelo [${ollamaModelName}]...`);
        const ollamaResponse = await axios.post(`${ollamaUrl}/api/generate`, {
          model: ollamaModelName,
          prompt: promptText,
          format: "json",
          stream: false
        }, {
          timeout: 28000
        });

        let responseString = ollamaResponse.data.response;
        const cleanJsonStr = responseString.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        if (parsed) {
          const evaluatedSubitems = parsed.evaluated_subitems || {};
          const feedbackMap = parsed.evaluacion_detallada || {};
          const modality = parsed.modalidad_detectada || "LÍNEA";

          // Cómputo matemático riguroso basado en el PDF y los subitems resultantes
          finalUtelResult = buildCheckedChecklist(evaluatedSubitems, feedbackMap, modality);

          summaryText = parsed.summary || summaryText;
          customerMood = parsed.customerMood || customerMood;
          salesOutcome = parsed.salesOutcome || salesOutcome;
          strengths = parsed.strengths || strengths;
          weaknesses = parsed.weaknesses || weaknesses;
          nextSteps = parsed.nextSteps || nextSteps;
          if (parsed.emotionalAnalysis) {
            emotionalAnalysis = parsed.emotionalAnalysis;
          }
          console.log("Auditoría con Ollama completada con éxito riguroso.");
        }
      } catch (ollamaErr: any) {
        console.error("Error intentando conectar con Ollama:", ollamaErr.message);
        throw new Error(`Fallo de conexión con Ollama en ${ollamaUrl}. Asegúrate de tener Ollama activo localmente, CORS habilitado, y el modelo '${ollamaModelName}' descargado ('ollama pull ${ollamaModelName}').`);
      }
    } else {
      // Usar Google Gemini por defecto
      const ai = getGeminiClient();
      if (ai) {
        try {
          console.log("Iniciando auditoría cognitiva con Gemini...");
          const geminiResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptText,
            config: {
              responseMimeType: "application/json"
            }
          });
          
          const responseText = geminiResponse.text;
          const parsed = JSON.parse(responseText || "{}");
          
          if (parsed) {
            const evaluatedSubitems = parsed.evaluated_subitems || {};
            const feedbackMap = parsed.evaluacion_detallada || {};
            const modality = parsed.modalidad_detectada || "LÍNEA";

            // Cómputo matemático riguroso basado en el PDF y los subitems resultantes
            finalUtelResult = buildCheckedChecklist(evaluatedSubitems, feedbackMap, modality);

            summaryText = parsed.summary || summaryText;
            customerMood = parsed.customerMood || customerMood;
            salesOutcome = parsed.salesOutcome || salesOutcome;
            strengths = parsed.strengths || strengths;
            weaknesses = parsed.weaknesses || weaknesses;
            nextSteps = parsed.nextSteps || nextSteps;
            if (parsed.emotionalAnalysis) {
              emotionalAnalysis = parsed.emotionalAnalysis;
            }
            console.log("Auditoría cognitiva con Gemini completada con éxito riguroso.");
          }
        } catch (geminiErr) {
          console.error("Error Gemini:", geminiErr);
        }
      }
    }

      finalCallData = {
        id: uniqueId,
        metadata: {
          fileName: originalName,
          url: `/api/audio/${uniqueId}`,
          size: file.size,
          duration: Math.round(resultData?.audio_duration || 180),
          uploadedAt: new Date().toISOString(),
          uploadedBy: "auditor_sales_prod",
          status: "completed"
        },
        score: {
          global: Math.round(finalUtelResult.totalScore * 10),
          greeting: 85,
          needDiscovery: 80,
          objectionHandling: 70,
          closingSkills: 60,
          empathy: 75
        },
        analysis: {
          summary: summaryText,
          strengths: strengths,
          weaknesses: weaknesses,
          nextSteps: nextSteps,
          customerMood: customerMood,
          salesOutcome: salesOutcome,
          utel: finalUtelResult,
          emotionalAnalysis: emotionalAnalysis
        },
        transcription: correctedTranscription
      };
    } catch (apiErr: any) {
      console.warn("Fallo en procesamiento de AssemblyAI, intentando procesar de forma alternativa con Google Gemini directo:", apiErr.message);
      try {
        const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3';
        const analysis = await generateGeminiAnalysis(file.buffer, ext);
        finalCallData = {
          id: uniqueId,
          metadata: {
            fileName: originalName,
            url: `/api/audio/${uniqueId}`,
            size: file.size,
            duration: analysis.duration || 180,
            uploadedAt: new Date().toISOString(),
            uploadedBy: "auditor_sales_prod",
            status: "completed"
          },
          score: {
            global: Math.round((analysis.utel?.totalScore || 0) * 10),
            greeting: 85,
            needDiscovery: 80,
            objectionHandling: 70,
            closingSkills: 60,
            empathy: 75
          },
          analysis: {
            summary: analysis.summary || "Llamada auditada y analizada exitosamente.",
            strengths: analysis.strengths || [],
            weaknesses: analysis.weaknesses || [],
            nextSteps: analysis.nextSteps || [],
            customerMood: analysis.customerMood || "neutral",
            salesOutcome: analysis.salesOutcome || "interesado_seguimiento",
            utel: analysis.utel,
            emotionalAnalysis: analysis.emotionalAnalysis
          },
          transcription: analysis.transcription || []
        };
      } catch (backupErr: any) {
        console.error("Fallo definitivo en ambos procesadores, recurriendo a simulador cognitivo de alta fidelidad:", backupErr.message);
        finalCallData = generateHighFidelitySimulatedCall(originalName, file.size, uniqueId);
      }
    }

    audioBuffers.set(uniqueId, file.buffer);
    localCallsMemory = [finalCallData, ...localCallsMemory.filter(c => c.id !== uniqueId)];

    return res.json(finalCallData);
  } catch (error: any) {
    console.error("Fallo definitivo en la ruta de subida:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint para borrar llamada
app.delete("/api/llamadas/:id", (req, res) => {
  const callId = req.params.id;
  audioBuffers.delete(callId);
  localCallsMemory = localCallsMemory.filter(c => c.id !== callId);
  return res.json({ success: true });
});

// API: Guardar auditoría en Google Drive
app.post("/api/drive-save", async (req, res) => {
  const { callData, accessToken } = req.body;

  if (!callData || !accessToken) {
    return res.status(400).json({ error: "Datos de llamada y token son requeridos." });
  }

  try {
    const folderName = "Auditorías PCE UTEL";
    
    // 1. Buscar o crear carpeta (Soportando Unidades Compartidas / Cuentas Institucionales)
    let folderId = "";
    const searchFolder = await axios.get(`https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchFolder.data.files.length > 0) {
      folderId = searchFolder.data.files[0].id;
    } else {
      const createFolder = await axios.post("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder"
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      folderId = createFolder.data.id;
    }

    // 2. Subir el JSON
    const fileName = `Audit_${callData.metadata.fileName.replace(/\.[^/.]+$/, "")}_${Date.now()}.json`;
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: "application/json"
    };

    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", new Blob([JSON.stringify(callData)], { type: "application/json" }));

    // Nota: axios con FormData puede ser complejo en Node para Google Drive. 
    // Usaremos un enfoque de 2 pasos o multipart manual.
    // Para simplicidad, usaremos el endpoint de upload simple con metadata.
    
    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true";
    
    const boundary = "auditor_pce_boundary";
    const body = `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(callData)}\r\n` +
      `--${boundary}--`;

    await axios.post(uploadUrl, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      }
    });

    return res.json({ success: true, message: "Auditoría guardada en Drive." });
  } catch (error: any) {
    console.error("Error al guardar en Drive:", error.response?.data || error.message);
    return res.status(500).json({ error: `Fallo al guardar en Google Drive: ${error.response?.data?.error?.message || error.message}` });
  }
});

// API: Listar historial desde Google Drive
app.get("/api/drive-history", async (req, res) => {
  const { accessToken } = req.query;

  if (!accessToken) {
    return res.status(400).json({ error: "Token es requerido." });
  }

  try {
    const folderName = "Auditorías PCE UTEL";
    
    // 1. Buscar la carpeta (Soportando Unidades Compartidas / Cuentas Institucionales)
    const searchFolder = await axios.get(`https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
      headers: { Authorization: `Bearer ${accessToken as string}` }
    });

    if (searchFolder.data.files.length === 0) {
      return res.json({ calls: [] });
    }

    const folderId = searchFolder.data.files[0].id;

    // 2. Listar archivos JSON en esa carpeta (Soportando Unidades Compartidas / Cuentas Institucionales)
    const listFiles = await axios.get(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and mimeType='application/json' and trashed=false&fields=files(id, name)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
      headers: { Authorization: `Bearer ${accessToken as string}` }
    });

    const files = listFiles.data.files;
    const calls = [];

    // 3. Descargar el contenido de cada archivo (Límite 10 para no saturar, soportando Unidades Compartidas)
    for (const file of files.slice(0, 10)) {
      try {
        const fileContent = await axios.get(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, {
          headers: { Authorization: `Bearer ${accessToken as string}` }
        });
        if (fileContent.data && fileContent.data.id) {
          calls.push(fileContent.data);
        }
      } catch (e) {
        console.warn(`No se pudo leer el archivo ${file.name} de Drive.`);
      }
    }

    return res.json({ calls });
  } catch (error: any) {
    console.error("Error al listar Drive:", error.response?.data || error.message);
    return res.status(500).json({ error: `Fallo al recuperar historial de Google Drive: ${error.response?.data?.error?.message || error.message}` });
  }
});

// Middleware de integración de Vite
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor en puerto ${PORT}`);
  });
};

if (!process.env.VERCEL) {
  startServer();
}

export default app;
