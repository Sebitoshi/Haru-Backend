# 🎒 Collection (Colección) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema de objetos coleccionables desbloqueables en **Haru**. Da sensación de progreso visual.

---

## 🏅 TIPOS DE COLECCIONABLES

| Tipo | Emoji | Ejemplo |
|------|-------|---------|
| Insignias | 🏅 | Primer brote, Explorador |
| Plantas | 🌱 | Flor silvestre, Cactus |
| Objetos | 🎒 | Brújula, Lupa |
| Postales | 📮 | Postal de aventura |
| Especiales | ⭐ | Objetos de evento, temporadas |

---

## 📊 MODELO DE DATOS

```text
Collectible
├── id
├── name
├── description
├── type (badge | plant | object | postcard | special)
├── rarity (common | uncommon | rare | epic | legendary)
├── imageUrl
├── requirement (JSON: quest_category, quest_count, streak, level, etc.)
├── isActive
├── createdAt

UserCollectible
├── id
├── userId
├── collectibleId
├── unlockedAt
├── source (quest | achievement | streak | event | purchase)
└── seen (boolean)
```

---

## 🔑 REGLAS

1. **Los coleccionables se desbloquean automáticamente** al cumplir el requisito.
2. **Cada coleccionable solo se obtiene una vez.**
3. **La rareza afecta la disponibilidad.** Algunos solo están en eventos.
4. **El backend valida todos los requisitos.**
5. **Los coleccionables no dan ventajas.** Son decorativos/coleccionables.
6. **Logging:** `[CollectionService] Operation: details`
