# Proceso de Auditoría Completa de Llamadas - UTEL PCE

Este documento detalla la arquitectura, el flujo cognitivo y el modelo de evaluación matemática y emocional utilizado en la plataforma para realizar la **Auditoría PCE (Pauta de Calidad Educativa) de UTEL Universidad**.

---

## 1. Arquitectura y Flujo de Procesamiento

El ciclo de vida de una auditoría, desde la obtención del archivo de audio hasta la generación de análisis profundos de calidad y neuroventas, sigue cuatro etapas consecutivas:

```
[Audio Source] ──> [Ingestion & AssemblyAI / Gemini Multimodal] ──> [Audit Engine (Gemini 3.5 Flash)] ──> [Scoring & Cache Sync]
  (Upload / Drive)     (Sub-item validation / Guardrails)               (Neurosales & PCE Rubric)         (IndexedDB / CRM Save)
```

1. **Ingestión Multicanal**:
   * **Carga Directa**: Carga manual de archivos de audio locales en formatos estándar (`.mp3`, `.wav`, `.m4a`, `.webm`).
   * **Integración con Google Drive**: Soporta de forma nativa cuentas institucionales y personales, permitiendo explorar carpetas, listado recurrente y **Unidades Compartidas** organizacionales de forma recursiva.
2. **Procesamiento de Audio**:
   * Si la clave de **AssemblyAI** está disponible, se utiliza para una diarización de alta precisión (separación de oradores).
   * Si no, se utiliza el motor multimodal directo de **Google Gemini 3.5 Flash** enviando el buffer del audio codificado en Base64.
3. **Análisis Cognitivo y Evaluación de Rúbrica**:
   * El servicio de IA analiza la llamada utilizando un prompt de grado de producción estructurado para actuar como un **Auditor Senior de Calidad de UTEL Universidad** y un experto en **Neuroventas**.
4. **Cálculo de Puntajes e Indexación**:
   * Se aplican pesos numéricos exactos de acuerdo con la matriz de evaluación de UTEL. Los resultados se guardan localmente en **IndexedDB** para garantizar la persistencia sin conexión, y se respaldan automáticamente como archivos `.json` en la carpeta `Auditorías PCE UTEL` del Google Drive conectado.

---

## 2. Rúbrica de Auditoría PCE UTEL (22 Parámetros)

El núcleo matemático evalúa **22 subítems oficiales**, agrupados en 5 categorías fundamentales con pesos ponderados de la siguiente manera:

### C1. CONOCE A TU CLIENTE (Ponderación: 1.00 Punto)
Evalúa la empatía inicial y la recopilación de datos clave del prospecto para personalizar el pitch formativo.
* **c1_linea (0.20 pts)**: Identificación del interés del cliente en la modalidad en línea.
* **c1_programa (0.20 pts)**: Definición y reconfirmación del programa académico exacto solicitado (Licenciatura, Maestría, Doctorado, etc.).
* **c1_demo (0.20 pts)**: Captura de datos demográficos indispensables (edad, ubicación geográfica, medio de contacto preferido).
* **c1_ocup (0.20 pts)**: Análisis de la ocupación actual del prospecto (si trabaja, horarios laborales libres) y antecedentes académicos.
* **c1_equiv (0.20 pts)**: Indagación de equivalencias, revalidaciones de materias o estudios previos truncos.

### C2. GENERALIDADES (Ponderación: 1.00 Punto)
Mide la capacidad del asesor para posicionar la marca institucional y el valor estratégico de UTEL.
* **c2_num (0.34 pts)**: Exposición de la numeralia de prestigio institucional (más de 12 años de trayectoria, presencia internacional en más de 3 países, miles de egresados).
* **c2_mod (0.33 pts)**: Explicación didáctica y persuasiva del modelo educativo flexible de aprendizaje.
* **c2_esp (0.33 pts)**: Vinculación del formato formativo con las necesidades del cliente (cómo se adapta a su agenda diaria).

### C3. OFERTA ACADÉMICA (Ponderación: 1.00 Punto)
Revisa la claridad con la que se comunican las implicaciones financieras y operativas del ingreso.
* **c3_costos (0.20 pts)**: Presentación formal, clara y estructurada de los costos y opciones de colegiatura.
* **c3_comp (0.20 pts)**: Desglose de costos complementarios obligatorios (inscripción, re-inscripción cuatrimestral/semestral).
* **c3_jor (0.20 pts)**: Definición concertada de la jornada o carga de estudio esperada.
* **c3_beca (0.20 pts)**: Exposición inequívoca de la vigencia, condiciones y porcentaje de la beca asignada.
* **c3_ciclos (0.20 pts)**: Notificación de la próxima fecha exacta de inicio de clases (los ciclos de inducción de lunes).

