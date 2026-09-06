# 🏆 Gamificación — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/progression/` + `src/modules/achievements/`

---

## 📌 PROPÓSITO

Sistema de gamificación de **Haru**: XP, niveles, leaderboard.

---

## 🏗️ ARQUITECTURA

```
progression/
├── progression.service.ts       # XP calc, level calc, addXp, addCoins, leaderboard
├── progression.controller.ts    # 3 endpoints: /progression/me, /levels, /leaderboard
├── progression.module.ts        # Module (imports EconomyModule)
└── agent.md

achievements/
├── achievements.service.ts      # 30 badges: check, auto-unlock, seed, ranking badges
├── achievements.controller.ts   # 4 endpoints: /achievements/me, /catalog, /seed
├── achievements.module.ts       # Module (imports ProgressionModule)
└── agent.md
```

---

## 📊 XP CURVE — Exponential Growth

```
XP_needed(N) = floor(100 × 1.5^(N-2))
```

| Nivel | XP para siguiente | XP total acumulado |
|-------|-------------------|--------------------|
| 1→2 | 100 | 100 |
| 2→3 | 150 | 250 |
| 3→4 | 225 | 475 |
| 5→6 | 506 | 1,641 |
| 10→11 | 3,844 | 14,349 |
| 20→21 | 24,489 | 133,108 |
| 30→31 | 155,687 | 1,630,610 |
| 50 | MAX | — |

---

## 🎁 RECOMPENSAS POR NIVEL

| Nivel | Título | Coins | Desbloqueo |
|-------|--------|-------|------------|
| 2 | Explorador Novato | 20 | — |
| 3 | Aventurero | 30 | Categoría Aprendizaje |
| 4 | Explorador Nato | 40 | Categoría Aventura |
| 5 | Buscador de Realidades | 50 | Misiones hard |
| 7 | Sembrador de Experiencias | 70 | Categoría Social |
| 10 | Maestro de Misiones | 100 | Misiones especiales |
| 15 | Explorador Avanzado | 150 | Personalización avanzada |
| 20 | Leyenda de Haru | 250 | Todas las categorías |
| 30 | Maestro Absoluto | 500 | Título exclusivo |
| 50 | 🌸-shadow✨ | 1000 | Nivel máximo |

### Cómo funciona addXp
```
1. Calcula newTotalXp = user.totalXp + xpAmount
2. Calcula newLevel = levelFromTotalXp(newTotalXp)
3. Si newLevel > oldLevel → leveledUp
4. Actualiza User.totalXp + User.level
5. Log en ActivityLog (action: 'xp_gained')
6. Si leveledUp → EconomyService.earnCoins(levelReward.coins, 'level_up')
```

---

## 🏆 30 BADGES (AchievementsService)

### Quests (6)
| Code | Icono | Requisito | XP | Coins |
|------|-------|-----------|-----|-------|
| first_quest | 🌱 | 1 quest | 25 | 10 |
| quest_5 | 🔍 | 5 quests | 50 | 25 |
| quest_10 | 🗺️ | 10 quests | 100 | 50 |
| quest_25 | 🧭 | 25 quests | 200 | 100 |
| quest_50 | ⚔️ | 50 quests | 500 | 250 |
| quest_100 | 🏆 | 100 quests | 1000 | 500 |

### Streaks (5)
| Code | Icono | Requisito | XP | Coins |
|------|-------|-----------|-----|-------|
| streak_3 | 📅 | 3 días racha | 30 | 15 |
| streak_7 | 🔥 | 7 días racha | 75 | 40 |
| streak_14 | ⚡ | 14 días racha | 150 | 75 |
| streak_30 | 👑 | 30 días racha | 300 | 150 |
| streak_100 | 💎 | 100 días racha | 1000 | 500 |

### Levels (4)
| Code | Icono | Requisito | XP | Coins |
|------|-------|-----------|-----|-------|
| level_5 | ⭐ | Nivel 5 | 50 | 25 |
| level_10 | 🌟 | Nivel 10 | 100 | 50 |
| level_20 | 💫 | Nivel 20 | 300 | 150 |
| level_50 | 🌸 | Nivel 50 | 2000 | 1000 |

