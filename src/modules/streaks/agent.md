# 🔥 Streaks — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/streaks/`

---

## 📌 PROPÓSITO

Sistema de rachas diarias de **Haru**. Tracking automático, protección, milestones.

---

## 🏗️ ARQUITECTURA

```
streaks/
├── streaks.service.ts           # Core: record, protect, buy, history, calculate
├── streaks.controller.ts        # 6 endpoints bajo /api/streaks/
├── streaks.module.ts            # Module
└── agent.md
```

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

## 🔄 CÓMO FUNCIONA

### RecordActivity (llamado desde completeQuest)
```
1. ¿Ya contó hoy? → retorna already_counted
2. ¿Última actividad fue ayer? → streak++ (extended)
3. ¿Racha rota (>1 día)?
   ├── ¿Tiene protecciones? → usa N protecciones, streak++ (protected)
   └── No → streak = 1 (broken)
4. Actualiza Streak en DB
5. Detecta milestones
6. Log en ActivityLog
```

### Protección de Racha
- **Costo:** 200 Coins
- **Uso manual:** `POST /streaks/me/protect` (solo si racha rota 1 día)
- **Uso automático:** En `recordActivity()` si la racha está rota exactamente 1 día
- **Límite:** Solo protege 1 día de ausencia (no 2+ días)
- **Max protections:** Comprable en tienda (100 coins c/u, max 10)

---

## 🎁 8 MILESTONES

| Días | XP | Coins | Mensaje |
|------|-----|-------|---------|
| 3 | 30 | 15 | 📅 3 días |
| 7 | 75 | 40 | 🔥 7 días |
| 14 | 150 | 75 | ⚡ 2 semanas |
| 21 | 200 | 100 | 💎 3 semanas |
| 30 | 300 | 150 | 👑 1 mes |
| 50 | 500 | 250 | 🌟 50 días |
| 100 | 1000 | 500 | 🏆 100 días — ¡LEYENDA! |
| 365 | 3000 | 1500 | 🌍 365 días — ¡AÑO COMPLETO! |

---

## ✅ ENDPOINTS (6)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/streaks/me` | 🔒 | Info completa: actual, longest, active, protections, next milestone, achieved milestones |
| `POST /api/streaks/me/record` | 🔒 | Registrar actividad (auto tras quest complete) |
| `POST /api/streaks/me/protect` | 🔒 | Usar 1 protección (si racha rota 1 día) |
| `POST /api/streaks/me/buy-protection` | 🔒 | Comprar 1 protección (200 Coins) |
| `GET /api/streaks/me/history` | 🔒 | Calendario de actividad (30 días) |
| `GET /api/streaks/milestones` | 🔒 | 8 milestones con recompensas |

---

## 🔑 REGLAS

1. **Una actividad válida al día mantiene la racha.**
2. **La protección solo cubre 1 día de ausencia.** No más.
3. **El costo de protección es 200 Coins.**
4. **El backend calcula todo.** Nunca confiar en el cliente.
5. **Las milestones se detectan automáticamente.**
6. **"No pasa nada 🌱. Tu aventura continúa."** No castigar al usuario.
7. **Logging:** `[StreaksService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-26 | Implementación completa: tracking, protection, milestones, history | Buffy |
| 2026-09-05 | Fix: buyProtection directo (sin economy check) — EconomyService maneja la compra real | Buffy |
