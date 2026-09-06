# 🤖 Boti — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/boti/`

---

## 📌 PROPÓSITO

Boti es el **compañero IA de Haru**. No es un chatbot genérico. Es el personaje que acompaña al usuario en su aventura diaria.

Responsabilidades:
- Crear Boti al registrar usuario (auto-create en AuthService.register)
- Nombre, apariencia, personalidad
- 9 expresiones con triggers contextuales
- Mood dinámico basado en 5 factores de actividad
- Memoria contextual (MongoDB)
- Saludos inteligentes (first meet, welcome back, late night, daily)
- Interacciones con referencias a memoria
- 🤖 Modos IA: Recomendador, Motivador, Explorador, Narrador
- 🧠 Perfilamiento de comportamiento del usuario
- 💬 Conversación con IA (Groq llama-3.3-70b-versatile)
- 📊 Recomendaciones personalizadas de misiones

---

## 🏗️ ARQUITECTURA

```
boti/
├── boti.service.ts             # Character CRUD, expressions, interactions, greetings, mood
├── boti-ai.service.ts          # Groq IA: chat, daily message, mode detection, fallback templates
├── boti-profile.service.ts     # Perfilamiento: categorías, frecuencia, explorer score, recommendations
├── boti-memory.service.ts      # Memoria MongoDB: save, get, contextual, memory references
├── boti-mood.service.ts        # Mood dinámico (5 factores ponderados)
├── boti.controller.ts          # 17 endpoints bajo /api/boti/
├── boti.module.ts              # Module
├── dto/update-boti.dto.ts      # DTOs: name, bodyType, bodyColor, eyeStyle, mouthStyle, personality
├── schemas/boti-memory.schema.ts # Mongoose schema: BotiMemory
└── agent.md
```

---

## 🎭 9 EXPRESIONES

| Code | Nombre | Triggers |
|------|--------|----------|
| calm | Tranquilo | idle, return (default) |
| happy | Feliz | quest_completed, level_up, purchase |
| curious | Curioso | chat_start, new_feature |
| surprised | Sorprendido | level_up, rare_drop, achievement |
| confused | Confundido | no_quest, user_indecisive |
| tired | Cansado | late_night (0-6h), long_session |
| excited | Emocionado | streak_milestone, rare_achievement |
| celebrating | Celebrando | big_achievement, streak_7, level_milestone |
| worried | Preocupado | user_inactive (>48h), streak_about_to_break |

---

## 🎯 4 MODOS DE BOTI

### 🎯 Recomendador (default)
> "Tengo una misión que creo que te va a gustar 🎨"
- Analiza categorías favoritas, dificultad preferida, duración promedio
- Scoring: +30 fav category, +20 ignored category (si explorerScore<50), +15 preferred difficulty, +10 duration match, +5 AI-generated, +10 weekly (si user activo), +random 10
- Filtra misiones no completadas, nivel≤userLevel

### 🌱 Motivador
> "Llevas 6 días seguidos. ¡Uno más! 🔥"
- Celebra logros y rachas
- Si racha=0: "No pasa nada 🌱. Tu aventura continúa."
- Si completions≥50: "Eres una leyenda 🌟."

### 🧭 Explorador
> "Siempre eliges creatividad. Probemos aventura."
- Se activa cuando `consecutiveDaysSameCategory >= 3`
- O cuando `explorersScore < 25` (50% probabilidad)
- Empuja hacia categorías no exploradas

### 📖 Narrador
> "Has recorrido bastante camino. Mira todo lo que has conseguido."
- Activa cuando `level >= 10 && completions >= 20` (30% probabilidad)
- Resume progreso, categorías, racha

### Lógica de selección automática:
```
Si consecutiveDaysSameCategory >= 3 → 🧭 EXPLORER
Si explorersScore < 25 (random 50%) → 🧭 EXPLORER
Si streak = 0 o frequency < 2 → 🌱 MOTIVADOR
Si level >= 10 y completions >= 20 (random 30%) → 📖 NARRADOR
Default → 🎯 RECOMMENDER
```

---

## 🧠 PERFILAMIENTO DE USUARIO (UserProfile)

| Métrica | Cómo se calcula |
|---------|-----------------|
| favoriteCategories | Top 3 categorías por count (activityLog quest_completed) |
| ignoredCategories | Categorías con 0 misiones de las 9 totales |
| preferredDifficulty | Dificultad más completada |
| avgSessionMinutes | Promedio de duración de misiones completadas |
| preferredTimeOfDay | morning/afternoon/evening/night con más actividad |
| frequencyDaysPerWeek | (días únicos con actividad / días desde registro) × 7 |
| completionRate | completadas / aceptadas × 100 |
| explorersScore | 0-100: (categorías activas / 9) × 100 |
| consecutiveDaysSameCategory | Días seguidos en misma categoría (desde la más reciente) |
| recentMood | great (≥3 completions en 3 días o streak≥7), good (≥1), neutral |

