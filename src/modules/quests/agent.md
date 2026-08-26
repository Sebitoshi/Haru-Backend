# 🎯 Quests (Motor de Misiones) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/quests/`

---

## ✅ LO QUE SE IMPLEMENTÓ

### 26 Misiones semilla (22 regular + 4 semanales)

| Categoría | Regular | Semanal |
|-----------|---------|---------|
| 🌿 Naturaleza | 3 | — |
| 🎨 Creatividad | 3 | Reto Semanal Creativo |
| ❤️ Bondad | 2 | Semana de Bondad |
| 🧠 Aprendizaje | 2 | — |
| 🏃 Movimiento | 3 | Semana Activa |
| 👥 Social | 2 | — |
| 📸 Fotografía | 2 | — |
| 🌙 Tranquilidad | 2 | — |
| 🗺️ Aventura | 3 | Explorador Semanal |

### Features implementadas

#### 🔥 Streak Multiplier
- +10% XP por cada día de racha consecutiva
- Máximo +50% bonus
- Se calcula automáticamente al completar misión
- Se muestra en la respuesta: `streakDays`, `streakMultiplier`, `baseXp`, `finalXp`

#### 📅 Misiones Semanales
- 4 misiones con `type: weekly` y `weeklyReset: true`
- Se resetean cada lunes
- `GET /api/quests/weekly` retorna misiones de la semana actual con progreso
- Pueden tener `totalSteps` para progreso multi-paso

#### 🤖 Boti/IA Propuesta
- `POST /api/quests/propose` — Boti propone misión personalizada
- Validación estricta: categoría, dificultad, duración, steps
- Backend asigna recompensas (la IA NUNCA decide XP/Coins)
- Anti-spam: no permite propuestas similares en 24h
- Campo `reasoning` para que Boti explique por qué propone esa misión

#### 📊 Progreso Multi-paso
- `PATCH /api/quests/:id/progress` — Actualizar progreso por step
- Cada step tiene: `title`, `description`, `type` (photo/text/action/location)
- Progreso guardado en JSON: `{ currentStep, totalSteps, steps: [...] }`
- No se puede completar misión sin completar todos los steps

#### 🔒 Desbloqueo por Nivel
- Campo `minLevel` en cada misión
- Categorías con nivel mínimo: Social (3), Aprendizaje (2), Fotografía (2), Aventura (4)
- `GET /api/quests` retorna `locked: true/false` según nivel del usuario
- `POST /api/quests/:id/accept` valida nivel antes de aceptar
- Misiones semanales requieren nivel 4

### Endpoints (15)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/quests` | 🔒 | Listar misiones (nivel-aware, locked) |
| `GET /api/quests/categories` | 🔒 | 9 categorías con minLevel |
| `GET /api/quests/daily` | 🔒 | Misión diaria personalizada |
| `GET /api/quests/weekly` | 🔒 | Misiones semanales con progreso |
| `GET /api/quests/surprise` | 🔒 | 🎲 SORPRÉNDEME |
| `GET /api/quests/me` | 🔒 | Tus misiones con progress |
| `GET /api/quests/me/stats` | 🔒 | Stats: weekly, AI, category breakdown |
| `GET /api/quests/:id` | 🔒 | Detalle de misión |
| `POST /api/quests` | 🔒 | Crear misión (admin) |
| `POST /api/quests/propose` | 🔒 | 🤖 Boti/IA propone misión |
| `POST /api/quests/:id/accept` | 🔒 | Aceptar (valida nivel) |
| `POST /api/quests/:id/start` | 🔒 | Comenzar |
| `PATCH /api/quests/:id/progress` | 🔒 | Actualizar step |
| `POST /api/quests/:id/complete` | 🔒 | Completar + streak multiplier |
| `POST /api/quests/:id/skip` | 🔒 | Saltar |
| `POST /api/quests/seed` | 🌐 | Sembrar 26 misiones |

---

## 📊 MODELO DE DATOS

```text
Quest
├── id, title, description, category, difficulty, duration
├── xpReward, coinsReward
├── type (daily/weekly/regular/special/ai_generated/surprise)
├── minLevel (desbloqueo por nivel)
├── totalSteps (multi-paso: null = single step)
├── weeklyReset (resetea cada lunes)
├── requirements, isAIGenerated, isActive
├── expiresAt, maxCompletions

UserQuest
├── id, userId, questId, status
├── progress (JSON: { currentStep, totalSteps, steps: [...] })
├── startedAt, completedAt, createdAt
```

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Implementación completa: 22 misiones, 12 endpoints, flujo E2E | Buffy |
| 2026-08-26 | +5 features: streak multiplier, weekly, AI propose, progress, level unlock | Buffy |
