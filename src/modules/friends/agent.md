# 👥 Friends (Sistema Social) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/friends/`

---

## 📌 PROPÓSITO

Sistema social de **Haru** para conectar usuarios sin convertirse en red social.

**Prioridad:** Haru te hace vivir experiencias en el mundo real, no pasar tiempo en la app.

---

## 🏗️ ARQUITECTURA

```
friends/
├── friends.service.ts            # 20+ methods: search, request, follow, feed, challenges, compare
├── friends.controller.ts         # 22 endpoints bajo /api/friends/
├── friends.module.ts             # Module
└── agent.md
```

---

## 📊 MODELO DE DATOS

```prisma
enum FriendshipStatus { pending, accepted, blocked }
enum ActivityVisibility { public, friends, private }
enum FriendActivityType { quest_completed, level_up, streak_milestone, badge_unlocked, quest_shared, diary_shared, diary_favorited }

Friendship       → requesterId, addresseeId, status, acceptedAt, createdAt
UserFollow       → followerId, followeeId, createdAt (unidireccional)
FriendActivity   → userId, type, details (JSON), visibility
Celebration      → activityId, userId, type (clap/fire/heart/star), createdAt
QuestChallenge   → senderId, receiverId, questId, message?, status, expiresAt (7 días), createdAt
```

---

## 🔄 FLUJOS

### Amistad (bidireccional)
```
A envía solicitud → B
       ↓
B acepta → status: accepted
  o
B rechaza → solicitud eliminada
       ↓
Auto-aceptar: si B ya envió solicitud a A → se acepta automáticamente
```

### Seguimiento (unidireccional)
```
A sigue a B → A ve actividad de B
A deja de seguir → B no es notificado
```

### Reto de misión
```
A envía reto → B (misión + mensaje opcional)
       ↓
B acepta / rechaza
Expira en 7 días
```

---

## ✅ ENDPOINTS (22)

### Buscar (1)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/search?q=` | 🔒 | Buscar usuarios (enriquecido con friendship/follow status) |

### Amistad (7)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/request/:userId` | 🔒 | Enviar solicitud (auto-accept si recíproca) |
| `PATCH /friends/request/:id/accept` | 🔒 | Aceptar solicitud |
| `PATCH /friends/request/:id/decline` | 🔒 | Rechazar solicitud |
| `GET /friends` | 🔒 | Lista de amigos (paginado) |
| `GET /friends/pending` | 🔒 | Solicitudes pendientes (received + sent) |
| `DELETE /friends/:friendId` | 🔒 | Eliminar amigo |
| `POST /friends/block/:userId` | 🔒 | Bloquear usuario (silencioso) |

### Seguimiento (4)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/follow/:userId` | 🔒 | Seguir usuario |
| `DELETE /friends/follow/:userId` | 🔒 | Dejar de seguir |
| `GET /friends/following` | 🔒 | A quién sigo |
| `GET /friends/followers` | 🔒 | Mis seguidores |

### Actividad (2)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/feed` | 🔒 | Feed de actividad (amigos + propio, paginado) |
| `POST /friends/feed/:activityId/celebrate` | 🔒 | Celebrar (👏🔥❤️⭐ toggle) |

### Comparaciones (3)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/compare/streaks` | 🔒 | Comparar rachas con amigos |
| `GET /friends/compare/levels` | 🔒 | Comparar niveles/XP con amigos |
| `GET /friends/compare/missions` | 🔒 | Comparar misiones completadas |

### Compartir (1)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/share/diary/:entryId` | 🔒 | Compartir recuerdo del diario |

### Retos (4)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/challenge/:userId/:questId` | 🔒 | Enviar reto (solo amigos, expira 7d) |
| `GET /friends/challenges` | 🔒 | Ver retos (received + sent) |
| `PATCH /friends/challenge/:id/accept` | 🔒 | Aceptar reto |
| `PATCH /friends/challenge/:id/decline` | 🔒 | Rechazar reto |

### Perfil (1)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/profile/:userId` | 🔒 | Ver perfil de amigo (stats, streak, badges, friendship status) |

---

## 🔑 REGLAS

1. **La amistad es bidireccional.** Ambos deben aceptar.
2. **Auto-aceptar** si ambos enviaron solicitud mutuamente.
3. **El seguimiento es unidireccional.** No necesita aceptación.
4. **Máximo 200 amigos**, 500 following.
5. **No hay chat directo.** Solo interacciones estructuradas.
6. **Retos expiran** en 7 días.
7. **Bloqueo silencioso.** No notifica al bloqueado.
8. **La actividad tiene visibilidad:** public, friends, private.
9. **Celebraciones son toggle:** repetir el mismo tipo lo elimina.
10. **Logging:** `[FriendsService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Friends completo: amistad, follow, feed, celebraciones, comparaciones, retos, share, profile | Buffy |
