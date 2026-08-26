# 🎯 Quests (Motor de Misiones) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/quests/`

---

## 📌 PROPÓSITO

El **corazón de Haru**. Sistema central de misiones.

---

## ✅ LO QUE SE IMPLEMENTÓ

### Prisma
- **Quest** — modelo con category (enum 9 valores), difficulty, type, xpReward, coinsReward, duration, requirements, expiresAt
- **UserQuest** — relación usuario-misión con status (available/accepted/in_progress/completed/failed/skipped)
- **Migración** `add-quests` aplicada

### 22 Misiones semilla

| Categoría | Misiones | Dificultades |
|-----------|----------|-------------|
| 🌿 Naturaleza | Florecimiento, Aventura Verde, Cielo Azul | easy, normal, easy |
| 🎨 Creatividad | Dibujo Rápido, Foto Creativa, Poema del Día | easy, normal, normal |
| ❤️ Bondad | Mensaje Amable, Acto de Bondad | easy, normal |
| 🧠 Aprendizaje | Curiosidad, Mini Curso | easy, hard |
| 🏃 Movimiento | Pasos Primeros, Energía Activa, Reto del Movimiento | easy, normal, hard |
| 👥 Social | Conversación Real, Reconexión | easy, normal |
| 📸 Fotografía | Captura el Momento, Fotografía Macro | easy, normal |
| 🌙 Tranquilidad | Pausa Consciente, Desconexión | easy, normal |
| 🗺️ Aventura | Explorador, Ruta Nueva, Descubrimiento | easy, normal, hard |

### Endpoints (12)

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/quests` | GET | 🔒 | Listar misiones (filtros: category, difficulty, maxDuration, search) |
| `/api/quests/categories` | GET | 🔒 | 9 categorías con emoji, nombre, descripción |
| `/api/quests/daily` | GET | 🔒 | Misión diaria personalizada |
| `/api/quests/surprise` | GET | 🔒 | 🎲 SORPRÉNDEME — misión aleatoria |
| `/api/quests/me` | GET | 🔒 | Misiones del usuario (filtro por status) |
| `/api/quests/me/stats` | GET | 🔒 | Estadísticas de misiones |
| `/api/quests/:id` | GET | 🔒 | Detalle de misión |
| `/api/quests` | POST | 🔒 | Crear misión (admin/Boti) |
| `/api/quests/:id/accept` | POST | 🔒 | Aceptar misión |
| `/api/quests/:id/start` | POST | 🔒 | Comenzar misión |
| `/api/quests/:id/complete` | POST | 🔒 | Completar misión + recompensas |
| `/api/quests/:id/skip` | POST | 🔒 | Saltar misión |
| `/api/quests/seed` | POST | 🌐 | Sembrar 22 misiones iniciales |

### Recompensas calculadas por dificultad

| Dificultad | XP base | Coins base | Bonus duration |
|------------|---------|------------|----------------|
| easy | +10 | +8 | +2 XP / 10 min |
| normal | +25 | +15 | +2 XP / 10 min |
| hard | +50 | +30 | +2 XP / 10 min |
| special | +100 | +60 | +2 XP / 10 min |

### Features
- **Misión diaria** — Evita categorías recientes, personaliza por historial
- **SORPRÉNDEME** — Aleatorio, evita misiones recientemente completadas
- **Flujo completo** — accept → start → complete con validación de estados
- **Recompensas** — XP + Coins calculados por backend, nunca por frontend
- **Activity log** — Registra cada misión completada
- **Filtros** — Por categoría, dificultad, duración máxima, búsqueda de texto
- **Estadísticas** — Breakdown por categoría, total XP, total Coins

---

## 📊 MODELO DE DATOS

```text
Quest
├── id, title, description
├── category (enum: nature, creativity, kindness, learning, movement, social, photography, relaxation, adventure)
├── difficulty (easy / normal / hard / special)
├── duration (minutes)
├── xpReward, coinsReward
├── type (daily / weekly / regular / special / ai_generated / surprise)
├── requirements (JSON)
├── isAIGenerated, isActive, maxCompletions
├── expiresAt, createdAt, updatedAt

UserQuest
├── id, userId, questId
├── status (available / accepted / in_progress / completed / failed / skipped)
├── startedAt, completedAt, createdAt
├── @@unique([userId, questId])
```

---

## 🔑 REGLAS

1. **Las recompensas las calcula el backend.** Nunca confiar en el frontend.
2. **No se puede completar sin haber aceptado y comenzado.**
3. **No se puede completar dos veces** (a menos que sea re-accept tras skip/fail).
4. **Las misiones diarias evitan categorías recientes** (últimos 7 días).
5. **SORPRÉNDEME evita misiones recientemente completadas** (últimas 10).
6. **Las transacciones son atómicas.**
7. **Logging:** `[QuestsService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Implementación completa: 22 misiones, 12 endpoints, flujo end-to-end | Buffy |
