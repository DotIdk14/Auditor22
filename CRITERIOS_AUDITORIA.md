# Manual de Auditoría PCE UTEL para Modelos de Lenguaje (Optimizado para DeepSeek)

Este documento ha sido diseñado específicamente para estructurar e inyectar el contexto de auditorías de calidad de **UTEL Universidad** en modelos avanzados de lenguaje (como **DeepSeek-V3** o **DeepSeek-R1**). Mediante este manual, DeepSeek puede procesar llamadas telefónicas o transcripciones de audio y aplicar la **Pauta de Calidad Educativa (PCE)** de forma 100% equivalente a un auditor humano senior.

---

## 1. System Prompt de Rol para DeepSeek

```markdown
Eres el agente inteligente "Auditor Senior UTEL", programado para evaluar de forma estricta y transparente la interacción verbal entre un asesor comercial y un prospecto de UTEL Universidad. Tu tarea consiste en procesar la transcripción y/o archivos de audio de llamadas, identificar los roles de los participantes y aplicar rigurosamente la Pauta de Calidad Educativa (PCE) con el fin de generar análisis psicológicos de neuroventas y puntajes comerciales exactos.
```

---

## 2. Árbol de Razonamiento para Modelos CoT (p.ej. DeepSeek-R1)

Si utilizas modelos basados en razonamiento inductivo profundo como **DeepSeek-R1**, instruye al modelo para que deconstruya la llamada en su espacio `<thought>` (pensamiento interno) antes de rellenar la rúbrica, siguiendo esta secuencia lógica:

1. **Fase de Identificación de Agente y Roles**:
   * ¿Quién introdujo el saludo institucional o el nombre de UTEL? $\rightarrow$ Definir como **Vendedor**.
   * ¿Quién responde sobre sus motivos personales, inquietudes financieras o antecedentes? $\rightarrow$ Definir como **Cliente**.
   * *Regla de Sanidad*: Verificar si el primer participante "orador 1" es el cliente expresando timidez o brevedad habitual (ej: *"¿Sí? Bueno, buenas tardes"*). No tipificarlo como vendedor por hablar de primero.
2. **Fase de Segmentación del Diálogo**:
   * Dividir sistemáticamente los diálogos continuos. Si un bloque de un orador supera las 15 palabras, cortarlo en partes secuenciales representadas temporalmente para conservar una alta fidelidad en el flujo conversacional.
3. **Fase de Verificación Binaria Estricta de la Rúbrica (22 Subítems)**:
   * Para cada uno de los 22 subítems, buscar evidencia discursiva explícita (semántica u ontológica). No asumas que porque se habló de dinero ya se cumplieron todos los subítems de costos alternativos.
4. **Fase de Inferencia Psicoemocional**:
   * Analizar el cambio de actitud del prospecto a lo largo de la llamada: ¿Inició indiferente y cerró interesado gracias al rebatimiento de objeciones del vendedor? Calificar el Purchase Aptitude Score (0-100) en base a esto.

---

## 3. Guía de Evaluación Campo por Campo (22 Subítems Detallados)

A continuación, se describen los criterios analíticos que el motor de IA debe tomar en cuenta para marcar cada parámetro de la rúbrica como **Verdadero (`true`)** o **Falso (`false`)**:

### CATEGORÍA C1: CONOCE A TU CLIENTE (Ponderación total: 1.00 Punto / 0.20 pts por subítem)

#### 1. Interés en opción en línea o abordaje del formato virtual (`c1_linea`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: El asesor menciona que la modalidad es virtual, flexible, a distancia o a través de la red, o bien el cliente expresa que busca estudiar sin asistir físicamente.
* **Falso Positivo Común a Evitar**: Si el asesor solo dice *"bienvenido a UTEL"* pero nunca califica o describe el concepto de cursar materias a distancia o en línea, califica como `false`.
* **Disparadores clave**: *"modalidad en línea"*, *"virtual"*, *"estudio a distancia"*, *"mediante plataforma digital"*.

