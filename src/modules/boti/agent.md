# 🤖 Boti — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Boti es el **compañero IA de Haru**. No es la plataforma, no es un chatbot genérico. Es el personaje que acompaña al usuario en su aventura diaria.

Responsabilidades:
- Crear Boti al registrar usuario
- Nombre, apariencia, personalidad
- 9 expresiones con triggers contextuales
- Mood dinámico basado en actividad
- Memoria contextual (MongoDB)
- Saludos inteligentes
- Interacciones con referencias a memoria
- Modos: Recomendador, Motivador, Explorador, Narrador

---

## 🧠 PERSONALIDAD DE BOTI

- Amigable, divertida, curiosa, cercana
- Espontánea, ligeramente graciosa
- No demasiado infantil ni excesivamente motivacional
- Evita respuestas corporativas y repetitivas

---

## 😊 EXPRESIONES (9)

| Código | Nombre | Trigger |
|--------|--------|---------|
| calm | Tranquilo | idle, return |
| happy | Feliz | quest_completed, level_up |
| curious | Curioso | chat_start |
| surprised | Sorprendido | level_up, rare_drop |
| confused | Confundido | user_indecisive |
| tired | Cansado | late_night |
| excited | Emocionado | rare_achievement |
| celebrating | Celebrando | streak_7 |
| worried | Preocupado | user_inactive > 48h |

---

## 🎭 MOOD DINÁMICO (5 factores)

| Factor | Peso | Descripción |
|--------|------|-------------|
| recentActivity | 25% | Logins en últimos 7 días |
| streakHealth | 20% | Salud de la racha |
| questProgress | 25% | Misiones completadas |
| timeOfDay | 10% | Hora actual (mejor 9am-9pm) |
| inactivity | 20% | Tiempo sin interacción |

Moods: `great` 😊 | `good` 🙂 | `neutral` 😐 | `bad` 😔 | `awful` 😟

---

## 🧠 MEMORIA (MongoDB)

Boti recuerda:
- **Preferencias** — categorías favoritas, duración
- **Eventos** — últimas interacciones, logros
- **Hitos** — primeros logros, rachas
- **Contexto** — patrones de uso

Cada memoria tiene `importance` (0-10) y se referencia automáticamente.

---

## 📊 MODELO DE DATOS

```text
PostgreSQL (Prisma):
BotiCharacter
├── id, userId, name, expression, mood
├── bodyType, bodyColor, eyeStyle, mouthStyle
├── personality (JSON)
├── lastInteractedAt, totalInteractions

MongoDB (Mongoose):
BotiMemory
├── userId, type, key, value
├── importance, accessCount
├── lastAccessedAt, expiresAt
```

---

## 🔑 REGLAS

1. **Cada usuario tiene UN solo Boti.** Relación 1:1.
2. **Boti se crea en el registro.**
3. **El mood se actualiza automáticamente.**
4. **La memoria se guarda silenciosamente.** Boti la menciona naturalmente.
5. **Logging:** `[BotiService] Operation: details`

---

## ✅ LO QUE SE IMPLEMENTÓ

### Endpoints (10)

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

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Boti: Character, expressions, interactions | Buffy |
| 2026-08-23 | Memory (MongoDB) + Dynamic Mood | Buffy |
| 2026-08-25 | Clarificado: Boti es el compañero de Haru, no la plataforma | Buffy |
