import { jsPDF } from 'jspdf';
import { SalesCall, UtelChecklistItem, UtelSubItem } from '../types';

// Helper to sanitize Latin-1 characters for standard jsPDF fonts
const sanitizeText = (txt: string): string => {
  if (!txt) return '';
  return txt
    .replace(/[\u2013\u2014]/g, '-') // replace em-dashes
    .replace(/[\u2018\u2019]/g, "'") // replace smart quotes
    .replace(/[\u25CF]/g, '*')      // replace bullet circle
    .replace(/[\u2713]/g, 'Ok')     // replace checkmark
    .replace(/[\uD83D\uD83E\uD83C]./g, ''); // strip emojis
};

export const downloadPDFReport = (call: SalesCall) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 20;
  const colWidth = 170; // 210 - 40
  const pageHeight = 297;
  let y = 20;

  // Header runner
  const drawPageHeader = (pageNumber: number) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('AUDITORÍA COGNITIVA PCE  |  REPORTE DE CALIDAD', margin, 12);
    doc.text(`Página ${pageNumber}`, 190 - margin, 12);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, 14, 210 - margin, 14);
  };

  let pageCount = 1;
  drawPageHeader(pageCount);

  // Check overflow with header drawer
  const checkOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      pageCount++;
      y = 20;
      drawPageHeader(pageCount);
    }
  };

  // 1. HEADER TITLE BANNER
  y = 22;
  doc.setFillColor(15, 23, 42); // deep slate/navy
  doc.rect(margin, y, colWidth, 24, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('CALIDAD DE ASESORÍA TELEFÓNICA', margin + 6, y + 10);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  doc.text('Auditoría Integral Cognitiva alineada a la Rúbrica PCE de Calidad Educativa', margin + 6, y + 16);
  y += 30;

  // 2. METADATA CARDS (TABLE LIKE)
  checkOverflow(40);
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, colWidth, 34, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  
  doc.text('INFORMACIÓN DE LA AUDITORÍA', margin + 6, y + 6);
  doc.line(margin, y + 9, margin + colWidth, y + 9);

  doc.setFontSize(8.5);
  // Column 1
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Archivo:', margin + 6, y + 16);
  doc.setFont('Helvetica', 'normal');
  doc.text(sanitizeText(call.metadata.fileName), margin + 34, y + 16);

  doc.setFont('Helvetica', 'bold');
  doc.text('Identificador:', margin + 6, y + 22);
  doc.setFont('Helvetica', 'normal');
  doc.text(call.id, margin + 34, y + 22);

  doc.setFont('Helvetica', 'bold');
  doc.text('Fecha:', margin + 6, y + 28);
  doc.setFont('Helvetica', 'normal');
  const d = new Date(call.metadata.uploadedAt);
  doc.text(isNaN(d.getTime()) ? call.metadata.uploadedAt : d.toLocaleString('es-MX'), margin + 34, y + 28);

  // Column 2
  doc.setFont('Helvetica', 'bold');
  doc.text('Duración:', margin + 110, y + 16);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${Math.round(call.metadata.duration)} segundos`, margin + 132, y + 16);

  doc.setFont('Helvetica', 'bold');
  doc.text('Modalidad:', margin + 110, y + 22);
  doc.setFont('Helvetica', 'normal');
  doc.text(call.analysis.utel?.modalidadDetectada || 'NO_DETECTADA', margin + 132, y + 22);

  doc.setFont('Helvetica', 'bold');
  doc.text('Auditor:', margin + 110, y + 28);
  doc.setFont('Helvetica', 'normal');
  doc.text(sanitizeText(call.metadata.uploadedBy || 'Sistema Automatizado'), margin + 132, y + 28);
  
  y += 40;

  // 3. CORE CALIFICATION OVERVIEW
  checkOverflow(28);
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(79, 70, 229); // Indigo line
  doc.setLineWidth(0.8);
  doc.rect(margin, y, colWidth, 22, 'F');
  doc.line(margin, y, margin, y + 22); // Thick highlight of score

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  doc.text('EVALUACIÓN GLOBAL PCE:', margin + 6, y + 8);

  const finalScore = call.analysis.utel ? call.analysis.utel.totalScore : (call.score.global / 10);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // indigo
  doc.text(`${finalScore.toFixed(2)} / 10.0`, margin + 60, y + 10);

  // Compliance banner status
  const isCompliant = call.analysis.utel ? call.analysis.utel.isCompliant : finalScore >= 7.0;
  doc.setFillColor(isCompliant ? 209 : 254, isCompliant ? 250 : 243, isCompliant ? 229 : 229); // light green or light redbg
  doc.setDrawColor(isCompliant ? 16 : 220, isCompliant ? 185 : 38, isCompliant ? 129 : 38);
  doc.setLineWidth(0.2);
  doc.rect(margin + 106, y + 4, colWidth - 112, 14, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(isCompliant ? 6 : 153, isCompliant ? 95 : 27, isCompliant ? 70 : 27);
  doc.text(isCompliant ? 'LLAMADA APROBADA' : 'FALTAN OBLIGATORIOS (*)', margin + 112, y + 12);
  
  y += 28;

  // 4. COGNITIVE SUMMARY
  checkOverflow(35);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMEN DE AUDITORÍA PCE', margin, y);
  doc.setLineWidth(0.4);
  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y + 1.5, margin + colWidth, y + 1.5);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  const summaryParagraph = sanitizeText(call.analysis.summary || 'Sin resumen disponible.');
  const summaryLines = doc.splitTextToSize(summaryParagraph, colWidth);
  checkOverflow(summaryLines.length * 4.5);
  summaryLines.forEach((line: string) => {
    doc.text(line, margin, y);
    y += 4.2;
  });
  y += 5;

  // 4b. ATTITUDES & MOODS
  checkOverflow(25);
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y, colWidth, 18, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text('TEMPLE CLIENTE:', margin + 6, y + 7);
  doc.text('RESULTADO COMERCIAL:', margin + 6, y + 13);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.text(call.analysis.customerMood.toUpperCase(), margin + 48, y + 7);
  
  const outcomeText = call.analysis.salesOutcome === 'venta_cerrada' 
    ? 'VENTA CERRADA' 
    : call.analysis.salesOutcome === 'interesado_seguimiento' 
    ? 'SEGUIMIENTO EN AGENDADO' 
    : call.analysis.salesOutcome === 'agenda_demostracion' 
    ? 'DEMOSTRACIÓN AGENDADA' 
    : 'NO INTERESADO';
  doc.text(outcomeText, margin + 48, y + 13);

  // Purchase aptitude
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(75, 85, 99);
  doc.text('INTENCIÓN COMPRA:', margin + 110, y + 7);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  const emotional = call.analysis.emotionalAnalysis;
  const aptScore = emotional ? `${emotional.purchaseAptitudeScore}% (${emotional.purchaseAptitudeLabel})` : `${call.score.global}%`;
  doc.text(aptScore, margin + 144, y + 7);

  y += 28;

  // 5. DETALLADO CHECKLIST DE LA RÚBRICA UTEL PCE
  checkOverflow(20);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DESGLOSE DE CRITERIOS PCE EVALUADOS (RÚBRICA OFICIAL)', margin, y);
  doc.line(margin, y + 1.5, margin + colWidth, y + 1.5);
  y += 6;

  const checklistItems = call.analysis.utel?.checklist || [];
  if (checklistItems.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Detalles técnicos de la rúbrica no especificados.', margin, y);
    y += 8;
  } else {
    checklistItems.forEach((item: UtelChecklistItem) => {
      checkOverflow(25);
      
      // Gray banner for Category
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, colWidth, 7, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${item.id} - ${sanitizeText(item.title.toUpperCase())}`, margin + 3, y + 5);

      doc.setFontSize(8.5);
      doc.text(`${item.score.toFixed(2)} / ${item.weight.toFixed(2)} pts`, margin + 136, y + 5);
      y += 8;

      // Feedback for this category
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      const categoryFeedback = sanitizeText(item.feedback);
      const feedbackLines = doc.splitTextToSize(`Observaciones: ${categoryFeedback}`, colWidth - 8);
      
      checkOverflow(feedbackLines.length * 4.2 + 2);
      feedbackLines.forEach((fline: string) => {
        doc.text(fline, margin + 4, y);
        y += 4;
      });
      y += 2;

      // Render Sub-items (Criteria)
      if (item.subitems && item.subitems.length > 0) {
        item.subitems.forEach((sub: UtelSubItem) => {
          checkOverflow(6);
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 110, 120);
          
          // Custom pass indicator character
          const statusChar = sub.checked ? '[X]' : '[ ]';
          doc.text(statusChar, margin + 6, y);
          
          doc.setTextColor(75, 85, 99);
          doc.text(sanitizeText(sub.name), margin + 14, y);
          
          doc.setFont('Helvetica', 'bold');
          doc.text(`+${sub.weight.toFixed(2)} pt`, margin + 150, y);
          y += 4.5;
        });
      }
      y += 4; // space after category block
    });
  }

  // 6. DETALLES COGNITIVOS DE MODALIDAD
  const detEval = call.analysis.utel?.evaluacion_detallada;
  if (detEval && Object.keys(detEval).length > 0) {
    checkOverflow(30);
    y += 2;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('JUSTIFICACIÓN COGNITIVA Y ANÁLISIS DE MODALIDAD', margin, y);
    doc.line(margin, y + 1.5, margin + colWidth, y + 1.5);
    y += 6;

    Object.entries(detEval).forEach(([title, detail]) => {
      checkOverflow(15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text(sanitizeText(title.toUpperCase()), margin, y);
      y += 3.8;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      const detailedLines = doc.splitTextToSize(sanitizeText(detail), colWidth);
      checkOverflow(detailedLines.length * 3.8 + 2);
      
      detailedLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 3.6;
      });
      y += 3;
    });
  }

  // 7. COACHING DE RENDIMIENTO
  checkOverflow(35);
  y += 4;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COACHING AL ASESOR Y PLAN DE MEJORA', margin, y);
  doc.line(margin, y + 1.5, margin + colWidth, y + 1.5);
  y += 6;

  // Strengths
  checkOverflow(15);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 122, 87); // Green flavor
  doc.text('FORTALEZAS AUDITADAS:', margin, y);
  y += 4.5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  call.analysis.strengths.forEach((str: string) => {
    checkOverflow(10);
    const strLines = doc.splitTextToSize(sanitizeText(`* ${str}`), colWidth - 4);
    strLines.forEach((line: string) => {
      doc.text(line, margin + 2, y);
      y += 4;
    });
  });
  y += 2;

  // Opportunities
  checkOverflow(15);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38); // Red style
  doc.text('ÁREAS DE MEJORA Y OPORTUNIDAD:', margin, y);
  y += 4.5;

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  call.analysis.weaknesses.forEach((weak: string) => {
    checkOverflow(10);
    const weakLines = doc.splitTextToSize(sanitizeText(`* ${weak}`), colWidth - 4);
    weakLines.forEach((line: string) => {
      doc.text(line, margin + 2, y);
      y += 4;
    });
  });
  y += 2;

  // Next steps
  checkOverflow(15);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text('PRÓXIMOS PASOS RECOMENDADOS (COACHING):', margin, y);
  y += 4.5;

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  call.analysis.nextSteps.forEach((step: string) => {
    checkOverflow(10);
    const stepLines = doc.splitTextToSize(sanitizeText(`* ${step}`), colWidth - 4);
    stepLines.forEach((line: string) => {
      doc.text(line, margin + 2, y);
      y += 4;
    });
  });

  // Footer visual seal at the end
  checkOverflow(25);
  y += 10;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.1);
  doc.line(margin, y, margin + colWidth, y);
  y += 5;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text('Este reporte de calidad educativa fue generado mediante procesamiento avanzado de datos.', margin, y);
  doc.text('Dirección de Servicios Tecnológicos de Auditoría de Calidad. Año 2026.', margin, y + 4.5);

  // Trigger download of PDF
  const filename = `reporte_auditoria_${call.id}.pdf`;
  doc.save(filename);
};

