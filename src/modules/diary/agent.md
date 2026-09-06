# 📖 Diary (Diario de Recuerdos) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/diary/`

---

## 📌 PROPÓSITO

Cada misión importante completada en **Haru** se convierte en un **recuerdo** dentro del diario personal. Con el tiempo, Haru construye una **historia personal** de experiencias.

---

## 🏗️ ARQUITECTURA

```
diary/
├── diary.service.ts              # CRUD, auto-create, timeline, map, calendar, stats, search
├── diary.controller.ts           # 15 endpoints bajo /api/diary/
├── diary.module.ts               # Module
└── agent.md
```

---

## 🔄 FLUJO DE AUTO-CREACIÓN

```
Misión verificada exitosamente (VerificationService)
       ↓
DiaryService.createFromQuestCompletion() se ejecuta automáticamente
       ↓
Crea DiaryEntry con:
  - Foto de verificación → foto del recuerdo
  - Título auto-generado: "🌿 Nombre de la misión"
  - Categoría, XP, Coins de la misión
  - Location GPS (si disponible)
       ↓
El usuario puede editar después
```

### Duplicate prevention
No se crea doble entrada para la misma `userQuestId`.

---

## 📸 CONTENIDO DE UN RECUERDO

| Campo | Tipo | Descripción |
|-------|------|-------------|
| title | String | Auto-generado o editado por usuario |
| description | String? | Reflexión del usuario |
| photoUrl | String? | Cloudinary URL de la verificación |
| location | JSON? | { lat, lng, name? } |
| mood | Enum? | amazing 🤩, happy 😊, calm 😌, tired 😴, reflective 🤔 |
| category | String? | Categoría de la misión |
| xpEarned | Int | XP ganada |
| coinsEarned | Int | Coins ganadas |
| tags | String[] | Tags custom del usuario |
| isFavorite | Boolean | Marcado como favorito |
| isHidden | Boolean | Soft delete |

---

## 📊 MODELO DE DATOS

```prisma
enum DiaryMood { amazing, happy, calm, tired, reflective }

model DiaryEntry {
  id, userId, questId?, userQuestId?
  title, description?, photoUrl?
  location (JSON), mood?
  category?, xpEarned, coinsEarned
  tags (String[]), isFavorite, isHidden
  sharedAt?, createdAt, updatedAt
}
```

---

## 🌐 ENDPOINTS (15)

### CRUD
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /api/diary/entries` | 🔒 | Crear entrada manual |
| `GET /api/diary/entries` | 🔒 | Listar entradas (filtros: category, mood, isFavorite, startDate, endDate, search, page, limit) |
| `GET /api/diary/entries/:id` | 🔒 | Ver entrada por ID |
| `PATCH /api/diary/entries/:id` | 🔒 | Editar entrada |
| `PATCH /api/diary/entries/:id/favorite` | 🔒 | Toggle favorito |
| `DELETE /api/diary/entries/:id` | 🔒 | Ocultar entrada (soft delete) |

### Vistas
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/diary/favorites` | 🔒 | Ver favoritos |
| `GET /api/diary/category/:category` | 🔒 | Por categoría |
| `GET /api/diary/calendar/:year/:month` | 🔒 | Vista calendario |
| `GET /api/diary/stats` | 🔒 | Estadísticas del diario |
| `GET /api/diary/search?q=` | 🔒 | Buscar entradas |
| `GET /api/diary/timeline` | 🔒 | Timeline estilo Instagram (cursor pagination agrupado por mes) |
| `GET /api/diary/timeline/stats` | 🔒 | Stats del timeline (streaks, heatmap, más activo) |
| `GET /api/diary/map` | 🔒 | Vista de mapa con clustering automático |
| `GET /api/diary/map/cluster` | 🔒 | Expandir cluster a entries individuales |

---

## 📱 TIMELINE (Instagram-style)

Cursor-based pagination agrupado por mes:
```json
{
  "sections": [{
    "key": "2026-08",
    "label": "agosto de 2026",
    "entries": [...],
    "count": 5,
    "totalXp": 125
  }],
  "nextCursor": "entry-id-abc",
  "hasMore": true
}
```

Para cargar más: `GET /api/diary/timeline?cursor=entry-id-abc&limit=10`

---

## 🗺️ MAPA (clustering grid-based O(n))

| Zoom | Cluster radius | Equivalente |
|------|---------------|-------------|
| 1-3 | 100 km | Vista país |
| 4-6 | 20 km | Vista ciudad |
| 7-9 | 5 km | Vista distrito |
| 10-12 | 1 km | Vista calle |
| 13-15 | 300 m | Vista barrio |
| 16+ | 0 (sin cluster) | Vista edificio |

---

## 🔥 TIMELINE STATS

```json
{
  "currentStreakDays": 5,
  "longestStreakDays": 12,
  "mostActiveDay": { "name": "Sábado", "entries": 8, "percentage": 22 },
  "monthlyActivity": [{ "month": "2026-08", "count": 15, "xp": 375 }],
  "heatmap": { "2026-08-01": 2, "2026-08-03": 1 }
}
```

---

## 🔑 REGLAS

1. **El recuerdo se crea automáticamente** al verificar una misión.
2. **El usuario puede editar** título, descripción, estado de ánimo, tags.
3. **No se puede eliminar** un recuerdo (solo ocultar con soft delete).
4. **Las fotos se almacenan en Cloudinary** (URL de la verificación).
5. **El diario es privado** por defecto.
6. **El diario alimenta la memoria de Boti** para recomendaciones contextuales.
7. **Duplicate prevention:** No se crea doble entrada para la misma userQuest.
8. **Logging:** `[DiaryService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Diary: CRUD, filtros, calendario, stats, auto-create desde verificación | Buffy |
| 2026-09-05 | +Timeline (Instagram-style cursor pagination) + Timeline Stats (heatmap, streaks) | Buffy |
| 2026-09-05 | +Map view (clustering grid-based O(n)) + Cluster expand | Buffy |
| 2026-09-05 | +Search + Category view + Favorites view | Buffy |
