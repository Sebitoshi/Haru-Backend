# 🎒 Inventory — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/inventory/`

---

## 📌 PROPÓSITO

Gestionar los objetos que posee cada usuario en **Haru**. Equipar, desequipar, ver loadout.

---

## 🏗️ ARQUITECTURA

```
inventory/
├── inventory.service.ts          # List, equip, unequip, loadout, Boti preview
├── inventory.controller.ts       # 4 endpoints bajo /api/inventory/
├── inventory.module.ts           # Module
└── agent.md
```

---

## 📊 SLOTS DISPONIBLES (11)

`body | color | eyes | expression | head | accessories | effect | theme | title | frame | clothing`

---

## 📊 MODELO DE DATOS

```prisma
model UserEquipped {
  userId + slot (unique) → itemId, itemName, itemImage, equippedAt
}

model UserShopPurchase {
  userId, itemId (FK→ShopItem.id), quantity, totalCost, equipped, createdAt
}
```

---

## 🔄 FLUJO DE EQUIPACIÓN

```
POST /inventory/equip/:code
       ↓
1. Resuelve ShopItem.id por code
2. Valida: usuario posee el item (UserShopPurchase)
3. Determina slot desde effect.type
4. DeleteMany UserEquipped en ese slot
5. Create UserEquipped con nuevo item
6. Update UserShopPurchase.equipped = true
7. Unequip previous item's purchase record (mismo slot)
       ↓
Response: { equipped: true, slot, item }
```

---

## 🌐 ENDPOINTS (4)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /inventory` | 🔒 | Mi inventario (filtros: category, slot, equipped, page, limit) |
| `GET /inventory/equipped` | 🔒 | Items equipados + Boti preview (bodyType, bodyColor, eyeStyle, mouthStyle) |
| `POST /inventory/equip/:code` | 🔒 | Equipar item (reemplaza slot actual) |
| `DELETE /inventory/unequip/:slot` | 🔒 | Desequipar slot |

---

## 🔑 REGLAS

1. **Solo equipar objetos que el usuario posea.**
2. **La equipación es cosmética.** No da ventajas.
3. **El backend valida** que el objeto exista y pertenezca al usuario.
4. **Un item por slot.** Equipar uno quita el anterior.
5. **Logging:** `[InventoryService] Operation: details`
