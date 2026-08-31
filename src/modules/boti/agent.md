# 🤖 Boti — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Boti es el **compañero IA de Haru**. No es la plataforma, no es un chatbot genérico. Es el personaje que acompaña al usuario en su aventura diaria.

### Responsabilidades:
- Crear Boti al registrar usuario
- Nombre, apariencia, personalidad
- 9 expresiones con triggers contextuales
- Mood dinámico basado en actividad
- Memoria contextual (MongoDB)
- Saludos inteligentes
- Interacciones con referencias a memoria
- **🤖 Modos IA: Recomendador, Motivador, Explorador, Narrador**
- **🧠 Perfilamiento de comportamiento del usuario**
- **💬 Conversación con IA (Groq)**
- **📊 Recomendaciones personalizadas**

---

## 🧠 PERSONALIDAD DE BOTI

- Amigable, divertida, curiosa, cercana
- Espontánea, ligeramente graciosa
- No demasiado infantil ni excesivamente motivacional
- Evita respuestas corporativas y repetitivas
- Habla en español, tono casual y cálido

---

## 🎭 LOS 4 MODOS DE BOTI

### 🎯 Recomendador
> "Tengo una misión que creo que te va a gustar 🎨"

- Analiza categorías favoritas del usuario
- Sugiere misiones alineadas con gustos
- Evita repetir categorías recientes
- Muestra duración, dificultad, XP

### 🌱 Motivador
> "Llevas 6 días seguidos. ¡Uno más! 🔥"

- Celebra logros y rachas
- Empuja sutilmente sin ser intenso
- Si la racha se rompe: "No pasa nada 🌱"
- Recuerda milestones alcanzados

### 🧭 Explorador
> "Siempre eliges creatividad. Probemos aventura."

- Detecta cuando el usuario se estanca
- Empuja hacia categorías no exploradas
- Desafía la zona de confort
- Activa cuando consecutiveDaysSameCategory >= 3

### 📖 Narrador
> "Has recorrido bastante camino. Mira todo lo que has conseguido."

- Cuenta la historia del progreso
- Resume logros y estadísticas
- Contexto general del nivel y XP
- Activa para usuarios de alto nivel

---

## 📊 PERFILAMIENTO DE USUARIO

Boti analiza el comportamiento para personalizar la experiencia:

| Métrica | Cómo se calcula |
|---------|-----------------|
| favoriteCategories | Top 3 categorías completadas |
| ignoredCategories | Categorías con 0 misiones |
| preferredDifficulty | Dificultad más completada |
| avgSessionMinutes | Promedio de duración de misiones |
| preferredTimeOfDay | Hora del día con más actividad |
| frequencyDaysPerWeek | Días únicos con actividad |
| completionRate | Completadas / aceptadas × 100 |
| explorersScore | 0-100: variedad de categorías |
| consecutiveDaysSameCategory | Días seguidos en misma categoría |

### Lógica de selección de modo:

```
Si consecutiveDaysSameCategory >= 3 → 🧭 EXPLORER
Si explorersScore < 25 (random 50%) → 🧭 EXPLORER
Si streak = 0 o frequency < 2 → 🌱 MOTIVADOR
Si level >= 10 y completions >= 20 (random 30%) → 📖 NARRADOR
Default → 🎯 RECOMMENDER
```

---

## 💬 CONVERSACIÓN CON IA (Groq)

Cuando `GROQ_API_KEY` está configurado, Boti usa **llama-3.3-70b-versatile** para:

1. **Chat contextual** — El usuario habla, Boti responde usando su perfil
2. **Daily messages** — Mensaje diario personalizado
3. **Modo detectado** — Analiza el mensaje del usuario para elegir modo

Si no hay API key → usa templates predefinidos (fallback graceful).

---

## 📊 MODELO DE DATOS

### PostgreSQL (Prisma):
```
BotiCharacter
├── id, userId, name, expression, mood
├── bodyType, bodyColor, eyeStyle, mouthStyle
├── personality (JSON)
├── lastInteractedAt, totalInteractions
```

### MongoDB (Mongoose):
```
BotiMemory
├── userId, type, key, value
├── importance, accessCount
├── lastAccessedAt, expiresAt
```

### Profile (calculado, no persistido):
```
UserProfile
├── favoriteCategories[], ignoredCategories[]
├── preferredDifficulty, avgSessionMinutes
├── preferredTimeOfDay, frequencyDaysPerWeek
├── completionRate, explorersScore
├── consecutiveDaysSameCategory
└── recentMood, currentLevel, currentStreak
```

---

## 🔑 REGLAS

1. **Cada usuario tiene UN solo Boti.** Relación 1:1.
2. **Boti se crea en el registro.**
3. **El mood se actualiza automáticamente.**
4. **La memoria se guarda silenciosamente.** Boti la menciona naturalmente.
5. **El perfil se calcula en cada request** (no se persiste — siempre fresco).
6. **Groq es opcional** — sin API key, Boti usa templates.
7. **Logging:** `[BotiService|BotiAI|BotiProfileService] Operation: details`

---

## ✅ ENDPOINTS (17)

### Personaje (10)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/boti/me` | GET | Boti con expresión, mood, memoria |
| `/api/boti/me` | PATCH | Actualizar nombre, apariencia |
| `/api/boti/me/expression` | PATCH | Establecer expresión |
| `/api/boti/me/mood` | GET | Mood dinámico calculado |
| `/api/boti/me/mood` | PATCH | Establecer mood manual |
| `/api/boti/me/interact` | POST | Interactuar (con memoria) |
| `/api/boti/me/memory/preference` | POST | Guardar preferencia |
| `/api/boti/me/memories` | GET | Ver memorias |
| `/api/boti/me/status` | GET | Estado detallado |
| `/api/boti/expressions` | GET | Expresiones disponibles |

### IA (5)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/boti/me/chat` | POST | Chat con IA (Groq) — contexto + perfil |
| `/api/boti/me/daily` | POST | Mensaje diario de Boti |
| `/api/boti/me/recommendations` | GET | Misiones personalizadas |
| `/api/boti/me/profile` | GET | Perfil de comportamiento |
| `/api/boti/modes` | GET | Info de los 4 modos |

---

## 📋 MÓDULOS

```
boti.module.ts          ← Module principal
boti.service.ts         ← Personaje, expresiones, interacciones
boti.controller.ts      ← 17 endpoints
boti-ai.service.ts      ← Groq IA: chat, daily, modes
boti-profile.service.ts ← Perfilamiento: categorías, frecuencia, explorer score
boti-mood.service.ts    ← Mood dinámico (5 factores)
boti-memory.service.ts  ← Memoria MongoDB
dto/update-boti.dto.ts  ← DTOs de validación
schemas/                ← Mongoose schemas
```

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Boti: Character, expressions, interactions | Buffy |
| 2026-08-23 | Memory (MongoDB) + Dynamic Mood | Buffy |
| 2026-08-25 | Clarificado: Boti es el compañero de Haru | Buffy |
| 2026-08-30 | 🤖 IA: Chat, Daily, Recommendations, Profile, 4 Modes | Buffy |
