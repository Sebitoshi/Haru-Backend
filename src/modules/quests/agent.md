# 🎯 Quests (Motor de Misiones) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/quests/`

---

## 📌 PROPÓSITO

Motor de misiones de **Haru**. El usuario acepta → realiza actividad en el mundo real → sube evidencia → verifica → completa → recibe recompensas.

---

## 🏗️ ARQUITECTURA

```
quests/
├── quests.service.ts           # Core: CRUD, streak multiplier, daily/weekly/surprise, AI propose
├── quests.controller.ts        # 16 endpoints bajo /api/quests/
├── quests.module.ts            # Module (importa Streaks, Progression, Achievements, RankingNotifications, Collection)
├── dto/
│   ├── create-quest.dto.ts     # CreateQuest: title, desc, category, difficulty, duration, xp?, coins?, type?
│   ├── propose-quest.dto.ts    # ProposeQuest (Boti/IA): title, desc, category, duration, steps?, reasoning?
│   └── quest-filters.dto.ts    # Filters: category?, difficulty?, maxDuration?, search?
└── agent.md
```

---

## 📊 REWARD TABLES

### XP por dificultad
| Dificultad | XP base |
|------------|---------|
| easy | 10 |
| normal | 25 |
| hard | 50 |
| special | 100 |

### Coins por dificultad
| Dificultad | Coins |
|------------|-------|
| easy | 8 |
| normal | 15 |
| hard | 30 |
| special | 60 |

### Streak Multiplier
```
+10% por día de racha, máximo +50%
Formula: 1 + min(streakDays × 0.10, 0.50)
Ejemplo: 5 días → ×1.5 (max)
```

### XP por Steps (AI propose)
```
XP = baseXP + (steps.length × 10)
```

---

## 📅 9 CATEGORÍAS con MinLevel

| Categoría | Emoji | MinLevel |
|-----------|-------|----------|
| nature | 🌿 | 1 |
| creativity | 🎨 | 1 |
| kindness | ❤️ | 1 |
| learning | 🧠 | 2 |
| movement | 🏃 | 1 |
| social | 👥 | 3 |
| photography | 📸 | 2 |
| relaxation | 🌙 | 1 |
| adventure | 🗺️ | 4 |

---

## 📦 26 MISIONES SEMILLA (22 regular + 4 semanales)

### 🌿 Naturaleza (3)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Florecimiento | easy | 10min | 1 |
| Aventura Verde | normal | 20min | 1 |
| Cielo Azul | easy | 10min | 1 |

### 🎨 Creatividad (3 + 1 semanal)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Dibujo Rápido | easy | 10min | 1 |
| Foto Creativa | normal | 15min | 1 |
| Poema del Día | normal | 20min | 1 |
| **Reto Semanal Creativo** | hard | 60min | 1 | weekly |

### ❤️ Bondad (2 + 1 semanal)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Mensaje Amable | easy | 5min | 1 |
| Acto de Bondad | normal | 15min | 1 |
| **Semana de Bondad** | normal | 45min | 1 | weekly, 7 steps |

### 🧠 Aprendizaje (2)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Curiosidad | easy | 10min | 2 |
| Mini Curso | hard | 30min | 2 |

### 🏃 Movimiento (3 + 1 semanal)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Pasos Primeros | easy | 15min | 1 |
| Energía Activa | normal | 20min | 1 |
| Reto del Movimiento | hard | 35min | 1 |
| **Semana Activa** | hard | 60min | 1 | weekly, 7 steps |

### 👥 Social (2)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Conversación Real | easy | 15min | 3 |
| Reconexión | normal | 10min | 3 |

### 📸 Fotografía (2)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Captura el Momento | easy | 10min | 2 |
| Fotografía Macro | normal | 15min | 2 |

### 🌙 Tranquilidad (2)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Pausa Consciente | easy | 10min | 1 |
| Desconexión | normal | 25min | 1 |

