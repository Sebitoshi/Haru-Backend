# 📸 Verification — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/verification/`

---

## ✅ LO QUE SE IMPLEMENTÓ

### Sistema de Verificación con Groq Vision AI

El usuario sube evidencia. **Groq Vision** (`qwen/qwen3.6-27b`) analiza la imagen en tiempo real. Gratis, sin tarjeta.

### 🤖 IA Real: Groq Vision

| Feature | Detalle |
|---------|---------|
| **Modelo** | `qwen/qwen3.6-27b` (27B params, multimodal) |
| **Costo** | ✅ GRATIS (tier gratuito: 30 RPM) |
| **Velocidad** | ~500 tokens/segundo ⚡ |
| **Imágenes** | URL de Cloudinary o base64 |
| **Texto** | Análisis de coherencia y relevancia |
| **Fallback** | Mock inteligente si Groq no está disponible |

### Cómo funciona el análisis

```
Foto subida → Cloudinary URL
       ↓
Groq Vision (qwen/qwen3.6-27b)
       ↓
Prompt especializado:
  "¿Existe el objeto de la misión?"
  "¿Es auténtica? (no screenshot)"
  "¿Coincide con la misión?"
       ↓
Respuesta JSON:
  { confidence: 87, isAuthentic: true, tags: ["flower", "yellow"], ... }
       ↓
≥80% → ✅ verified
50-79% → ⚠️ needs_review
<50% → 🔴 rejected
```

### Setup

1. Crear cuenta gratis en [console.groq.com](https://console.groq.com)
2. Obtener API key (empieza con `gsk_`)
3. Agregar a `.env`:
```
GROQ_API_KEY=gsk_tu_key_aquí
```
4. ¡Listo! El análisis de fotos es gratuito.

### Tipos de evidencia

| Tipo | Análisis IA | Costo |
|------|------------|-------|
| 📸 Foto | Groq Vision real | Gratis |
| 🎥 Video | Groq Vision (primer frame) | Gratis |
| 🎤 Audio | Mock (futuro: Whisper) | Gratis |
| 📝 Texto | Groq chat completion | Gratis |
| 📍 Ubicación | Auto-verificado (GPS) | Gratis |

### Endpoints (6)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /api/verification/submit/:questId` | 🔒 | Subir foto/video/audio |
| `POST /api/verification/submit-text/:questId` | 🔒 | Subir texto |
| `POST /api/verification/submit-location/:questId` | 🔒 | Subir ubicación GPS |
| `GET /api/verification/status/:questId` | 🔒 | Estado + intentos restantes |
| `GET /api/verification/me` | 🔒 | Historial de verificaciones |
| `PATCH /api/verification/review/:id` | 🔒 | Admin: revisión manual |

### Anti-fraud

- Duplicados: misma imagen en otra misión → rechazada
- Límite: máx 3 intentos por misión
- Screenshots detectados por IA
- Validación MIME + tamaño (10MB max)

---

## 📊 MODELO DE DATOS

```text
QuestVerification
├── id, userId, questId, userQuestId
├── evidenceType, evidenceUrl, evidenceText, location
├── status (pending | analyzing | verified | rejected | needs_review)
├── aiAnalysis (JSON: confidence, tags, notes, isAuthentic, matchesQuest, flags)
├── attemptNumber (1-3), rejectionReason
├── reviewerId, reviewNote, submittedAt, reviewedAt
```

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Verificación completa: 5 tipos, anti-fraud, 6 endpoints | Buffy |
| 2026-08-26 | Groq Vision AI real (qwen/qwen3.6-27b, gratis) | Buffy |
| 2026-09-03 | Fix arranque: import de TrustModule con `forwardRef` (dependencia circular con AdminModule) | Buffy |