#### 2. Determinación del programa de interés específico (`c1_programa`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: Se define específicamente el título o grado que desea cursar el prospecto. No basta un área general; debe identificarse la carrera exacta (ej: Licenciatura en Derecho, Maestría en Dirección de Proyectos).
* **Falso Positivo Común a Evitar**: Si el prospecto dice *"quiero estudiar algo de computadoras"* y el asesor no concreta el título (ej: *"comprendo, luego vemos cuál"*), califica como `false`. Debe cerrarse en una oferta específica.
* **Disparadores clave**: *"Ingeniería en..."*, *"Licenciatura en..."*, *"Maestría en..."*, *"Doctorado corporativo"*.

#### 3. Registro de datos demográficos clave (`c1_demo`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: El asesor pregunta u obtiene datos puntuales como el lugar de residencia (ciudad, estado, país) o la edad del solicitante.
* **Falso Positivo Común a Evitar**: Si solo se pregunta el nombre, no computa. Requiere capturar la edad o la localización para perfilar la viabilidad operativa y la zona horaria del estudiante.
* **Disparadores clave**: *"¿En qué estado vives?"*, *"¿Qué edad tienes?"*, *"¿Desde dónde nos marcas?"*.

#### 4. Indagación de ocupación y estudios previos (`c1_ocup`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: Se pregunta a qué se dedica laboralmente el prospecto (si tiene un empleo formal, es emprendedor, etc.) o se valida cuál es su último grado académico aprobado (preparatoria terminada, bachillerato en trámite, etc.).
* **Falso Positivo Común a Evitar**: Que el asesor suponga que cuenta con estudios de bachillerato sin haberlo verificado de forma verbal en la grabación.
* **Disparadores clave**: *"¿Actualmente trabajas?"*, *"¿Cuál es tu último nivel de estudios cursado?"*, *"¿Tienes el certificado de bachillerato?"*.

#### 5. Pregunta sobre equivalencias de materias o revalidación (`c1_equiv`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: El asesor indaga si el alumno dejó alguna carrera sin concluir y si tiene interés en transferir créditos o revalidar asignaturas cursadas previamente.
* **Falso Positivo Común a Evitar**: Omitir la pregunta bajo la suposición de que el cliente es muy joven o que nunca ingresó a la universidad. El proceso exige realizar el descarte de manera activa.
* **Disparadores clave**: *"¿Tienes estudios universitarios previos?"*, *"¿Te gustaría revalidar materias?"*, *"¿Dejaste alguna carrera trunca?"*.

---

### CATEGORÍA C2: GENERALIDADES (Ponderación total: 1.00 Punto)

#### 6. Exposición de la numeralia institucional de UTEL (`c2_num`)
* **Puntuación**: 0.34 pts.
* **Criterio de Aprobación (`true`)**: Mención explícita del respaldo y tamaño de la institución utilizando cifras verificables de la marca (ej: **más de 12 años**, **presencia en más de 30 países**, más de **100 mil egresados** o alumnos).
* **Falso Positivo Común a Evitar**: Decir simplemente *"somos una universidad muy grande"* no es equivalente a numeralia formal. Se requieren datos estadísticos de credibilidad.
* **Disparadores clave**: *"más de 12 años de trayectoria"*, *"respaldados internacionalmente"*, *"presencia en varios países"*, *"miles de alumnos"*.

#### 7. Detalle y explicación del modelo educativo flexible (`c2_mod`)
* **Puntuación**: 0.33 pts.
* **Criterio de Aprobación (`true`)**: Explicar los pilares del modelo pedagógico: el funcionamiento del aula digital abierta los 7 días de la semana, el aula inteligente y el rol del Tutor o el Coach de acompañamiento.
* **Falso Positivo Común a Evitar**: Si el asesor confunde modelo flexible con *"no entras a clases y apruebas solo"*. Debe explicarse como un modelo metodológico ordenado de actividades semanales.
* **Disparadores clave**: *"plataforma disponible 24/7"*, *"evaluación por actividades o exámenes"*, *"acompañamiento tutorial continuo"*.

#### 8. Vinculación del modelo educativo con las necesidades del prospecto (`c2_esp`)
* **Puntuación**: 0.33 pts.
* **Criterio de Aprobación (`true`)**: Conectar de forma proactiva la flexibilidad del modelo educativo de UTEL con los retos de tiempo, distancia u ocupación expresados por el cliente en la sección c1.
* **Falso Positivo Común a Evitar**: Mantener un discurso de ventas memorizado sin retomar lo que el cliente le acaba de compartir (ej: si el prospecto dijo que trabaja de noche y el asesor le sugiere estudiar solo de noche, demostrando empatía y escucha activa).
* **Disparadores clave**: *"Como me comentabas que tu horario de trabajo es..."*, *"Justo para ti que viajas constantemente..."*, *"Esto te dará la libertad de estudiar sin descuidar a tu familia..."*.

