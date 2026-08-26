# 🌎 Rankings — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Rankings de **Haru** para que diferentes tipos de usuarios puedan destacar.

---

## 🏆 TIPOS DE RANKING

| Ranking | Descripción |
|---------|-------------|
| 🌎 Global | Todos los usuarios por XP total |
| 🇨🇴 País | Por país (basado en ubicación) |
| 👥 Amigos | Solo entre amigos |
| 🔥 Racha | Mayor racha actual |
| ⭐ XP | XP ganado en el período |
| 🎯 Misiones | Más misiones completadas |
| 🎨 Categoría | Por categoría específica |
| 📅 Semanal | Reset cada lunes |

---

## 📊 MODELO DE DATOS

```text
RankingEntry
├── id
├── userId
├── rankingType (enum)
├── period (weekly | monthly | all_time)
├── periodStart
├── periodEnd
├── score
├── rank
├── createdAt
└── updatedAt
```

---

## 🔄 CÓMO FUNCIONA

```
Evento de progreso (misión completada, nivel, etc.)
       ↓
Actualizar score del usuario en rankings relevantes
       ↓
Recalcular posiciones (optimizado con batch updates)
       ↓
Si el usuario subió de posición → notificación opcional
```

---

## 🔑 REGLAS

1. **Los rankings semanales resetean** cada lunes para dar oportunidad a todos.
2. **El score lo calcula el backend.** Nunca confiar en el cliente.
3. **Los rankings son públicos** pero se puede ocultar el perfil (opt-out).
4. **Anti-abuse:** combinar con sistema de confianza. Usuarios con bajo trust no aparecen.
5. **Múltiples categorías** para que diferentes perfiles destaquen.
6. **Solo mostrar top 100** por defecto. El usuario ve su posición exacta.
7. **Logging:** `[RankingsService] Operation: details`
