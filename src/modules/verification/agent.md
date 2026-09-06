# 📸 Verification — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/verification/`

---

## 📌 PROPÓSITO

Sistema de verificación de evidencia de **Haru**. El usuario sube evidencia → IA analiza → decide si es válida.

---

## 🏗️ ARQUITECTURA

```
verification/
├── verification.service.ts      # Submit, analyze, status, manual review, anti-fraud
├── verification.controller.ts   # 8 endpoints (submit, status, history, batch, stream, review)
├── verification.module.ts       # Module (CloudinaryModule, TrustModule via forwardRef, DiaryModule)
└── agent.md
```

### Dependencias
- `common/cloudinary/` — Subir archivos de evidencia
- `common/groq/` — GroqVisionService (análisis de fotos, texto, audio)
- `common/geofence/` — GeofenceService (validación GPS)
- `trust/` — TrustService (eventos de confianza, fraud alerts)
- `diary/` — DiaryService (auto-crear entrada de diario tras verificación exitosa)

---

## 🤖 IA: Groq Vision + Whisper

| Tipo | Servicio | Modelo | Costo |
|------|----------|--------|-------|
| 📸 Foto | GroqVision.analyzeImage() | qwen/qwen3.6-27b | Gratis |
| 🎥 Video | GroqVision.analyzeImage() (primer frame) | qwen/qwen3.6-27b | Gratis |
| 🎤 Audio | GroqVision.analyzeAudio() | whisper | Gratis |
| 📝 Texto | GroqVision.analyzeText() | llama-3.3-70b | Gratis |
| 📍 Ubicación | Geofence.validateLocationForQuest() | GPS + POIs | Gratis |

### Análisis de imagen
```
Foto → Cloudinary URL → Groq Vision (qwen3.6-27b)
       ↓
Prompt: "¿Existe el objeto? ¿Es auténtica? ¿Coincide con la misión?"
       ↓
Respuesta: { confidence: 87, isAuthentic: true, tags, matchesQuest, flags }
       ↓
≥80% + isAuthentic + matchesQuest → ✅ verified
50-79% → ⚠️ needs_review
<50% → 🔴 rejected
```

### Validación de audio
- Mínimo 5 segundos (estimación por bitrate)
- Usa Whisper de Groq para transcribir + analizar

### Validación de ubicación
- Usa GeofenceService con POIs cercanos
- Fallback: confía en GPS si geofence no disponible (70% confidence)

---

## 📊 MODELO DE DATOS

```text
QuestVerification
├── id, userId, questId, userQuestId
├── evidenceType (photo|video|audio|text|location)
├── evidenceUrl (Cloudinary), evidenceText, location (JSON: {lat,lng,name?})
├── status (pending | analyzing | verified | rejected | needs_review)
├── aiAnalysis (JSON: confidence, tags, notes, isAuthentic, matchesQuest, flags)
├── attemptNumber (1-3), rejectionReason
├── reviewerId, reviewNote, submittedAt, reviewedAt
```

---

## ✅ ENDPOINTS (8)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /api/verification/submit/:questId` | 🔒 | Subir foto/video/audio (multipart + text/lat/lng) |
| `POST /api/verification/submit-text/:questId` | 🔒 | Subir texto como evidencia |
| `POST /api/verification/submit-location/:questId` | 🔒 | Subir GPS como evidencia |
| `GET /api/verification/status/:questId` | 🔒 | Estado + intentos restantes |
| `GET /api/verification/me` | 🔒 | Historial de verificaciones (?status=verified) |
| `POST /api/verification/batch` | 🔒 | Batch analyze (max 10 items en paralelo) |
| `POST /api/verification/batch-stream` | 🔒 | Streaming batch SSE (max 50 items, results push) |
| `PATCH /api/verification/review/:id` | 🔒 | Admin: revisión manual (verified/rejected + note) |

---

## 🔒 ANTI-FRAUD

| Regla | Detalle |
|-------|---------|
| Intentos máximos | 3 por misión |
| Duplicados | Misma URL en otra misión → rechazada |
| Screenshots | Detectados por IA |
| Audio mínimo | 5 segundos |
| File size | Max 10MB |
| MIME types | JPEG, PNG, WebP, GIF, MP4, WebM, QuickTime, MP3, WAV, OGG, WebM audio |

### Al 3er intento
Si la evidencia no alcanza ≥80% confidence → se fuerza `needs_review` (revisión admin).

---

## 🔄 FLUJO COMPLETO

```
Usuario sube evidencia
       ↓
Valida: quest in_progress, attempts < 3, no duplicate URL
       ↓
Upload a Cloudinary → crea QuestVerification (status: analyzing)
       ↓
analyzeEvidence():
  photo/video → GroqVision.analyzeImage()
  text → GroqVision.analyzeText()
  audio → GroqVision.analyzeAudio() (Whisper)
  location → Geofence.validateLocationForQuest()
       ↓
Determina status por confidence threshold
       ↓
Si verified → TrustService.recordEvent('verification_accepted') + DiaryService.createFromQuestCompletion()
Si rejected → TrustService.recordEvent('verification_rejected')
       ↓
TrustService.checkAndAlert() → fraud alert si patrón sospechoso
       ↓
Retorna: verification, analysis, fraudAlert
```

---

## 🔑 REGLAS

1. **El backend calcula TODO.** La IA analiza, el backend decide el status.
2. **Máximo 3 intentos** por misión.
3. **Auto-create diary entry** al verificar exitosamente.
4. **Fraud check automático** después de cada verificación.
5. **Batch analysis** para procesamiento en paralelo.
6. **Streaming SSE** para batches grandes (resultados push).
7. **Logging:** `[VerificationService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Verificación completa: 5 tipos, anti-fraud, 6 endpoints | Buffy |
| 2026-08-26 | Groq Vision AI real (qwen/qwen3.6-27b, gratis) | Buffy |
| 2026-09-03 | Fix arranque: import de TrustModule con `forwardRef` (dependencia circular con AdminModule) | Buffy |
| 2026-09-05 | +Batch analysis (10 items paralelo) + Streaming SSE (50 items) | Buffy |
| 2026-09-05 | +Auto-create DiaryEntry al verificar (DiaryService) | Buffy |
| 2026-09-05 | +Groq Whisper para audio (transcribir + analizar) | Buffy |
| 2026-09-05 | +Geofence real para ubicación (POIs cercanos) | Buffy |