### C4. ACUERDOS Y CIERRE (Ponderación: 1.00 Punto)
Determina la asertividad final para concretar la venta o establecer la agenda de seguimiento.
* **c4_res (0.25 pts)**: Entrega de un resumen detallado del compromiso de la oferta antes de formalizar.
* **c4_doc (0.25 pts)**: Solicitud de documentos probatorios y explicación de la carga digital de los mismos.
* **c4_pag (0.25 pts)**: Cierre con acuerdo de pago firme o fecha de compromiso inmediato.
* **c4_ref (0.25 pts)**: Solicitud proactiva de datos de referidos (amigos, familiares o colegas que puedan estar interesados).

### C5. GESTIÓN Y REGISTRO (Ponderación: 6.00 Puntos)
La categoría con mayor relevancia cuantitativa, centrada en el protocolo operativo institucional del CRM.
* **c5_int (1.20 pts)**: Garantía de interactuar de forma directa e inequívoca con el tomador de decisiones o interesado directo en estudiar.
* **c5_tip (1.20 pts)**: Direccionamiento hacia una tipificación positiva para acelerar el embudo comercial (CRM setup).
* **c5_pla (1.20 pts)**: Alineación operativa a los valores, protocolos de etiqueta e identidad de las plataformas oficiales UTEL.
* **c5_reg (1.20 pts)**: Evidencia del registro, anotaciones o actualización de datos en tiempo real de la llamada.
* **c5_seg (1.20 pts)**: Calendarización de pasos subsecuentes claros y confirmación de la fecha/hora del próximo contacto acordado.

---

## 3. Motor de Inteligencia Emocional y Neuroventas

Adicionalmente a la rúbrica oficial, el motor de inteligencia de **Gemini** realiza una inferencia psicológica multivariable de la interacción conversacional:

1. **Gráfico de Sentimiento Temporal**:
   * Cada frase de la transcripción es etiquetada con un estado emocional (`positive`, `neutral`, `negative`).
   * Esto permite reconstruir el **Emotional Journey** o curva de conversión de la llamada para verificar si el vendedor logró rebatir objeciones y transformar la frustración o indiferencia del cliente en motivación.
2. **Aptitud de Compra (Purchase Aptitude)**:
   * **Puntaje Emocional (0 - 100)**: Clasificado cualitativamente en *Muy Alto*, *Alto*, *Medio* o *Bajo*, basado en la asertividad de las respuestas del prospecto.
   * **Señales de Compra (Buying Signals)**: Expresiones verbales y preguntas específicas del cliente donde muestra interés en pagos, revalidaciones, o inicio (ej. *"¿puedo pagar con tarjeta?", "¿cuándo inicia la inducción?"*).
   * **Barreras Identificadas (Barriers)**: Bloqueos identificados (tiempos ajustados para estudiar, falta de documentos para revalidar, limitaciones financieras inmediatas).

---

## 4. Ingeniería de Robustez y Guardrails de Transcripción

Para mitigar los errores clásicos de los LLM multimediales al procesar audios continuos (alucinaciones de cambio de orador o discursos mezclados), el motor incorpora **Guardrails Algorítmicos**:

* **Pre-diarización y División Secuencial con Heurística**: Si se detecta un bloque gigantesco con un volumen de texto denso asignado a un solo orador, un servicio secundario reitera la transcripción para fragmentarla secuencialmente cada 10-15 palabras garantizando la correcta lectura de la línea de tiempo.
* **Sanidad Anti-Reversión**: Compara automáticamente los roles para asegurar que el usuario que ofrece la beca institucional siempre sea tipificado como el **Vendedor** y quien realiza las objeciones y consultas de colegiatura sea el **Cliente**.
* **Persistencia Integrada Offline-First**: El estado completo evaluado se guarda en una estructura de almacenamiento local robusta (haciendo uso de **IndexedDB** a nivel binario para guardar la información junto al archivo de audio en caché) de modo que el usuario puede realizar consultas instantáneas sin consumir ancho de banda repetitivamente.

---

Este proceso garantiza auditorías precisas, inmediatas y transparentes, alineando los estándares educativos rigurosos de UTEL con inteligencia de vanguardia.