### 🗺️ Aventura (3 + 1 semanal)
| Título | Dificultad | Duración | MinLevel |
|--------|-----------|----------|----------|
| Explorador | easy | 20min | 4 |
| Ruta Nueva | normal | 25min | 4 |
| Descubrimiento | hard | 45min | 4 |
| **Explorador Semanal** | hard | 90min | 4 | weekly |

---

## ✅ ENDPOINTS (16)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/quests` | 🔒 | Listar misiones (filtros: category, difficulty, maxDuration, search) + level-aware |
| `GET /api/quests/categories` | 🔒 | 9 categorías con emoji, name, minLevel |
| `GET /api/quests/daily` | 🔒 | Misión diaria personalizada (evita categorías recientes, level-aware) |
| `GET /api/quests/weekly` | 🔒 | 4 misiones semanales con progreso del usuario |
| `GET /api/quests/surprise` | 🔒 | 🎲 SORPRÉNDEME — random sin repetir recientes |
| `GET /api/quests/me` | 🔒 | Tus misiones con status/progress (?status=completed) |
| `GET /api/quests/me/stats` | 🔒 | Stats: total, completed, weekly, AI, categoryBreakdown |
| `GET /api/quests/:id` | 🔒 | Detalle de misión |
| `POST /api/quests` | 🔒 | Crear misión (admin) |
| `POST /api/quests/propose` | 🔒 | 🤖 Boti/IA propone misión (validación estricta, anti-spam 24h) |
| `POST /api/quests/:id/accept` | 🔒 | Aceptar (valida nivel + duplicados + re-accept de failed/skipped) |
| `POST /api/quests/:id/start` | 🔒 | Comenzar (accepted → in_progress) |
| `PATCH /api/quests/:id/progress` | 🔒 | Actualizar step (multi-step quests) |
| `POST /api/quests/:id/complete` | 🔒 | Completar + streak multiplier + XP + coins + badges + collection |
| `POST /api/quests/:id/skip` | 🔒 | Saltar misión |
| `POST /api/quests/seed` | 🌐 | Sembrar 26 misiones |

---

## 🔄 FLUJO DE COMPLETAR MISIÓN

```
POST /api/quests/:id/complete
       ↓
Valida: in_progress, no expired, todos los steps completados (si multi-step)
       ↓
Calcula streakMultiplier (consecutive days con actividad)
       ↓
finalXp = baseXp × streakMultiplier
finalCoins = baseCoins × streakMultiplier
       ↓
Marca UserQuest como completed
       ↓
1. StreakService.recordActivity() → extiende/borra/usa protección
2. ProgressionService.addXp(finalXp) → level up possible
3. ProgressionService.addCoins(finalCoins)
4. AchievementsService.checkBadges() → nuevos badges
5. RankingNotifications.checkAfterQuestCompletion()
6. CollectionService.checkAndUnlock() → nuevos collectibles
       ↓
Retorna: rewards, streak, progression, newBadges, newCollectibles, rankingNotifications
```

---

## 🔑 REGLAS

1. **El backend calcula TODO.** Nunca confiar en XP/coins del cliente.
2. **Streak multiplier:** +10% por día, max +50%. Se calcula en completeQuest.
3. **Multi-step quests:** No se puede completar sin todos los steps.
4. **Anti-spam AI:** No permite propuestas similares en 24h.
5. **AI propose:** Backend asigna recompensas (la IA NUNCA decide).
6. **Weekly reset:** Cada lunes se resetean las misiones semanales.
7. **Level unlock:** `minLevel` en cada misión, validado en accept y getAllQuests.
8. **Daily quest:** Evita categorías recientes (últimos 7 días). Fallback si no hay disponibles.
9. **Surprise:** Excluye las últimas 10 misiones completadas.
10. **Logging:** `[QuestsService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Implementación completa: 26 misiones, 16 endpoints, flujo E2E | Buffy |
| 2026-08-26 | +5 features: streak multiplier, weekly, AI propose, progress, level unlock | Buffy |
| 2026-09-05 | Fix: QuestsService integra RankingNotifications + CollectionService en completeQuest | Buffy |