export const downloadCSVReport = (call: SalesCall) => {
  // UTF-8 BOM to ensure spanish special characters open perfectly in Excel
  let csvContent = '\uFEFF'; 
  
  // Header row
  const headers = [
    'ID_Llamada',
    'Nombre_Archivo',
    'Fecha_Auditoría',
    'Duración_Segundos',
    'Calificación_Global',
    'Aprobado_PCE',
    'Modalidad_Detectada',
    'Temple_Cliente',
    'Resultado_Comercial',
    'Aptitud_Compra_Porcentaje',
    'Aptitud_Compra_Nivel',
    'Categoría_Criterio',
    'Nombre_Categoría',
    'Puntaje_Asignado',
    'Puntaje_Máximo',
    'Observaciones_Feedback',
    'Indicador_Criterio',
    'Cumple_Indicador',
    'Peso_Indicador'
  ];
  
  csvContent += headers.map(h => `"${h}"`).join(';') + '\n';

  const baseInfo = [
    call.id,
    call.metadata.fileName,
    call.metadata.uploadedAt,
    call.metadata.duration,
    call.analysis.utel ? call.analysis.utel.totalScore.toFixed(2) : (call.score.global / 10).toFixed(2),
    call.analysis.utel ? (call.analysis.utel.isCompliant ? 'SÍ' : 'NO') : ((call.score.global / 10) >= 7.0 ? 'SÍ' : 'NO'),
    call.analysis.utel?.modalidadDetectada || 'NO_DETECTADA',
    call.analysis.customerMood,
    call.analysis.salesOutcome,
    call.analysis.emotionalAnalysis ? call.analysis.emotionalAnalysis.purchaseAptitudeScore : call.score.global,
    call.analysis.emotionalAnalysis ? call.analysis.emotionalAnalysis.purchaseAptitudeLabel : ''
  ].map(val => {
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  });

  const checklist = call.analysis.utel?.checklist || [];

  if (checklist.length === 0) {
    // Write single row with empty checklist
    const row = [...baseInfo, '""', '""', '""', '""', '""', '""', '""', '""'].join(';');
    csvContent += row + '\n';
  } else {
    checklist.forEach((item: UtelChecklistItem) => {
      const categoryPart = [
        item.id,
        item.title,
        item.score.toFixed(2),
        item.weight.toFixed(2),
        item.feedback
      ].map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });

      if (item.subitems && item.subitems.length > 0) {
        item.subitems.forEach((sub: UtelSubItem) => {
          const subitemPart = [
            sub.name,
            sub.checked ? 'SÍ' : 'NO',
            sub.weight.toFixed(2)
          ].map(val => {
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          });

          const fullRow = [...baseInfo, ...categoryPart, ...subitemPart].join(';');
          csvContent += fullRow + '\n';
        });
      } else {
        // Just write the category details
        const subitemPart = ['""', '""', '""'];
        const fullRow = [...baseInfo, ...categoryPart, ...subitemPart].join(';');
        csvContent += fullRow + '\n';
      }
    });
  }

  // Generate Download Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte_auditoria_${call.id}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadTranscriptionTXT = (call: SalesCall) => {
  const lineSeparator = "================================================================================\n";
  
  let content = "";
  content += lineSeparator;
  content += "                 TRANSCRIPCIÓN COMPLETA DE AUDITORÍA DE LLAMADA\n";
  content += lineSeparator;
  content += `ID de Llamada: ${call.id}\n`;
  content += `Nombre de Archivo: ${call.metadata.fileName}\n`;
  content += `Duración: ${Math.round(call.metadata.duration)} segundos\n`;
  
  const d = new Date(call.metadata.uploadedAt);
  content += `Fecha de Sincronización: ${isNaN(d.getTime()) ? call.metadata.uploadedAt : d.toLocaleString('es-MX')}\n`;
  content += `Resultado Comercial: ${call.analysis.salesOutcome?.toUpperCase().replace(/_/g, ' ')}\n`;
  content += `Temple del Prospecto: ${call.analysis.customerMood?.toUpperCase()}\n`;
  content += `Calificación del PCE: ${call.analysis.utel ? call.analysis.utel.totalScore.toFixed(2) : (call.score.global / 10).toFixed(2)} / 10.0\n`;
  content += lineSeparator;
  content += "\n";
  content += "DIÁLOGO CRONOLÓGICO:\n\n";
  
  const formatTimeHelper = (timeInSeconds: number) => {
    if (timeInSeconds === undefined || timeInSeconds === null || isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!call.transcription || call.transcription.length === 0) {
    content += "[No hay transcripción disponible para esta llamada.]\n";
  } else {
    call.transcription.forEach((item) => {
      const sentimentLabel = item.sentiment === 'positive' 
        ? '😊 POSITIVO' 
        : item.sentiment === 'negative' 
        ? '🚨 OBJECIÓN/DIFICULTAD' 
        : '😐 NEUTRAL';
      
      const timeStr = `[${formatTimeHelper(item.start)} - ${formatTimeHelper(item.end)}]`;
      content += `${timeStr} ${item.speaker.toUpperCase()} (Tono: ${sentimentLabel} | Confianza: ${Math.round(item.confidence * 100)}%):\n`;
      content += `"${item.text}"\n`;
      content += "\n";
    });
  }
  
  content += lineSeparator;
  content += "Audición automatizada y Dirección de Calidad Educativa.\n";
  content += lineSeparator;

  // Generate and download Blob
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `transcripcion_${call.id}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadTranscriptionPDF = (call: SalesCall) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  const colWidth = 180; // 210 - 30
  const pageHeight = 297;
  let y = 15;

  // Header runner
  const drawPageHeader = (pageNumber: number) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('REPORTE DE TRANSCRIPCIÓN CRONOLÓGICA DE DIÁLOGOS', margin, 10);
    doc.text(`Página ${pageNumber}`, 190 - margin, 10);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(margin, 12, 210 - margin, 12);
  };

  let pageCount = 1;
  drawPageHeader(pageCount);

  // Check overflow with header drawer
  const checkOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      pageCount++;
      y = 15;
      drawPageHeader(pageCount);
    }
  };

  // Header banner description
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, colWidth, 20, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TRANSCRIPCIÓN COMPLETA DE AUDITORÍA', margin + 6, y + 8);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(186, 230, 253);
  doc.text('Diálogos organizados cronológicamente por locutor bajo un formato seguro de chat', margin + 6, y + 14);
  y += 24;

  // Metadata Card
  checkOverflow(28);
  doc.setDrawColor(215, 220, 225);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, colWidth, 24, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('FICHA GENERAL DE LA LLAMADA', margin + 5, y + 5);
  doc.line(margin, y + 7, margin + colWidth, y + 7);

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  // Col 1
  doc.setFont('Helvetica', 'bold');
  doc.text('Archivo:', margin + 5, y + 13);
  doc.setFont('Helvetica', 'normal');
  doc.text(sanitizeText(call.metadata.fileName), margin + 20, y + 13);

  doc.setFont('Helvetica', 'bold');
  doc.text('ID:', margin + 5, y + 19);
  doc.setFont('Helvetica', 'normal');
  doc.text(call.id, margin + 20, y + 19);

  // Col 2
  doc.setFont('Helvetica', 'bold');
  doc.text('Duración:', margin + 110, y + 13);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${Math.round(call.metadata.duration)} segundos`, margin + 128, y + 13);

  doc.setFont('Helvetica', 'bold');
  doc.text('Calificación:', margin + 110, y + 19);
  doc.setFont('Helvetica', 'normal');
  const finalScore = call.analysis.utel ? call.analysis.utel.totalScore : (call.score.global / 10);
  doc.text(`${finalScore.toFixed(2)} / 10.0`, margin + 128, y + 19);

  y += 28;

  const formatTimeHelper = (timeInSeconds: number) => {
    if (timeInSeconds === undefined || timeInSeconds === null || isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render dialogs
  if (!call.transcription || call.transcription.length === 0) {
    checkOverflow(10);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('[No hay transcripción disponible en esta llamada.]', margin, y);
    y += 10;
  } else {
    call.transcription.forEach((item) => {
      const isSeller = item.speaker.toLowerCase() === 'vendedor' || item.speaker.toLowerCase() === 'agent' || item.speaker.toLowerCase() === 'sales' || item.speaker.toLowerCase() === 'asesor';
      
      const sentimentLabel = item.sentiment === 'positive' 
        ? 'Tono: Positivo' 
        : item.sentiment === 'negative' 
        ? 'Tono: Objecion / Dificultad' 
        : 'Tono: Neutral';
      
      const timeStr = `[${formatTimeHelper(item.start)} - ${formatTimeHelper(item.end)}]`;
      const metaStr = `${item.speaker.toUpperCase()} • ${timeStr} • ${sentimentLabel}`;

      const maxTextWidth = 100; // text inside the bubble
      const wrappedLines = doc.splitTextToSize(sanitizeText(item.text), maxTextWidth);
      
      const textHeight = wrappedLines.length * 4.0;
      const bubbleHeight = textHeight + 8.5; // inner margins/paddings

      // Check overflow for the bubble
      checkOverflow(bubbleHeight + 3.5);

      let bx = margin;
      const bw = 115; // bubble width

      if (isSeller) {
        // Vendedor: aligned Left, Light Indigo/Blue
        bx = margin;
        doc.setFillColor(239, 246, 255); // blue-50
        doc.setDrawColor(191, 219, 254); // blue-200
      } else {
        // Cliente: aligned Right, Light Slate/Gray
        bx = margin + colWidth - bw;
        doc.setFillColor(243, 244, 246); // gray-100
        doc.setDrawColor(209, 213, 219); // gray-300
      }

      // Draw bubble background with rounded rectangle
      doc.setLineWidth(0.12);
      doc.roundedRect(bx, y, bw, bubbleHeight, 3, 3, 'FD');

      // Meta info header line inside bubble
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      if (isSeller) {
        doc.setTextColor(29, 78, 216); // blue-700
      } else {
        doc.setTextColor(75, 85, 99); // gray-600
      }
      doc.text(sanitizeText(metaStr), bx + 3.5, y + 4.0);

      // Dividing dot/dash line inside bubble
      doc.setLineWidth(0.05);
      doc.setDrawColor(isSeller ? 191 : 209, isSeller ? 219 : 213, isSeller ? 254 : 219);
      doc.line(bx + 3.5, y + 5.2, bx + bw - 3.5, y + 5.2);

      // Speech text lines inside bubble
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(30, 41, 59); // slate-800

      let textY = y + 8.5;
      wrappedLines.forEach((line: string) => {
        doc.text(line, bx + 3.5, textY);
        textY += 4.0;
      });

      y += bubbleHeight + 3.0; // Margin after bubble
    });
  }

  // Footer visual indicator
  checkOverflow(15);
  y += 5;
  doc.setLineWidth(0.1);
  doc.setDrawColor(210, 210, 210);
  doc.line(margin, y, margin + colWidth, y);

  y += 4;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Audición automatizada de calidad educativa.', margin, y);
  doc.text('Dirección y Supervisión de Servicios de Calidad Educativa. Año 2026.', margin, y + 3.0);

  // Download PDF
  const filename = `transcripcion_chat_${call.id}.pdf`;
  doc.save(filename);
};