### Categories (7)
| Code | Icono | Requisito | XP | Coins |
|------|-------|-----------|-----|-------|
| nature_5 | 🌿 | 5 nature | 50 | 25 |
| creativity_5 | 🎨 | 5 creativity | 50 | 25 |
| kindness_5 | ❤️ | 5 kindness | 50 | 25 |
| movement_5 | 🏃 | 5 movement | 50 | 25 |
| social_5 | 👥 | 5 social | 50 | 25 |
| adventure_5 | 🗺️ | 5 adventure | 50 | 25 |
| all_categories | 🌈 | 1 de cada categoría | 200 | 100 |

### Special (4)
| Code | Icono | Requisito | XP | Coins |
|------|-------|-----------|-----|-------|
| early_bird | 🌅 | Misión antes de 8am | 30 | 15 |
| night_owl | 🦉 | Misión después de 10pm | 30 | 15 |
| weekend_warrior | ⚔️ | 3 misiones en fin de semana | 75 | 40 |
| collector | 🎒 | 10 badges desbloqueados | 150 | 75 |

### Ranking Badges (10)
Se verifican automáticamente tras completar misión:
- 🏆 Campeón Global (#1) — 500 XP / 250 coins
- 🥇 Top 3 Global — 300 XP / 150 coins
- 🌟 Top 10 Global — 150 XP / 75 coins
- ⭐ Top 50 Global — 75 XP / 40 coins
- 🔥 Rey de la Racha (#1 streak) — 400 XP / 200 coins
- ⚡ Top 3 Rachas — 200 XP / 100 coins
- 🎯 Maestro de Misiones (#1) — 400 XP / 200 coins
- 🏅 Top 3 Misiones — 200 XP / 100 coins
- 👑 Rey Semanal (#1 semana) — 300 XP / 150 coins
- 🎖️ Top 3 Semanal — 150 XP / 75 coins

### Auto-detección
```
checkBadges(userId):
  → Carga stats: quests completed (countByCategory), streak, level, hourOfDay, etc.
  → Para cada badge no desbloqueado:
    ¿Cumple requisito? → crear UserBadge + retorna badge info
```

---

## 🌐 ENDPOINTS

### Progression (3)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /progression/me` | 🔒 | Mi nivel, XP, coins, progress, stats, nextLevel |
| `GET /progression/levels` | 🔒 | Tabla de niveles con XP requirements y rewards |
| `GET /progression/leaderboard` | 🔒 | Ranking (?type=xp\|level\|coins\|streak, ?limit=20) |

### Achievements (4)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /achievements/me` | 🔒 | Mis badges (desbloqueados + bloqueados) |
| `POST /achievements/me/check` | 🔒 | Verificar y desbloquear |
| `GET /achievements/catalog` | 🔒 | Catálogo completo |
| `POST /achievements/seed` | 🌐 | Sembrar 30 badges |

---

## 🔄 INTEGRACIÓN

| Módulo | Cómo se integra |
|--------|-----------------|
| **Quests** | `completeQuest` → addXp + addCoins + checkBadges |
| **Streaks** | Streak multiplier se aplica al XP de la misión |
| **Verification** | Verificación aprobada → quest completada → gamificación |
| **Economy** | Coins ganados aquí se gastan en shop |
| **Rankings** | checkRankingBadges() se ejecuta después de completeQuest |
| **Collection** | checkAndUnlock() se ejecuta después de completeQuest |

---

## 🔑 REGLAS

1. **El backend calcula TODO.** Nunca confiar en el cliente.
2. **XP y coins se calculan en `completeQuest`.** No hay otra forma de ganar XP.
3. **Los badges se verifican automáticamente** después de cada misión.
4. **"No pasa nada 🌱. Tu aventura continúa."** No castigar al usuario.
5. **Las recompensas de nivel son automáticas.** Se otorgan al subir de nivel.
6. **El leaderboard es público.** Cualquier usuario puede verlo.
7. **Logging:** `[ProgressionService|AchievementsService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: XP, niveles, badges, leaderboard, integración con quests | Buffy |
| 2026-08-27 | +10 ranking badges (auto-check after quest completion) | Buffy |
| 2026-09-05 | Fix: streak badges usan longestStreak (antes nunca se otorgaban) | Buffy |
