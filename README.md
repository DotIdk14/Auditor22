# Auditor de Calidad Telefónica — Demo Portfolio

Plataforma demo de auditoría de llamadas de ventas: transcribe, califica con una rúbrica de 22 parámetros (matriz PCE) y genera análisis emocional del cliente.

> **Versión portfolio:** todos los datos son **100% simulados** (universidad, asesores, clientes, costos y llamadas). No hay información real ni credenciales reales en este proyecto.

## Acceso demo

- Usuario: `demo`
- Contraseña: `demo1234`

## Por qué Google está desactivado

El inicio de sesión con Google y la integración con Google Drive están **desactivados a propósito** en esta versión para no exponer credenciales ni datos reales. La app muestra el aviso correspondiente en el login y en las secciones de Drive. El flujo completo (carga local de audio, llamadas de prueba, rúbrica, reportes PDF/CSV) funciona sin Google.

## Llamadas de prueba

Sin necesidad de subir audio: en **Cargar / Gestionar → Llamada de Prueba** (o `POST /api/cargar-demo`) se generan llamadas simuladas con transcripción, puntajes y análisis para explorar la plataforma.

## Desarrollo local

```bash
npm install
cp .env.example .env   # la contraseña demo ya viene configurada
npm run dev            # servidor en http://localhost:3000 (o PORT=3002 npm run dev)
```

Variables en `.env.example`: solo placeholders y la contraseña demo. Sin keys reales.