---

## 💬 CONVERSACIÓN CON IA (Groq)

- **Modelo:** `llama-3.3-70b-versatile`
- **API Key:** `GROQ_API_KEY` (opcional — sin key usa templates)
- **Contexto:** Profile completo del usuario + misión sugerida + últimos 5 mensajes
- **Temperature:** 0.8 (chat), 0.9 (daily)
- **Max tokens:** 256 (chat), 200 (daily)
- **System prompt:** Personalidad Boti + reglas + contexto del usuario + modo activo
- **Fallback:** Si Groq falla → usa `generateModeMessage()` con templates

### Detección de modo por mensaje del usuario:
- `/misión|mision|quest|reto|sugiér|quiero hacer/` → recommender
- `/racha|streak|nivel|no puedo|cansado|motiva/` → motivator
- `/diferente|nuevo|aventura|explorar|probar|zona de confort/` → explorer
- `/progreso|historia|cuánto|he hecho|resumen|cuéntame/` → narrador
- Default → `pickBestMode(profile)`

---

## 💾 MODELO DE DATOS

### PostgreSQL (Prisma):
```
BotiCharacter
├── id, userId (unique), name, expression, mood
├── bodyType, bodyColor, eyeStyle, mouthStyle
├── personality (JSON: { playfulness, curiosity, energy })
├── lastInteractedAt, totalInteractions
```

### MongoDB (Mongoose):
```
BotiMemory
├── userId, type (preference|event|milestone), key, value
├── importance (1-10), accessCount
├── lastAccessedAt, expiresAt
```

---

## 🌐 ENDPOINTS (17)

### Personaje (10)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/boti/me` | 🔒 | Boti con expresión contextual, mood, greeting, memory reference |
| `PATCH /api/boti/me` | 🔒 | Actualizar nombre, bodyType, bodyColor, eyeStyle, mouthStyle, personality |
| `PATCH /api/boti/me/expression` | 🔒 | Establecer expresión (valida contra 9 disponibles) |
| `GET /api/boti/me/mood` | 🔒 | Mood dinámico calculado (5 factores) |
| `PATCH /api/boti/me/mood` | 🔒 | Establecer mood manual (neutral/good/great/bad/awful) |
| `POST /api/boti/me/interact` | 🔒 | Interactuar con contexto (guarda memoria + referencia) |
| `POST /api/boti/me/memory/preference` | 🔒 | Guardar preferencia en memoria (importance=7) |
| `GET /api/boti/me/memories` | 🔒 | Ver memorias agrupadas por tipo |
| `GET /api/boti/me/status` | 🔒 | Estado detallado (time since, memory count, shouldWorry, isLateNight) |
| `GET /api/boti/expressions` | 🔒 | 9 expresiones disponibles con metadata |

### IA (5)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /api/boti/me/chat` | 🔒 | Chat con IA — contexto + perfil + últimos 5 mensajes |
| `POST /api/boti/me/daily` | 🔒 | Mensaje diario personalizado de Boti |
| `GET /api/boti/me/recommendations` | 🔒 | Misiones personalizadas (scoring por perfil) |
| `GET /api/boti/me/profile` | 🔒 | Perfil de comportamiento completo |
| `GET /api/boti/modes` | 🔒 | Info de los 4 modos |

---

## 🔑 REGLAS

1. **Cada usuario tiene UN solo Boti.** Relación 1:1. Se crea al registrar.
2. **El mood se actualiza automáticamente** en cada `getBoti()` llamada.
3. **La memoria se guarda silenciosamente.** Boti la menciona naturalmente en `memoryReference`.
4. **El perfil se calcula en cada request** (no se persiste — siempre fresco).
5. **Groq es opcional** — sin API key, Boti usa templates predefinidos.
6. **La IA PROPOONE, el backend DECIDE.** Nunca al revés.
7. **El backend asigna recompensas.** La IA nunca modifica XP, coins, etc.
8. **Logging:** `[BotiService|BotiAI|BotiProfileService|BotiMemoryService|BotiMoodService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Boti: Character, expressions, interactions, memory (MongoDB), dynamic mood | Buffy |
| 2026-08-25 | Clarificado: Boti es el compañero de Haru | Buffy |
| 2026-08-30 | 🤖 IA completa: Chat Groq, Daily, Recommendations, Profile, 4 Modes | Buffy |
| 2026-09-05 | BotiProfileService: explorerScore, consecutiveDaysSameCategory, scoring de recommendations | Buffy |