---

### CATEGORÍA C3: OFERTA ACADÉMICA (Ponderación total: 1.00 Punto / 0.20 pts por subítem)

#### 9. Presentación formal de costos y mensualidad de colegiatura (`c3_costos`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: Declaración transparente del valor financiero ordinario que demanda la carrera.
* **Falso Positivo Común a Evitar**: Indicar un precio modificado con descuento sin antes haber establecido la base de costos regular de la universidad.
* **Disparadores clave**: *"El costo regular mensual es de..."*, *"La colegiatura mensual normal asciende a..."*.

#### 10. Explicación de costos complementarios (`c3_comp`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: Informar de cobros adicionales obligatorios u opcionales tales como la cuota de inscripción inicial, reinscripciones periódicas por ciclo escolar, exámenes o derechos de titulación.
* **Falso Positivo Común a Evitar**: Ocultar u omitir los montos de reinserción cuatrimestral o inscripción para hacer parecer la oferta más económica en la llamada inicial.
* **Disparadores clave**: *"cuota única de inscripción"*, *"monto por reinscripción"*, *"costo administrativo cuatrimestral"*.

#### 11. Definición razonable de la jornada de estudio (`c3_jor`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: Explicar de manera clara y realista la carga horaria comprometida que el estudiante deberá dedicar a la plataforma para aprobar con éxito las materias (ej: entre **2 a 3 horas diarias** o **15 horas semanales**).
* **Falso Positivo Común a Evitar**: Decirle al cliente que con tan solo un par de minutos a la semana podrá culminar una carrera universitaria con éxito.
* **Disparadores clave**: *"Te recomendamos destinar un promedio de dos horas al día"*, *"La jornada de estudio óptima es de..."*.

#### 12. Exposición del porcentaje de beca, su vigencia y retención (`c3_beca`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: El asesor ofrece un beneficio en porcentaje de beca, y aclara explícitamente cuánto tiempo dura la beca y bajo qué condiciones de promedio académico o puntualidad de pago se mantiene.
* **Falso Positivo Común a Evitar**: Omitir las condiciones para revalidar o mantener la beca cuatrimestre a cuatrimestre (ej. *"tienes beca eterna y listo"*).
* **Disparadores clave**: *"beca del 40% aplicable para..."*, *"manteniendo un promedio mínimo de 8.5"*, *"para asegurar este descuento durante toda tu carrera..."*.

#### 13. Mención de ciclos y fecha de inicio de clases (`c3_ciclos`)
* **Puntuación**: 0.20 pts.
* **Criterio de Aprobación (`true`)**: Establecer de manera formal la fecha exacta fijada para el arranque de clases del cuatrimestre o del inicio de cursos de inducción.
* **Falso Positivo Común a Evitar**: Respuestas vagas como *"un inicio de clases en los próximos días"* o *"en unas cuantas semanas"*. Deben indicarse fechas puntuales para generar sensación de urgencia y dirección.
* **Disparadores clave**: *"Nuestras clases comienzan formalmente el lunes..."*, *"La fecha límite de ingreso para este ciclo es..."*.

---

### CATEGORÍA C4: ACUERDOS Y CIERRE (Ponderación total: 1.00 Punto / 0.25 pts por subítem)

#### 14. Realización de un resumen o recapitulación comercial (`c4_res`)
* **Puntuación**: 0.25 pts.
* **Criterio de Aprobación (`true`)**: El asesor agrupa y recita los acuerdos clave antes de ir a la solicitud del pago de matrícula: nombre del programa formativo seleccionado, colegiatura neta a pagar y porcentaje de beca. Esto valida la comprensión bilateral.
* **Falso Positivo Común a Evitar**: Pasar directamente al cierre financiero sin comprobar si el cliente entendió claramente las condiciones finales explicadas.
* **Disparadores clave**: *"Para recapitular las condiciones que acordamos..."*, *"En resumen, tu inscripción quedaría de la siguiente manera..."*.

