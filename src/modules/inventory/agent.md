# 🎒 Inventory — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Gestionar los objetos que posee cada usuario en **Haru**.

---

## 🎨 CATEGORÍAS

Cuerpo | Color | Ropa | Cabeza | Ojos | Accesorios | Expresiones | Efectos | Temas | Títulos | Marcos

---

## 🔑 REGLAS

1. **Solo equipar objetos que el usuario posea.**
2. **La equipación es cosmética.** No da ventajas.
3. **El backend valida** que el objeto exista y pertenezca al usuario.
4. **Un item por slot.** Equipar uno quita el anterior.
5. **El inventario se carga con el perfil.**

---

## 📁 ESTRUCTURA

```
inventory/
├── inventory.service.ts     # List, equip, unequip, loadout
├── inventory.controller.ts  # 4 endpoints
├── inventory.module.ts      # Module
└── agent.md
```

---

## 📊 4 ENDPOINTS

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /inventory` | 🔒 | Mi inventario (filtros: category, slot, equipped) |
| `GET /inventory/equipped` | 🔒 | Items equipados + preview de Boti |
| `POST /inventory/equip/:code` | 🔒 | Equipar item (reemplaza slot actual) |
| `DELETE /inventory/unequip/:slot` | 🔒 | Desequipar slot |

---

## 🔄 FLUJO DE EQUIPACIÓN

```
Usuario toca "Equipar" en item
       ↓
POST /inventory/equip/:code
       ↓
┌─── Validations ─────────────────────────────────────┐
│ 1. ¿El usuario posee este item? (UserShopPurchase)  │
│ 2. ¿Es equippable? (no protection, no boost)       │
│ 3. ¿Qué slot usa? (desde effect.type)               │
└─────────────────────────────────────────────────────┘
       ↓
┌─── Swap ───────────────────────────────────────────┐
│ 1. DeleteMany UserEquipped en ese slot              │
│ 2. Create UserEquipped con nuevo item               │
│ 3. Update UserShopPurchase.equipped = true/false    │
└─────────────────────────────────────────────────────┘
       ↓
Response: { equipped: true, slot: 'color', item: {...} }
```

---

## 📊 MODELO UserEquipped

```
userId + slot (unique) → itemId, itemName, itemImage, equippedAt
```

Slots posibles: `body | color | clothing | head | eyes | accessories | expression | effect | theme | title | frame`
