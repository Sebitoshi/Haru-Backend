# 🤖 AI / Boti — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/ai/`

---

## 📌 PROPÓSITO

Módulo de integración de inteligencia artificial. **La funcionalidad IA real está en `src/modules/boti/`** (BotiAI, BotiProfileService). Este módulo es el contenedor/exposición.

---

## 🏗️ ARQUITECTURA

```
ai/
├── ai.module.ts                  # Module (vacío — funcionalidad en boti/)
└── agent.md
```

---

## 🧠 DÓNDE ESTÁ LA IA REAL

| Función | Servicio | Módulo |
|---------|----------|--------|
| Chat con Boti | `BotiAI.chat()` | `boti/boti-ai.service.ts` |
| Mensaje diario | `BotiAI.generateDailyMessage()` | `boti/boti-ai.service.ts` |
| Detección de modo | `BotiAI.detectMode()` | `boti/boti-ai.service.ts` |
| Perfilamiento | `BotiProfileService.buildProfile()` | `boti/boti-profile.service.ts` |
| Recomendaciones | `BotiProfileService.getRecommendedQuests()` | `boti/boti-profile.service.ts` |
| Verificación fotos | `GroqVisionService.analyzeImage()` | `common/groq/groq-vision.service.ts` |
| Verificación texto | `GroqVisionService.analyzeText()` | `common/groq/groq-vision.service.ts` |
| Verificación audio | `GroqVisionService.analyzeAudio()` | `common/groq/groq-vision.service.ts` |

---

## 🔑 REGLAS CRÍTICAS

1. **La IA PROPONE, el backend DECIDE.** Nunca al revés.
2. **La IA NUNCA accede directamente a la DB** para acciones críticas.
3. **La IA NUNCA modifica:** monedas, inventario, XP, niveles, auth, permisos.
4. **Las misiones generadas por IA** se validan antes de crear.
5. **Las recompensas las asigna el backend.**
6. **La memoria es estructurada**, no un log libre.
7. **Privacidad es prioridad.**
8. **Groq es opcional** — sin API key, Boti usa templates predefinidos.

---

## 🔄 FLUJO DE MISIÓN GENERADA POR IA

```
Usuario: "Tengo 10 minutos y estoy aburrido"
       ↓
BotiAI detectMode() → 'recommender'
       ↓
BotiProfileService.getRecommendedQuests() → scoring por perfil
       ↓
Groq llama-3.3-70b genera propuesta
       ↓
QuestsService.proposeQuest() → valida estructura
       ↓
Backend asigna recompensas (la IA NUNCA decide XP/Coins)
       ↓
Se crea la misión en la DB
       ↓
Usuario acepta → flujo normal
```

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Módulo ai/ como contenedor — funcionalidad real en boti/ | Buffy |
