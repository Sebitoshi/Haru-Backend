# 🏆 Achievements — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/achievements/`

---

## 📌 PROPÓSITO

Sistema de logros e insignias de **Haru**. 30 badges organizados en 5 categorías.

---

## 🔄 FLUJO

```
Misión completada
       ↓
checkBadges(userId)
       ↓
Revisa 30 badges posibles contra stats del usuario
       ↓
¿Cumple requisito?
├── No → skip
└── Sí →
    ↓
Badge ya desbloqueado?
├── Sí → skip
└── No →
    ↓
Crear UserBadge
       ↓
addXp(badge.xpReward)
       ↓
addCoins(badge.coinsReward)
       ↓
Retornar badge desbloqueado
       ↓
Incluir en respuesta de completeQuest
```

---

## 🏆 BADGES (30)

### 🎯 Quests (6)
| Code | Nombre | Icono | Requisito | XP | Coins |
|------|--------|-------|-----------|-----|-------|
| first_quest | Primera Misión | 🌱 | 1 misión | 25 | 10 |
| quest_5 | Explorador | 🔍 | 5 misiones | 50 | 25 |
| quest_10 | Aventurero | 🗺️ | 10 misiones | 100 | 50 |
| quest_25 | Explorador Avanzado | 🧭 | 25 misiones | 200 | 100 |
| quest_50 | Maestro de Misiones | ⚔️ | 50 misiones | 500 | 250 |
| quest_100 | Leyenda de Haru | 🏆 | 100 misiones | 1000 | 500 |

### 🔥 Streaks (5)
| Code | Nombre | Icono | Requisito | XP | Coins |
|------|--------|-------|-----------|-----|-------|
| streak_3 | Consistente | 📅 | Racha 3 días | 30 | 15 |
| streak_7 | En llamas | 🔥 | Racha 7 días | 75 | 40 |
| streak_14 | Imparable | ⚡ | Racha 14 días | 150 | 75 |
| streak_30 | Dedicación Total | 👑 | Racha 30 días | 300 | 150 |
| streak_100 | Leyenda Ardiente | 💎 | Racha 100 días | 1000 | 500 |

### ⭐ Levels (4)
| Code | Nombre | Icono | Requisito | XP | Coins |
|------|--------|-------|-----------|-----|-------|
| level_5 | Nivel 5 | ⭐ | Nivel 5 | 50 | 25 |
| level_10 | Nivel 10 | 🌟 | Nivel 10 | 100 | 50 |
| level_20 | Nivel 20 | 💫 | Nivel 20 | 300 | 150 |
| level_50 | Nivel 50 — Máximo | 🌸 | Nivel 50 | 2000 | 1000 |

### 🎨 Categories (7)
| Code | Nombre | Icono | Requisito | XP | Coins |
|------|--------|-------|-----------|-----|-------|
| nature_5 | Amante de la Naturaleza | 🌿 | 5 misiones nature | 50 | 25 |
| creativity_5 | Mente Creativa | 🎨 | 5 misiones creativity | 50 | 25 |
| kindness_5 | Corazón Generoso | ❤️ | 5 misiones kindness | 50 | 25 |
| movement_5 | En Movimiento | 🏃 | 5 misiones movement | 50 | 25 |
| social_5 | Mariposa Social | 👥 | 5 misiones social | 50 | 25 |
| adventure_5 | Espíritu Aventurero | 🗺️ | 5 misiones adventure | 50 | 25 |
| all_categories | Explorador Total | 🌈 | 1 de cada categoría | 200 | 100 |

### ✨ Special (4)
| Code | Nombre | Icono | Requisito | XP | Coins |
|------|--------|-------|-----------|-----|-------|
| early_bird | Madrugador | 🌅 | Misión antes de 8am | 30 | 15 |
| night_owl | Búho Nocturno | 🦉 | Misión después de 10pm | 30 | 15 |
| weekend_warrior | Guerrero del Fin de Semana | ⚔️ | 3 misiones en fin de semana | 75 | 40 |
| collector | Coleccionista | 🎒 | 10 badges desbloqueados | 150 | 75 |
| onboarding | Bienvenido a Haru | 👋 | Completar onboarding | 50 | 25 |

---

## 🌐 ENDPOINTS

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /achievements/me` | 🔒 | Mis badges (unlocked + locked) |
| `POST /achievements/me/check` | 🔒 | Verificar y desbloquear |
| `GET /achievements/catalog` | 🔒 | Catálogo completo |
| `POST /achievements/seed` | 🌐 | Sembrar 30 badges |

---

## 🔑 REGLAS

1. **Detección en el backend** después de cada misión completada.
2. **Un badge solo se desbloquea una vez.**
3. **Recompensas transaccionales** al desbloquear (XP + coins).
4. **El badge se crea automáticamente** si no existe en DB al desbloquearse.
5. **El check se ejecuta después de:** completar misión, subir nivel.
6. **Logging:** `[AchievementsService] CheckBadges: userId=xxx, new=N`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: 30 badges, auto-detección, seed, integración con quests | Buffy |
