// Generador de llamadas de demostración con datos 100% simulados (versión portfolio).
// Módulo sin dependencias externas para poder usarse tanto en el servidor local
// (server.ts) como en la función serverless de Vercel (api/index.ts).

export function generateHighFidelitySimulatedCall(originalName: string, fileSize: number, uniqueId: string) {
  const nameLower = originalName.toLowerCase();

  let program = "Licenciatura en Administración de Empresas";
  let modality: 'LÍNEA' | 'EJECUTIVA' | 'HÍBRIDA' = 'LÍNEA';
  let clientName = "Mariana Soto";
  let age = 24;
  let primaryEmotion = "Interesado";
  let initialDoubt = "sobre cursar en línea y la validez oficial del título";
  let keyDoubtClass = "los horarios nocturnos de la plataforma y el costo de la matrícula";
  let salesOutcome: 'venta_cerrada' | 'interesado_seguimiento' | 'no_interesado' | 'agenda_demostracion' = 'interesado_seguimiento';

  if (nameLower.includes("ejecut") || nameLower.includes("exec") || nameLower.includes("negoci") || nameLower.includes("mba")) {
    program = "Maestría en Dirección de Negocios (MBA)";
    modality = "EJECUTIVA";
    clientName = "Jorge Medina";
    age = 32;
    primaryEmotion = "Receptivo y profesional";
    initialDoubt = "sobre la modalidad ejecutiva semipresencial y el networking directivo";
    keyDoubtClass = "los horarios de asesorías en fin de semana y becas para empresas";
    salesOutcome = "agenda_demostracion";
  } else if (nameLower.includes("hibrid") || nameLower.includes("presenc") || nameLower.includes("ing") || nameLower.includes("sistem") || nameLower.includes("tech")) {
    program = "Ingeniería en Sistemas Computacionales";
    modality = "HÍBRIDA";
    clientName = "Lucía Ramos";
    age = 21;
    primaryEmotion = "Entusiasmado y asertivo";
    initialDoubt = "sobre combinar clases virtuales con laboratorios tecnológicos presenciales";
    keyDoubtClass = "el proceso de equivalencias/revalidación escolar y los cuatrimestres";
    salesOutcome = "venta_cerrada";
  }

  // Conversación de alta fidelidad alineada meticulosamente a la Rúbrica de Auditoría Universidad Demo (22 Parámetros)
  const transcription = [
    {
      speaker: "Vendedor" as const,
      start: 1.2,
      end: 6.8,
      text: `Hola, muy buenos días. Te habla Andrés del departamento de Admisiones de Universidad Demo. ¿Con quién tengo el gusto hoy?`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 7.5,
      end: 12.0,
      text: `Hola, buenos días Andrés. Habla ${clientName}. Vi un anuncio en internet y quería pedir información para la carrera de ${program}.`,
      sentiment: "neutral" as const,
      confidence: 0.98
    },
    {
      speaker: "Vendedor" as const,
      start: 12.8,
      end: 25.4,
      text: `¡Un excelente gusto saludarte, ${clientName}! Bienvenido a Universidad Demo. Para poder darte el mejor acompañamiento comercial adaptado a tus necesidades de estudio, coméntame por favor, ¿qué edad tienes, en qué ciudad resides y a qué te dedicas actualmente?`,
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
      text: `Perfecto, estás en el lugar idóneo. Te comento sobre Universidad Demo: somos la universidad digital número uno, con más de 12 años de trayectoria intachable, presencia activa de alumnos en más de 3 países y más de 100,500 egresados titulados con éxito en todo el continente.`,
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
      text: `La verdad sí, suena ideal. Oye Andrés, ¿y manejan equivalencia o revalidación? Cursé tres semestres de otra licenciatura inconclusa previamente.`,
      sentiment: "neutral" as const,
      confidence: 0.97
    },
    {
      speaker: "Vendedor" as const,
      start: 68.0,
      end: 78.5,
      text: `¡Qué gran noticia! Sí, en Universidad Demo contamos con un proceso sumamente ágil y simplificado de equivalencias para revalidar tus materias anteriores. Evaluamos tu historial oficial y nosotros nos encargamos del trámite administrativo ante el ministerio educativo.`,
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
      text: `Muchísimas gracias. Procedo al registro. Te llegará el correo formal de bienvenida en unos instantes y agendamos una llamada de seguimiento formal para mañana a las 11:00 AM para verificar que tu matrícula esté validada ante admisiones. ¡Un gran honor darte la bienvenida a Universidad Demo, ${clientName}!`,
      sentiment: "positive" as const,
      confidence: 0.99
    },
    {
      speaker: "Cliente" as const,
      start: 184.6,
      end: 188.0,
      text: `Al contrario, gracias a ti Andrés por tu asesoramiento. Hablamos mañana a las once. Lindo día.`,
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
    { id: "c5_pla", name: "Interacción dentro de plataformas Universidad Demo", weight: 1.20, checked: true },
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
      { id: "C5", title: "GESTIÓN Y REGISTRO", weight: 6.00, score: scoreC5, status: 'passed' as const, feedback: "Cumplimiento de procesos Universidad Demo.", subitems: subC5 }
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
      uploadedBy: "demo",
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
      summary: `La conversación de ${clientName} demuestra el perfecto acoplamiento al guion comercial de Universidad Demo de acuerdo con la Rúbrica de Auditoría PCE. El asesor Andrés se posicionó de manera sumamente consultiva y empática. Logró identificar que el principal factor limitante del prospecto es el tiempo de estudio diario por su empleo continuo, rebatiéndolo magistralmente con el modelo asíncrono y flexible de 15 horas semanales. Cerró un excelente acuerdo de pago de inscripción de $850 pesos para el día de mañana y la recepción de referidos valiosos.`,
      strengths: [
        "Presentación institucional intachable (12 años de trayectoria de Universidad Demo, presencia en 3 países).",
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
        aptitudeReason: `Excelente prospecto para estudiar en línea en Universidad Demo. Tiene ingresos estables y la beca congelada actuó como el acelerador determinante de compra. Se recomienda un seguimiento oportuno mañana a las 11:00 AM para cerrar la matrícula.`
      }
    },
    transcription: transcription
  };

  return finalCallData;
}
