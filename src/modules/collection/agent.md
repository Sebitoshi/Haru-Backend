# 🎒 Collection (Colección) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/collection/`

---

## 📌 PROPÓSITO

Sistema de objetos coleccionables desbloqueables en **Haru**. 35 items en 5 tipos. Da sensación de progreso visual. **No dan ventajas.**

---

## 🏗️ ARQUITECTURA

```
collection/
├── collection.service.ts         # 35 collectibles: check, unlock, seed, mystery box, stats
├── collection.controller.ts      # 7 endpoints bajo /api/collection/
├── collection.module.ts          # Module
└── agent.md
```

---

## 🏅 35 COLECCIONABLES (5 tipos)

### 🌱 Plantas (6)
| Code | Nombre | Requisito | Rareza | XP | Coins |
|------|--------|-----------|--------|-----|-------|
| plant_sprout | Primer Brote | 1 quest | common | 10 | 5 |
| plant_daisy | Margarita | 5 quests | common | 20 | 10 |
| plant_fern | Helecho | 15 quests | uncommon | 40 | 20 |
| plant_cactus | Cactus Rey | 30 quests | rare | 80 | 40 |
| plant_bonsai | Bonsai Sabio | 50 quests | epic | 150 | 75 |
| plant_tree_of_life | Árbol de la Vida | 100 quests | legendary | 500 | 250 |

### 🏅 Insignias (8)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| badge_nature_10 | Explorador Verde | 10 nature | uncommon |
| badge_creativity_10 | Alma Creativa | 10 creativity | uncommon |
| badge_kindness_10 | Corazón de Oro | 10 kindness | uncommon |
| badge_movement_10 | Atleta Haru | 10 movement | uncommon |
| badge_social_10 | Alma Social | 10 social | uncommon |
| badge_photography_10 | Ojo de Águila | 10 photography | uncommon |
| badge_all_categories | Explorador Total | 1 de cada categoría (9) | rare |
| badge_perfectionist | Perfeccionista | 5 hard quests | rare |

### 🎒 Objetos (8)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| obj_compass | Brújula | 3 quests | common |
| obj_magnifying_glass | Lupa | 8 quests | common |
| obj_camera | Cámara Vintage | 5 photography | uncommon |
| obj_journal | Diario de Aventuras | 10 diary entries | uncommon |
| obj_tent | Carpa Viajera | 25 quests | rare |
| obj_binoculars | Prismáticos | Streak 14 días | rare |
| obj_backpack | Mochila Legendaria | Nivel 20 | epic |
| obj_star_map | Mapa Estelar | 75 quests | legendary |

### 📮 Postales (6)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| postcard_first_quest | Postal: Primer Paso | 1 quest | common |
| postcard_nature | Postal: Bosque Encantado | 5 nature | uncommon |
| postcard_sunset | Postal: Atardecer Dorado | 10 quests | uncommon |
| postcard_summit | Postal: Cumbre Alcanzada | 3 hard | rare |
| postcard_ocean | Postal: Mar Infinito | Streak 7 días | rare |
| postcard_stars | Postal: Noche Estrellada | 40 quests | epic |

### ⭐ Especiales (7)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| special_founding | Pionero de Haru | Primeros 1000 usuarios | legendary |
| special_streak_30 | Llama Eterna | Streak 30 días | legendary |
| special_level_25 | Maestro Explorador | Nivel 25 | epic |
| special_speedrun | Velocista | 5 misiones en 1 día | rare |
| special_night_owl | Búho nocturno | Misión después de medianoche | uncommon |
| special_early_bird | Madrugador | Misión antes de 7am | uncommon |

---

## 🔄 FLUJO DE DESBLOQUEO

```
Misión completada (completeQuest)
       ↓
collection.checkAndUnlock(userId, 'quest')
       ↓
Carga stats: quests, streak, level, categories, hard quests, diary entries, early adopter
       ↓
Para cada coleccionable no desbloqueado:
  ¿Cumple el requisito? (switch por requirement.type)
  ├── No → skip
  └── Sí → crear UserCollectible + retorna unlock info
       ↓
Return: newUnlocks[] → se agrega a respuesta de completeQuest
```

### Requirement types
- `quests_completed` — total quests ≥ value
- `category_quests` — quests in category ≥ value
- `all_categories` — unique categories ≥ 9
- `hard_quests` — hard difficulty quests ≥ value
- `streak` — longestStreak ≥ value
- `current_streak` — currentStreak ≥ value
- `level` — user.level ≥ value
- `diary_entries` — diary entries ≥ value
- `early_adopter` — total users ≤ 1000
- `quests_in_day` — quests completed today ≥ value
- `early_morning_quest` — quest completed 5-7am
- `late_night_quest` — quest completed 0-5am

---

## 🎁 MYSTERY BOX (unlockRandomCollectible)

```
POST /shop/buy/mystery_box
       ↓
EconomyService.buyItem() → spendCoins(600)
       ↓
applyItemEffect() → case 'mystery_collectible'
       ↓
CollectionService.unlockRandomCollectible(userId, 'rare', 'purchase')
       ↓
Filtra: active, rarity ≥ rare, no owned
       ↓
Pick random → crear UserCollectible → retorna collectible info
```

---

## 🌐 ENDPOINTS (7)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /collection/catalog` | 🔒 | Catálogo completo con status de desbloqueo (agrupado por tipo) |
| `GET /collection/me` | 🔒 | Mis coleccionables (?type, ?unseen=true) |
| `GET /collection/me/unseen` | 🔒 | Count de no vistos |
| `PATCH /collection/me/:collectibleId/seen` | 🔒 | Marcar como visto |
| `PATCH /collection/me/seen-all` | 🔒 | Marcar todos como vistos |
| `GET /collection/stats` | 🔒 | Estadísticas: byType, byRarity, recentUnlocks, percentage |
| `POST /collection/seed` | 🌐 | Sembrar 35 coleccionables |

---

## 🔑 REGLAS

1. **Desbloqueo automático** al cumplir requisito (en completeQuest).
2. **Cada item solo se obtiene una vez.**
3. **Rareza afecta disponibilidad.** Mystery box: solo rare+.
4. **Backend valida todos los requisitos.**
5. **No dan ventajas.** Solo decorativos/coleccionables.
6. **Tracking de vistos** para popup de nueva adquisición.
7. **Logging:** `[CollectionService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Collection: 35 items, 5 tipos, desbloqueo automático | Buffy |
| 2026-09-05 | +`unlockRandomCollectible()` (mystery box): desbloquea coleccionable aleatorio no poseído con rarity ≥ minRarity | Buffy |