#### 15. Solicitud u orientación del envío de documentos de admisión (`c4_doc`)
* **Puntuación**: 0.25 pts.
* **Criterio de Aprobación (`true`)**: El asesor detalla cuáles son los documentos requeridos (ej. Acta de nacimiento original, identificación oficial, CURP, certificado escolar anterior) y cómo enviarlos a las plataformas digitales de UTEL.
* **Disparadores clave**: *"Necesitaremos recolectar tus documentos digitales"*, *"Enviar tu CURP e INE por foto o correo electrónico para conformar tu expediente escolar"*.

#### 16. Establecimiento de compromisos firmes de pago de inscripción (`c4_pag`)
* **Puntuación**: 0.25 pts.
* **Criterio de Aprobación (`true`)**: El asesor fija una fecha y hora límite para que el prospecto realice el depósito de inscripción o use los portales de pago en línea de UTEL Universidad.
* **Falso Positivo Común a Evitar**: Finalizar la conversación aceptando una promesa vaga como *"pago cuando tenga dinero"* o *"luego les aviso cuando haga la transacción"*.
* **Disparadores clave**: *"¿Podemos agendar el compromiso de pago para este sábado en la mañana?"*, *"¿A qué hora podría corroborar con mi sistema la acreditación de tu pago de matrícula?"*.

#### 17. Solicitud proactiva de contactos referidos (`c4_ref`)
* **Puntuación**: 0.25 pts.
* **Criterio de Aprobación (`true`)**: El asesor le pide al prospecto de forma proactiva contactos de recomendados, amigos, colegas de trabajo o conocidos que también busquen iniciar estudios universitarios en línea.
* **Falso Positivo Común a Evitar**: Esperar a que el prospecto se inscriba por completo para pedirle referidos. Es un protocolo obligatorio que debe ejecutarse directamente en la primera llamada selectiva.
* **Disparadores clave**: *"¿Tienes algún amigo, colega de oficina o familiar a quien le interese estudiar con los mismos beneficios que hoy te otorgamos?"*, *"¿Podrías compartirme de dos a tres referidos para..."*.

---

### CATEGORÍA C5: GESTIÓN Y REGISTRO (Ponderación total: 6.00 Puntos / 1.20 pts por subítem)

#### 18. Comunicación directa con el interesado real (`c5_int`)
* **Puntuación**: 1.20 pts.
* **Criterio de Aprobación (`true`)**: Si el asesor está entablando el diálogo de manera directa con quien estudiará la carrera, o con el responsable financiero final del prospecto si es menor de edad o depende de su familia.
* **Disparadores clave**: Conversación bidireccional estable centrada en el cumplimiento de necesidades del prospecto real.

#### 19. Inferencia de tipificación y estatus del cliente para CRM (`c5_tip`)
* **Puntuación**: 1.20 pts.
* **Criterio de Aprobación (`true`)**: El tono, desarrollo y acuerdos del prospecto permiten al asesor asignarle de inmediato un estatus comercial calificado claro (ej: *Llamada interesada*, *Compromiso establecido*, *Enviando documentos*, *Inscrito en proceso*).
* **Disparadores clave**: Consistencia comercial a lo largo de toda la interacción conversacional documentada.

#### 20. Protocolo de etiqueta e identidad de marcas y plataformas oficiales UTEL (`c5_pla`)
* **Puntuación**: 1.20 pts.
* **Criterio de Aprobación (`true`)**: El asesor se conduce en todo momento con profesionalismo, utiliza los saludos, de forma respetuosa del interlocutor, haciendo alusión al entorno oficial y portal académico de la facultad de UTEL.
* **Disparadores clave**: No presentar malas prácticas, no omitir los saludos obligatorios institucionales, no cometer desvíos éticos comerciales.

#### 21. Registro de interacciones en tiempo real en expediente corporativo (`c5_reg`)
* **Puntuación**: 1.20 pts.
* **Criterio de Aprobación (`true`)**: Se manifiesta de forma verbal de que el asesor toma apuntes sistemáticos en el CRM de los comentarios y problemas particulares que el alumno le describe, para que cualquier auditor que entre al CRM pueda validar su historial emocional.
* **Disparadores clave**: *"Permíteme un segundo para apuntar esto en tu sistema..."*, *"Estoy ingresando a tu ficha técnica para añadir que pretendes revalidar materias de tu escuela anterior..."*.

