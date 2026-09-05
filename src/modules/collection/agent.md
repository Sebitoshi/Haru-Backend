# 🎒 Collection (Colección) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema de objetos coleccionables desbloqueables en **Haru**. Da sensación de progreso visual.

**No dan ventajas.** Son decorativos y coleccionables.

---

## 🏅 TIPOS DE COLECCIONABLES (35 items)

### 🌱 Plantas (6)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| plant_sprout | Primer Brote | 1 misión | common |
| plant_daisy | Margarita | 5 misiones | common |
| plant_fern | Helecho | 15 misiones | uncommon |
| plant_cactus | Cactus Rey | 30 misiones | rare |
| plant_bonsai | Bonsai Sabio | 50 misiones | epic |
| plant_tree_of_life | Árbol de la Vida | 100 misiones | legendary |

### 🏅 Insignias (8)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| badge_nature_10 | Explorador Verde | 10 naturaleza | uncommon |
| badge_creativity_10 | Alma Creativa | 10 creatividad | uncommon |
| badge_kindness_10 | Corazón de Oro | 10 bondad | uncommon |
| badge_movement_10 | Atleta Haru | 10 movimiento | uncommon |
| badge_social_10 | Alma Social | 10 social | uncommon |
| badge_photography_10 | Ojo de Águila | 10 fotografía | uncommon |
| badge_all_categories | Explorador Total | 1 de cada categoría | rare |
| badge_perfectionist | Perfeccionista | 5 misiones hard | rare |

### 🎒 Objetos (8)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| obj_compass | Brújula | 3 misiones | common |
| obj_magnifying_glass | Lupa | 8 misiones | common |
| obj_camera | Cámara Vintage | 5 fotografía | uncommon |
| obj_journal | Diario de Aventuras | 10 entradas diario | uncommon |
| obj_tent | Carpa Viajera | 25 misiones | rare |
| obj_binoculars | Prismáticos | Racha 14 días | rare |
| obj_backpack | Mochila Legendaria | Nivel 20 | epic |
| obj_star_map | Mapa Estelar | 75 misiones | legendary |

### 📮 Postales (6)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| postcard_first_quest | Postal: Primer Paso | 1 misión | common |
| postcard_nature | Postal: Bosque Encantado | 5 naturaleza | uncommon |
| postcard_sunset | Postal: Atardecer Dorado | 10 misiones | uncommon |
| postcard_summit | Postal: Cumbre Alcanzada | 3 hard | rare |
| postcard_ocean | Postal: Mar Infinito | Racha 7 días | rare |
| postcard_stars | Postal: Noche Estrellada | 40 misiones | epic |

### ⭐ Especiales (6)
| Code | Nombre | Requisito | Rareza |
|------|--------|-----------|--------|
| special_founding | Pionero de Haru | Primeros 1000 usuarios | legendary |
| special_streak_30 | Llama Eterna | Racha 30 días | legendary |
| special_level_25 | Maestro Explorador | Nivel 25 | epic |
| special_speedrun | Velocista | 5 misiones en 1 día | rare |
| special_night_owl | Búho nocturno | Misión después de medianoche | uncommon |
| special_early_bird | Madrugador | Misión antes de 7am | uncommon |

---

## 🔄 FLUJO DE DESBLOQUEO

```
Misión completada
       ↓
collection.checkAndUnlock(userId, 'quest')
       ↓
Carga stats del usuario (quests, streak, level, etc.)
       ↓
Para cada coleccionable no desbloqueado:
  ¿Cumple el requisito?
  ├── No → skip
  └── Sí → crear UserCollectible + recompensas
       ↓
Return: newUnlocks[] con los nuevos items
       ↓
Se agrega a la respuesta de completeQuest
```

---

## ✅ ENDPOINTS (7)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /collection/catalog` | 🔒 | Catálogo completo con status de desbloqueo |
| `GET /collection/me` | 🔒 | Mis coleccionables (filtro por type) |
| `GET /collection/me/unseen` | 🔒 | Count de no vistos |
| `PATCH /collection/me/:id/seen` | 🔒 | Marcar como visto |
| `PATCH /collection/me/seen-all` | 🔒 | Marcar todos como vistos |
| `GET /collection/stats` | 🔒 | Estadísticas de colección |
| `POST /collection/seed` | 🌐 | Sembrar catálogo |

---

## 🔑 REGLAS

1. **Desbloqueo automático** al cumplir requisito.
2. **Cada item solo se obtiene una vez.**
3. **Rareza afecta disponibilidad.** Algunos solo en eventos.
4. **Backend valida todos los requisitos.**
5. **No dan ventajas.** Solo decorativos.
6. **Tracking de vistos** para popup de nueva adquisición.
7. **Logging:** `[CollectionService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Collection: 35 items, 5 tipos, desbloqueo automático | Buffy |
| 2026-09-05 | +`unlockRandomCollectible()` (caja misteriosa): desbloquea un coleccionable aleatorio no poseído con rarity ≥ minRarity | Buffy |
