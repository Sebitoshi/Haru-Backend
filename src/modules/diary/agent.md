# 📖 Diary (Diario de Recuerdos) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Cada misión importante completada en **Haru** se convierte en un **recuerdo** dentro del diario personal del usuario.

Con el tiempo, Haru construye una **historia personal** de experiencias.

---

## 🔄 FLUJO

```
Misión verificada exitosamente (status: verified)
       ↓
DiaryService.createFromQuestCompletion() se ejecuta automáticamente
       ↓
Se crea DiaryEntry con:
  - Foto de verificación → foto del recuerdo
  - Título auto-generado: "🌿 Nombre de la misión"
  - Categoría, XP, Coins de la misión
       ↓
El usuario puede editar:
  - título, descripción/reflexión
  - estado de ánimo
  - marcar como favorito
  - agregar tags
       ↓
El diario se construye con el tiempo
```

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
| xpEarned | Int | XP ganada en la misión |
| coinsEarned | Int | Coins ganadas en la misión |
| tags | String[] | Tags custom del usuario |
| isFavorite | Boolean | Marcado como favorito |

---

## 📊 MODELO DE DATOS (Prisma)

```prisma
enum DiaryMood {
  amazing    // 🤩
  happy      // 😊
  calm       // 😌
  tired      // 😴
  reflective // 🤔
}

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

## ✅ ENDPOINTS (11)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/diary/entries` | POST | Crear entrada manual |
| `/api/diary/entries` | GET | Listar entradas (con filtros) |
| `/api/diary/entries/:id` | GET | Ver entrada por ID |
| `/api/diary/entries/:id` | PATCH | Editar entrada |
| `/api/diary/entries/:id/favorite` | PATCH | Toggle favorito |
| `/api/diary/entries/:id` | DELETE | Ocultar entrada (soft delete) |
| `/api/diary/favorites` | GET | Ver favoritos |
| `/api/diary/category/:category` | GET | Por categoría |
| `/api/diary/calendar/:year/:month` | GET | Vista calendario |
| `/api/diary/stats` | GET | Estadísticas del diario |
| `/api/diary/search?q=` | GET | Buscar entradas |
| `/api/diary/timeline` | GET | Timeline estilo Instagram (cursor pagination) |
| `/api/diary/timeline/stats` | GET | Stats del timeline (streaks, heatmap, más activo) |
| `/api/diary/map` | GET | Vista de mapa con clustering automático |
| `/api/diary/map/cluster` | GET | Expandir cluster a entries individuales |

---

## 📱 TIMELINE (Instagram-style)

Cursor-based pagination agrupado por mes:

```
GET /api/diary/timeline?limit=10
→ sections: [
    {
      key: "2026-08",
      label: "agosto de 2026",
      entries: [...],
      count: 5,
      totalXp: 125
    }
  ],
  nextCursor: "entry-id-abc",
  hasMore: true
```

Para cargar más:
```
GET /api/diary/timeline?cursor=entry-id-abc&limit=10
```

Cada entry incluye: `dayOfWeek`, `dayOfMonth`, `timeFormatted`.

---

## 🗺️ MAPA (con clustering)

El mapa usa **clustering grid-based O(n)** que agrupa markers cercanos según el zoom:

| Zoom | Cluster radius | Equivalente |
|------|---------------|-------------|
| 1-3 | 100 km | Vista país |
| 4-6 | 20 km | Vista ciudad |
| 7-9 | 5 km | Vista distrito |
| 10-12 | 1 km | Vista calle |
| 13-15 | 300 m | Vista barrio |
| 16+ | 0 (sin cluster) | Vista edificio |

```
GET /api/diary/map?zoom=7
→ items: [
    {
      type: "cluster",
      id: "cluster-4.7100:-74.0700",
      count: 5,
      center: { lat: 4.71, lng: -74.07 },
      thumbnailPhoto: "https://...",
      primaryCategory: "nature",
      primaryCategoryEmoji: "🌿",
      categoryDistribution: [{ category: "nature", count: 3 }, ...],
      totalXp: 125,
      dateRange: { from: "2026-08-01", to: "2026-08-15" },
      entryIds: ["id1", "id2", "id3", "id4", "id5"]
    },
    {
      type: "marker",
      id: "abc",
      title: "📸 Captura el Momento",
      location: { lat: 4.65, lng: -74.10 }
    }
  ],
  stats: {
    totalMarkers: 12,
    clusterCount: 2,
    singleCount: 5,
    clusterRadiusKm: 5
  }
```

Para expandir un cluster:
```
GET /api/diary/map/cluster?ids=id1,id2,id3,id4,id5
→ entries: [...], count: 5
```

---

## 🔥 TIMELINE STATS

```
GET /api/diary/timeline/stats
→ currentStreakDays: 5,
  longestStreakDays: 12,
  mostActiveDay: { name: "Sábado", entries: 8, percentage: 22 },
  monthlyActivity: [{ month: "2026-08", count: 15, xp: 375 }],
  heatmap: { "2026-08-01": 2, "2026-08-03": 1, ... }
```

---

## 🔍 FILTROS DISPONIBLES

| Filtro | Tipo | Ejemplo |
|--------|------|---------|
| category | string | `?category=nature` |
| mood | string | `?mood=happy` |
| isFavorite | boolean | `?isFavorite=true` |
| startDate | ISO date | `?startDate=2026-08-01` |
| endDate | ISO date | `?endDate=2026-08-31` |
| search | string | `?search=fotografía` |
| page | number | `?page=2` |
| limit | number | `?limit=10` |

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
