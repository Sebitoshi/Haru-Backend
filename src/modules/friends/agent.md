# 👥 Friends (Sistema Social) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema social de **Haru** para conectar usuarios sin convertirse en red social.

**Prioridad:** Haru te hace vivir experiencias en el mundo real, no pasar tiempo en la app.

---

## 👥 FUNCIONALIDADES

| Función | Descripción |
|---------|-------------|
| Buscar usuarios | Por username o email |
| Agregar amigos | Enviar/aceptar solicitudes bidireccionales |
| Seguir usuarios | Ver actividad pública sin amistad |
| Ver actividad | Feed de amigos con celebraciones |
| Enviar misiones | Retar amigos con misiones |
| Celebrar logros | Reacciones: 👏 🔥 ❤️ ⭐ |
| Comparar rachas | Ranking de rachas con amigos |
| Comparar niveles | Ranking de XP con amigos |
| Comparar misiones | Ranking de completadas |
| Compartir recuerdos | Compartir diario con amigos |
| Bloquear usuarios | Bloqueo sin notificar |
| Ver perfil amigo | Stats públicas de amigos |

---

## 🔄 FLUJOS

### Amistad
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
B acepta → A ve que B aceptó
B rechaza → A ve que B rechazó
Expira en 7 días
```

---

## 📊 MODELO DE DATOS (Prisma)

```prisma
enum FriendshipStatus { pending, accepted, blocked }
enum ActivityVisibility { public, friends, private }
enum FriendActivityType { quest_completed, level_up, streak_milestone, badge_unlocked, quest_shared, diary_shared, diary_favorited }

Friendship       → requesterId, addresseeId, status, acceptedAt
UserFollow       → followerId, followeeId (unidireccional)
FriendActivity   → userId, type, details (JSON), visibility
Celebration      → activityId, userId, type (clap/fire/heart/star)
QuestChallenge   → senderId, receiverId, questId, message, status, expiresAt
```

---

## ✅ ENDPOINTS (22)

### Buscar
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/search?q=` | 🔒 | Buscar usuarios |

### Amistad
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/request/:userId` | 🔒 | Enviar solicitud |
| `PATCH /friends/request/:id/accept` | 🔒 | Aceptar solicitud |
| `PATCH /friends/request/:id/decline` | 🔒 | Rechazar solicitud |
| `GET /friends` | 🔒 | Lista de amigos |
| `GET /friends/pending` | 🔒 | Solicitudes pendientes |
| `DELETE /friends/:friendId` | 🔒 | Eliminar amigo |
| `POST /friends/block/:userId` | 🔒 | Bloquear usuario |

### Seguimiento
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/follow/:userId` | 🔒 | Seguir usuario |
| `DELETE /friends/follow/:userId` | 🔒 | Dejar de seguir |
| `GET /friends/following` | 🔒 | A quién sigo |
| `GET /friends/followers` | 🔒 | Mis seguidores |

### Actividad
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/feed` | 🔒 | Feed de actividad |
| `POST /friends/feed/:id/celebrate` | 🔒 | Celebrar (👏🔥❤️⭐) |

### Comparaciones
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/compare/streaks` | 🔒 | Comparar rachas |
| `GET /friends/compare/levels` | 🔒 | Comparar niveles |
| `GET /friends/compare/missions` | 🔒 | Comparar misiones |

### Compartir
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/share/diary/:entryId` | 🔒 | Compartir recuerdo |

### Retos
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /friends/challenge/:userId/:questId` | 🔒 | Enviar reto |
| `GET /friends/challenges` | 🔒 | Ver retos |
| `PATCH /friends/challenge/:id/accept` | 🔒 | Aceptar reto |
| `PATCH /friends/challenge/:id/decline` | 🔒 | Rechazar reto |

### Perfil
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /friends/profile/:userId` | 🔒 | Ver perfil de amigo |

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
9. **Logging:** `[FriendsService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Friends: amistad, follow, feed, celebraciones, comparaciones, retos | Buffy |
