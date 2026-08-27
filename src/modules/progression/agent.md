# 🏆 Gamificación — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/progression/` + `src/modules/achievements/`

---

## 📌 PROPÓSITO

Sistema de gamificación de **Haru**: XP, niveles, insignias, logros y recompensas.

---

## 🔄 EL FLUJO COMPLETO DE GAMIFICACIÓN

```
Usuario acepta misión
       ↓
Usuario realiza la actividad en el mundo real
       ↓
Usuario sube evidencia (foto/video/audio/texto/ubicación)
       ↓
IA analiza la evidencia (Groq Vision / Whisper / Geofence)
       ↓
Verificación aprobada → Misión completada
       ↓
┌──────────────────────────────────────────────────────┐
│ 🎯 GAMIFICACIÓN SE EJECUTA                          │
│                                                      │
│ 1. XP Calculado                                      │
│    baseXP × streakMultiplier = finalXP               │
│    (easy:10, normal:25, hard:50, special:100)         │
│    (streak: +10% por día, max +50%)                  │
│                                                      │
│ 2. XP Creditado al usuario                           │
│    User.totalXp += finalXP                           │
│                                                      │
│ 3. Level Calculado                                   │
│    XP curve: 100 × 1.5^(level-2)                    │
│    Si User.level subió → Level Up!                   │
│    → Recompensa: coins bonus por nivel               │
│                                                      │
│ 4. Coins Creditados                                  │
│    baseCoins × streakMultiplier = finalCoins         │
│    User.totalCoins += finalCoins                     │
│                                                      │
│ 5. Streak Actualizado                                │
│    ¿Actividad consecutiva? → streak++                │
│    ¿Racha rota? → ¿Tiene protección? → usa 1        │
│    Si no → "No pasa nada 🌱. Tu aventura continúa"  │
│                                                      │
│ 6. Badges Verificados                                │
│    Se revisan TODOS los badges posibles              │
│    Si cumple requisito → badge desbloqueado          │
│    → Recompensa: XP + coins del badge                │
│                                                      │
│ 7. Respuesta al usuario                              │
│    { rewards, progression, streak, newBadges }       │
└──────────────────────────────────────────────────────┘
```

---

## 📊 XP Y NIVELES

### Curva de XP

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

**Fórmula:** `XP_needed(N) = 100 × 1.5^(N-2)`

### Fuentes de XP

| Fuente | XP base | Multiplier |
|--------|---------|------------|
| Misión easy | 10 | × streak |
| Misión normal | 25 | × streak |
| Misión hard | 50 | × streak |
| Misión special | 100 | × streak |
| Streak milestone | 30-3000 | — |
| Badge desbloqueado | 25-2000 | — |
| Login diario | 5 | — |
| Onboarding | 50 | — |

### Streak Multiplier
```
0 días → ×1.0
3 días → ×1.3 (+30%)
5 días → ×1.5 (+50%) ← máximo
```

### Recompensas por Nivel

| Nivel | Título | Coins | Desbloqueo |
|-------|--------|-------|------------|
| 2 | Explorador Novato | 20 | — |
| 3 | Aventurero | 30 | Categoría Aprendizaje |
| 5 | Buscador de Realidades | 50 | Misiones hard |
| 7 | Sembrador de Experiencias | 70 | Categoría Social |
| 10 | Maestro de Misiones | 100 | Misiones especiales |
| 15 | Explorador Avanzado | 150 | Personalización avanzada |
| 20 | Leyenda de Haru | 250 | Todas las categorías |
| 50 | 🌸-shadow✨ | 1000 | Nivel máximo |

---

## 🏆 BADGES / INSIGNIAS

### Categorías de badges

| Categoría | Ejemplos | Requisito |
|-----------|----------|-----------|
| 🎯 quests | Primera Misión, Explorador, Leyenda | Completar X misiones |
| 🔥 streaks | En llamas, Imparable, Dedicación | Racha de X días |
| ⭐ levels | Nivel 5, 10, 20, 50 | Alcanzar nivel X |
| 🎨 categories | Amante de la Naturaleza, Mente Creativa | X misiones en categoría |
| ✨ special | Madrugador, Búho Nocturno, Coleccionista | Condiciones especiales |

### Badges seed (30 badges)

```
POST /api/achievements/seed
→ Crea 30 badges en la base de datos
```

### Auto-detección

Después de cada misión completada:
```
checkBadges(userId)
  → Revisa todos los badges posibles
  → Desbloquea los que cumple
  → Otorga XP + coins del badge
  → Retorna nuevos badges desbloqueados
```

---

## 🌐 ENDPOINTS

### Progression (`/api/progression`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /progression/me` | 🔒 | Mi nivel, XP, coins, progreso |
| `GET /progression/levels` | 🔒 | Tabla de niveles con recompensas |
| `GET /progression/leaderboard` | 🔒 | Ranking (xp/level/coins/streak) |

### Achievements (`/api/achievements`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /achievements/me` | 🔒 | Mis badges (desbloqueados + bloqueados) |
| `POST /achievements/me/check` | 🔒 | Verificar y desbloquear nuevos badges |
| `GET /achievements/catalog` | 🔒 | Catálogo completo de badges |
| `POST /achievements/seed` | 🌐 | Sembrar 30 badges |

---

## 📊 MODELO DE DATOS

```
User
├── level: Int (default 1)
├── totalXp: Int (default 0)
├── totalCoins: Int (default 0)

Badge
├── id, code (unique), name, description, icon
├── category, requirement (Json)
├── xpReward, coinsReward

UserBadge
├── userId, badgeId (unique)
├── unlockedAt

ActivityLog
├── action: 'xp_gained' → { amount, source, oldTotal, newTotal, leveledUp }
├── action: 'coins_gained' → { amount, source, newTotal }
├── action: 'coins_spent' → { amount, source, newTotal }
```

---

## 🔑 REGLAS

1. **El backend calcula TODO.** Nunca confiar en el cliente.
2. **XP y coins se calculan en `completeQuest`.** No hay otra forma de ganar XP.
3. **Los badges se verifican automáticamente** después de cada misión.
4. **"No pasa nada 🌱. Tu aventura continúa."** No castigar al usuario por perder racha.
5. **Las recompensas de nivel son automáticas.** Se otorgan al subir de nivel.
6. **El leaderboard es público.** Cualquier usuario puede verlo.
7. **Logging:** `[ProgressionService] Operation: details`
8. **Logging:** `[AchievementsService] CheckBadges: userId=xxx, new=3`

---

## 📋 INTEGRACIÓN CON OTROS MÓDULOS

| Módulo | Cómo se integra |
|--------|-----------------|
| **Quests** | `completeQuest` → addXp + addCoins + checkBadges |
| **Streaks** | Streak multiplier se aplica al XP de la misión |
| **Verification** | Verificación aprobada → quest completada → gamificación |
| **Economy** | Coins ganados aquí se gastan en shop |
| **Shop** | Compras gastan coins (spendCoins) |
| **Admin** | Ve stats de progreso de todos los usuarios |

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: XP, niveles, badges, leaderboard, integración con quests | Buffy |
