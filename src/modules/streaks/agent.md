# 🔥 Streaks — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/streaks/`

---

## ✅ LO QUE SE IMPLEMENTÓ

### Sistema de Rachas

| Feature | Descripción |
|---------|-------------|
| **Tracking automático** | Se registra cada vez que se completa una misión |
| **Días consecutivos** | Cuenta días seguidos con actividad |
| **Auto-detección de racha rota** | Detecta si pasó más de 1 día sin actividad |
| **Streak Protection** | Ítem comprable que protege 1 día de racha perdida |
| **Milestones** | Recompensas en 3, 7, 14, 21, 30, 50, 100, 365 días |
| **Historial / Calendario** | Vista de actividad de los últimos 30 días |

### Streak Protection

```
🛡️ PROTECCIÓN DE RACHA

¿Qué hace?
- Protege 1 día de racha si se pierde actividad
- Se puede comprar por 200 Coins
- Se usa automáticamente cuando la racha está rota (1 día)
- También se puede usar manualmente con POST /streaks/me/protect

¿Cómo funciona?
1. Usuario pierde 1 día de actividad
2. Al completar misión, el sistema detecta racha rota
3. Si tiene protecciones → usa 1 → racha se mantiene
4. Si no tiene → racha se reinicia a 1

Límite: Solo protege 1 día deausencia (no 2+ días)
```

### Endpoints (6)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/streaks/me` | 🔒 | Info de racha: actual, mayor, activa, protecciones, milestones |
| `POST /api/streaks/me/record` | 🔒 | Registrar actividad (auto tras quest complete) |
| `POST /api/streaks/me/protect` | 🔒 | Usar 1 protección (si racha rota 1 día) |
| `POST /api/streaks/me/buy-protection` | 🔒 | Comprar 1 protección (200 Coins) |
| `GET /api/streaks/me/history` | 🔒 | Calendario de actividad (30 días) |
| `GET /api/streaks/milestones` | 🔒 | 8 milestones con recompensas |

### Milestones

| Días | Recompensa | Mensaje |
|------|-----------|---------|
| 3 | +30 XP, +15 🪙 | 📅 3 días |
| 7 | +75 XP, +40 🪙 | 🔥 7 días |
| 14 | +150 XP, +75 🪙 | ⚡ 2 semanas |
| 21 | +200 XP, +100 🪙 | 💎 3 semanas |
| 30 | +300 XP, +150 🪙 | 👑 1 mes |
| 50 | +500 XP, +250 🪙 | 🌟 50 días |
| 100 | +1000 XP, +500 🪙 | 🏆 100 días — ¡LEYENDA! |
| 365 | +3000 XP, +1500 🪙 | 🌍 365 días — ¡AÑO COMPLETO! |

### Integración con Quests
- `completeQuest()` llama a `streaksService.recordActivity()` automáticamente
- Streak multiplier se aplica en rewards
- Se muestra en la respuesta: `streak.current`, `streak.action`, `streak.milestone`

---

## 📊 MODELO DE DATOS

```text
Streak
├── id, userId (unique)
├── currentStreak, longestStreak
├── lastActivityDate
├── createdAt, updatedAt

User
├── streakProtections (Int, default 0)
```

---

## 🔑 REGLAS

1. **Una actividad válida al día mantiene la racha.**
2. **La protección solo cubre 1 día de ausencia.** No más.
3. **El costo de protección es 200 Coins.** Configurable.
4. **El backend calcula todo.** Nunca confiar en el cliente.
5. **Las milestones se detectan automáticamente.**
6. **"No pasa nada 🌱. Tu aventura continúa."** No castigar al usuario.
7. **Logging:** `[StreaksService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Implementación completa: tracking, protection, milestones, history | Buffy |
