export type CallStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface CallMetadata {
  fileName: string;
  url: string;
  size: number;
  duration: number;
  uploadedAt: string;
  uploadedBy: string;
  status: CallStatus;
  error?: string | null;
}

export interface CallScore {
  global: number; // 0 to 100 scaled or total points * 10
  greeting: number; // For backward compatibility or mapped from UTEL C1-C2
  needDiscovery: number; // Mapped from UTEL C3
  objectionHandling: number; // Mapped from UTEL C4-C5
  closingSkills: number; // Mapped from UTEL C6-C8
  empathy: number; // Mapped from UTEL C9-C10
}

export interface UtelSubItem {
  id: string;
  name: string;
  weight: number;
  checked: boolean;
  notes?: string;
}

export interface UtelChecklistItem {
  id: string; // C1 to C5
  title: string;
  weight: number; // 1.00 or 6.00
  score: number;  // Obtained score
  status: 'passed' | 'failed' | 'not_applicable';
  feedback: string;
  subitems?: UtelSubItem[];
}

export interface UtelEvaluation {
  totalScore: number; // out of 10.0
  isCompliant: boolean; // meets minimum requirements
  checkedItemsCount: number;
  modalidadDetectada: 'LÍNEA' | 'EJECUTIVA' | 'HÍBRIDA' | 'NO_DETECTADA';
  checklist: UtelChecklistItem[];
  evaluacion_detallada: Record<string, string>; // Category -> Explanation as requested
}

export interface CallAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
  customerMood: 'receptivo' | 'molesto' | 'neutral' | 'interesado' | 'indiferente';
  salesOutcome: 'venta_cerrada' | 'interesado_seguimiento' | 'no_interesado' | 'agenda_demostracion';
  utel?: UtelEvaluation; // Extended UTEL evaluation
  emotionalAnalysis?: {
    primaryEmotion: string;
    emotionalJourney: string;
    purchaseAptitudeScore: number; // 0 to 100
    purchaseAptitudeLabel: 'Muy Alto' | 'Alto' | 'Medio' | 'Bajo' | 'Nulo';
    barriersToPurchase: string[];
    buyingSignals: string[];
    aptitudeReason: string;
  };
}

export interface TranscriptionUtterance {
  speaker: 'Vendedor' | 'Cliente';
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface SalesCall {
  id: string;
  metadata: CallMetadata;
  score: CallScore;
  analysis: CallAnalysis;
  transcription: TranscriptionUtterance[];
  isLocalCacheOnly?: boolean;
}
