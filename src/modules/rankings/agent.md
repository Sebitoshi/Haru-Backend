# 🌎 Rankings — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/rankings/`

---

## 📌 PROPÓSITO

Rankings de **Haru** para que diferentes tipos de usuarios puedan destacar.

**No queremos que siempre ganen los mismos.** Por eso existen rankings semanales y por categoría.

---

## 🏗️ ARQUITECTURA

```
rankings/
├── rankings.service.ts              # Score calculation, position tracking, weekly reset
├── rankings.controller.ts           # 11 endpoints bajo /api/rankings/
├── ranking-notification.service.ts  # Notifications + ranking badges after quest completion
├── rankings.module.ts               # Module
└── agent.md
```

---

## 🏆 TIPOS DE RANKING

| Ranking | Score |
|---------|-------|
| 🌎 Global | XP total |
| 👥 Amigos | XP en período |
| 🔥 Racha | Días consecutivos |
| ⭐ XP | XP ganado en período |
| 🎯 Misiones | Count de completadas |
| 🎨 Categoría | Misiones en categoría específica |

### Períodos
- **weekly** — Desde el lunes de esta semana (reset automático)
- **monthly** — Desde el primer día del mes
- **all_time** — Desde siempre

---

## 📊 RESPONSE FORMAT

```json
{
  "type": "global",
  "period": "weekly",
  "entries": [{ "rank": 1, "userId", "username", "avatarUrl", "level", "score", "isMe": false }],
  "myRank": { "rank": 15, "userId", "username", "score", "isMe": true },
  "total": 150,
  "periodLabel": "Semana del 25 ago",
  "periodStart": "2026-08-25T00:00:00Z",
  "periodEnd": "2026-08-30T18:00:00Z",
  "updatedAt": "2026-08-30T18:00:00Z"
}
```

---

## ✅ ENDPOINTS (11)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /rankings/global` | 🔒 | Ranking global por XP |
| `GET /rankings/friends` | 🔒 | Ranking entre amigos |
| `GET /rankings/streak` | 🔒 | Ranking por racha |
| `GET /rankings/xp` | 🔒 | Ranking por XP en período |
| `GET /rankings/missions` | 🔒 | Ranking por misiones completadas |
| `GET /rankings/category/:category` | 🔒 | Ranking por categoría |
| `GET /rankings/me` | 🔒 | Resumen de mis posiciones en todos los rankings |
| `GET /rankings/categories` | 🌐 | Categorías disponibles |
| `GET /rankings/notifications` | 🔒 | Notificaciones de ranking |
| `PATCH /rankings/notifications/read` | 🔒 | Marcar como leídas |

Todos aceptan `?period=weekly|monthly|all_time` y `?limit=50`.

---

## 🏆 BADGES DE RANKING (10 — verificados automáticamente)

| Badge | Condición | XP | Coins |
|-------|-----------|-----|-------|
| 🏆 Campeón Global | #1 global | 500 | 250 |
| 🥇 Top 3 Global | Top 3 global | 300 | 150 |
| 🌟 Top 10 Global | Top 10 global | 150 | 75 |
| ⭐ Top 50 Global | Top 50 global | 75 | 40 |
| 🔥 Rey de la Racha | #1 racha | 400 | 200 |
| ⚡ Top 3 Rachas | Top 3 racha | 200 | 100 |
| 🎯 Maestro de Misiones | #1 misiones | 400 | 200 |
| 🏅 Top 3 Misiones | Top 3 misiones | 200 | 100 |
| 👑 Rey Semanal | #1 semana | 300 | 150 |
| 🎖️ Top 3 Semanal | Top 3 semana | 150 | 75 |

---

## 📲 NOTIFICACIONES (generadas automáticamente)

| Tipo | Condición | Ejemplo |
|------|-----------|---------|
| position_up | Sube 3+ posiciones | "Pasaste del #15 al #8 — ¡7 arriba! 🔥" |
| position_down | Baja 5+ posiciones | "Bajaste del #5 al #12. ¡Una misión te sube! 💪" |
| badge_unlocked | Desbloquea badge de ranking | "🏆 ¡Nueva insignia! Campeón Global" |
| top_3 | Entra al top 3 | "🥇 ¡Top 1! Estás en el puesto #1" |
| weekly_reset | Reset semanal | "Ranking semanal reiniciado" |

---

## 🔑 REGLAS

1. **Los rankings semanales resetean** cada lunes.
2. **El score lo calcula el backend.** Nunca confiar en el cliente.
3. **Los rankings son públicos** pero se puede ocultar el perfil (opt-out).
4. **Anti-abuse:** combinar con sistema de confianza.
5. **Solo mostrar top 50** por defecto. El usuario ve su posición exacta.
6. **Múltiples categorías** para que diferentes perfiles destaquen.
7. **Logging:** `[RankingsService|RankingNotificationService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-30 | Rankings: global, friends, streak, xp, missions, category, weekly, notifications | Buffy |
| 2026-08-30 | +10 ranking badges + ranking notifications after quest completion | Buffy |
