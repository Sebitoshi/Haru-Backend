# 🛡️ Trust (Sistema de Confianza) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Mantener rankings limpios y recompensas justas en **Haru** analizando el comportamiento del usuario.

---

## 📊 FACTORES DE CONFIANZA

| Factor | Impacto | Descripción |
|--------|---------|-------------|
| Evidencias aceptadas | ✅ Positivo | Misiones verificadas exitosamente |
| Evidencias rechazadas | ⚠️ Negativo | Intentos de evidencia inválida |
| Reportes recibidos | ❌ Negativo | Otros usuarios lo reportaron |
| Intentos de fraude | 🔴 Muy negativo | Patrones sospechosos detectados |
| Antigüedad | ✅ Positivo | Tiempo en la plataforma |
| Comportamiento consistente | ✅ Positivo | Actividad regular sin incidentes |

---

## 🏷️ NIVELES DE CONFIANZA

| Nivel | Emoji | Requisito |
|-------|-------|-----------|
| Nuevo | 👤 | Recién registrado |
| Confiable | 🌱 | Sin incidentes + 5+ misiones |
| Muy confiable | 🌿 | Sin incidentes + 20+ misiones + 30 días |
| Excelente reputación | ⭐ | Sin incidentes + 50+ misiones + 90 días |

---

## 📊 MODELO DE DATOS

```text
UserTrust
├── id
├── userId (unique)
├── level (new | trustworthy | very_trustworthy | excellent)
├── score (0-100)
├── totalVerifications (accepted)
├── totalRejections
├── totalReports
├── fraudAttempts
├── lastEvaluatedAt
├── createdAt
└── updatedAt

TrustEvent
├── id
├── userId
├── type (verification_accepted | verification_rejected | report | fraud_detected | etc.)
├── impact (+/- score)
├── details (JSON)
└── createdAt
```

---

## 🔄 CÓMO SE ACTUALIZA

```
Evento ocurre (verificación, reporte, etc.)
       ↓
Calcular impacto en score
       ↓
Actualizar score
       ↓
Evaluar si el nivel cambió
       ↓
Si nivel subió → desbloquear beneficios
Si nivel bajó → limitar funcionalidades
       ↓
Registrar TrustEvent
```

---

## 🔑 REGLAS

1. **El score nunca es visible directamente** al usuario. Solo el nivel.
2. **Un nivel bajo puede limitar** ciertas funcionalidades (ej: no puede participar en rankings).
3. **El sistema debe ser justo.** No penalizar errores aislados.
4. **El usuario puede ver su nivel de confianza** en su perfil.
5. **Evaluación periódica** (cada semana) + evaluación por evento.
6. **Logging:** `[TrustService] Operation: details`
7. **No es punitivo, es preventivo.** El objetivo es mantener integridad.
