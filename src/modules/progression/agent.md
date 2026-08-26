# 📈 Progression (XP y Niveles) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema de progresión del usuario en **Haru**.

Responsabilidades:
- Acumular XP
- Calcular nivel actual
- Curva de experiencia por nivel
- Detectar subida de nivel
- Desbloquear contenido al subir de nivel
- Guardar historial de progreso

---

## ⭐ XP

| Tipo de misión | XP base |
|----------------|---------|
| Mini misión | +10 |
| Misión normal | +25 |
| Misión difícil | +50 |
| Misión especial | +100 |

Los valores son **configurables** y calculados por el backend.

---

## 📊 NIVELES

Ejemplo:
```
Nivel 8
████████░░
820 / 1000 XP
```

Al subir de nivel pueden desbloquearse:
- Elementos cosméticos
- Nuevas misiones
- Logros
- Categorías
- Recompensas

---

## 📊 MODELO DE DATOS

```text
UserProgression
├── id, userId
├── totalXP, level
├── xpInCurrentLevel, xpForNextLevel
├── createdAt, updatedAt
```

---

## 🔑 REGLAS

1. **El backend calcula TODO.** El frontend solo muestra.
2. **El frontend NUNCA envía `xp` o `level`.**
3. **La curva de XP debe ser configurable.**
4. **Al subir de nivel, validar logros y desbloqueos.**
5. **Las operaciones de XP son transaccionales.**
6. **No existe XP negativo.** El usuario nunca pierde XP.

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| — | Pendiente de implementar | — |