#### 22. Definición estructurada de fecha y hora exacta de seguimiento (`c5_seg`)
* **Puntuación**: 1.20 pts.
* **Criterio de Aprobación (`true`)**: Establecer de manera formal el día de la semana y la hora específica de la próxima llamada pactada para dar continuidad o cerrar la inscripción.
* **Falso Positivo Común a Evitar**: Definir días abstractos o informales sin un acuerdo bilateral cerrado de asistencia (ej: *"luego te marco ahí a mitad de semana a ver cómo vas"*).
* **Disparadores clave**: *"Te llamaré entonces el martes a las once de la mañana para corroborar tu proceso"*, *"Pactamos el próximo contacto entonces para el día..."*.

---

## 4. Estructura de Salida JSON Estricta para DeepSeek

Para integrarse de manera fluida con el backend, DeepSeek **debe** responder exclusivamente en formato JSON crudo, utilizando las claves técnicas exactas que se listan a continuación:

```json
{
  "summary": "Resumen ejecutivo de la interacción en tercera persona (máximo 120 palabras).",
  "customerMood": "receptivo | molesto | neutral | interesado | indiferente",
  "salesOutcome": "venta_cerrada | interesado_seguimiento | no_interesado | agenda_demostracion",
  "strengths": [
    "Descripción de las principales habilidades de escucha o persuasión demostradas por el vendedor durante la llamada."
  ],
  "weaknesses": [
    "Áreas críticas omitidas de la rúbrica o debilidades comunicativas encontradas."
  ],
  "nextSteps": [
    "Pasos del CRM sugeridos para dar el correcto seguimiento al estudiante."
  ],
  "evaluatedSubitems": {
    "c1_linea": true,
    "c1_programa": true,
    "c1_demo": false,
    "c1_ocup": true,
    "c1_equiv": false,
    "c2_num": true,
    "c2_mod": true,
    "c2_esp": true,
    "c3_costos": true,
    "c3_comp": false,
    "c3_jor": false,
    "c3_beca": true,
    "c3_ciclos": true,
    "c4_res": true,
    "c4_doc": false,
    "c4_pag": false,
    "c4_ref": false,
    "c5_int": true,
    "c5_tip": true,
    "c5_pla": true,
    "c5_reg": false,
    "c5_seg": true
  },
  "feedbackMap": {
    "CONOCE A TU CLIENTE": "Comentario estructurado sobre la calidad de la exploración del cliente en C1.",
    "GENERALIDADES": "Comentario estructurado sobre el posicionamiento institucional en C2.",
    "OFERTA ACADÉMICA": "Comentario estructurado sobre la transparencia en costos en C3.",
    "ACUERDOS Y CIERRE": "Comentario estructurado sobre el cierre comercial en C4.",
    "GESTIÓN Y REGISTRO": "Comentario estructurado sobre la ejecución del protocolo en C5."
  },
  "emotionalAnalysis": {
    "primaryEmotion": "Emoción dominante capturada en el prospecto a lo largo de la llamada.",
    "emotionalJourney": "Evolución secuencial de los estados de ánimo observados en el diálogo.",
    "purchaseAptitudeScore": 75,
    "purchaseAptitudeLabel": "Muy Alto | Alto | Medio | Bajo",
    "barriersToPurchase": [
      "Limitantes u objeciones clave externadas por el prospecto durante la llamada."
    ],
    "buyingSignals": [
      "Frases y preguntas clave de alto enganche detectadas en el cliente."
    ],
    "aptitudeReason": "Justificación de cómo se determinó la aptitud de compra."
  },
  "transcription": [
    {
      "speaker": "Vendedor",
      "text": "Hola, muy buenas tardes. Te habla el asesor comercial de UTEL.",
      "sentiment": "positive",
      "start": 0.0,
      "end": 3.5
    },
    {
      "speaker": "Cliente",
      "text": "Hola, buenas tardes. Sí, ando buscando informes de una licenciatura.",
      "sentiment": "neutral",
      "start": 3.6,
      "end": 6.8
    }
  ],
  "duration": 180
}
```
