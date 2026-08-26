# 📸 Verification (Verificación de Evidencia) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema que comprueba que el usuario realmente realizó una misión en **Haru**.

El usuario sube evidencia y Haru verifica que sea válida.

---

## 📸 TIPOS DE EVIDENCIA

| Tipo | Descripción |
|------|-------------|
| 📸 Foto | Fotografía del momento/actividad |
| 🎥 Video | Video corto de la actividad |
| 🎤 Audio | Grabación de audio |
| 📝 Texto | Descripción de la experiencia |
| 📍 Ubicación | GPS del lugar (cuando sea necesario) |

---

## 🤖 ANÁLISIS CON IA

La IA analiza la evidencia:
- ¿Existe el objeto/actividad mencionada?
- ¿La evidencia es auténtica (no es screenshot, no es repetida)?
- ¿Coincide con la misión?

**Ejemplo:**
```
Misión: "Encuentra una flor amarilla."
Usuario sube foto.
IA analiza:
  🌼 ¿Existe una flor? → Sí
  🟡 ¿Color amarillo? → Detectado
  📸 ¿Evidencia válida? → Sí
  ✅ Misión verificada.
```

---

## 📊 ESTADOS

| Estado | Emoji | Descripción |
|--------|-------|-------------|
| Pending | ⏳ | Esperando revisión |
| Analyzing | 🤖 | IA analizando la evidencia |
| Verified | 🟢 | Evidencia válida, misión completada |
| Rejected | 🔴 | Evidencia rechazada |
| NeedsReview | ⚠️ | Requiere revisión manual |

---

## 📊 MODELO DE DATOS

```text
QuestVerification
├── id
├── userId
├── questId
├── userQuestId
├── evidenceType (photo | video | audio | text | location)
├── evidenceUrl (Cloudinary)
├── evidenceText (optional)
├── location (optional, JSON: lat, lng)
├── status (pending | analyzing | verified | rejected | needs_review)
├── aiAnalysis (JSON: confidence, tags, notes)
├── reviewerId (optional, for manual review)
├── reviewNote (optional)
├── submittedAt
├── reviewedAt
└── createdAt
```

---

## 🔄 FLUJO

```
Usuario completa misión
       ↓
Sube evidencia (foto/video/texto)
       ↓
Se guarda en Cloudinary
       ↓
Estado: analyzing
       ↓
IA analiza la evidencia
       ├── Verified → +XP +Coins → crear recuerdo
       ├── Rejected → notificar al usuario
       └── NeedsReview → revisión manual
```

---

## 🔑 REGLAS

1. **La IA analiza, pero puede haber revisión manual** si la confianza es baja.
2. **No aceptar evidencias duplicadas** (misma imagen para diferentes misiones).
3. **No aceptar screenshots** de otras apps.
4. **La evidencia se almacena en Cloudinary** con optimización.
5. **El usuario puede apelar** un rechazo (futuro).
6. **Máximo 3 evidencias por misión** antes de requerir revisión manual.
7. **La ubicación es opcional** pero ayuda a verificar.
8. **Logging:** `[VerificationService] Operation: details`
9. **Transacción atómica:** verificar evidencia + actualizar UserQuest + entregar recompensa.

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| — | Pendiente de implementar | — |
