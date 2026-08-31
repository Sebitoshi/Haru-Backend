# 👕 Customization — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Personalización visual del Boti del usuario en **Haru**.

---

## 🎨 CATEGORÍAS

Cuerpo | Color | Ropa | Cabeza | Ojos | Accesorios | Expresiones | Efectos

---

## 🔑 REGLAS

1. **Solo usar objetos que el usuario posea.**
2. **100% cosmética.** No afecta stats, XP, coins.
3. **El backend valida** que el objeto exista y esté en inventario.
4. **Cada categoría: solo un objeto a la vez.**
5. **Presets:组合 predefinidas que resetean todo.**

---

## 📁 ESTRUCTURA

```
customization/
├── customization.service.ts     # Appearance, preview, presets, reset
├── customization.controller.ts  # 7 endpoints
├── customization.module.ts      # Module
└── agent.md
```

---

## 🤖 APARIENCIA DEFAULT

```json
{
  "bodyType": "standard",
  "bodyColor": "#4FC3F7",
  "eyeStyle": "round",
  "mouthStyle": "smile",
  "expression": "calm",
  "accessories": null,
  "effect": null,
  "theme": null,
  "title": null,
  "frame": null
}
```

---

## 🎨 5 PRESETS

| ID | Nombre | Look |
|----|--------|------|
| default | 🌸 Haru Default | Azul clásico, round, smile |
| cute | 🌸 Adorable Boti | Mini, rosa, happy |
| cool | 😎 Boti Cool | Tall, dark, stars, cool |
| nature | 🌿 Naturaleza | Standard, verde, smile |
| galaxy | 🌌 Galaxia | Tall, purple, stars, excited |

---

## 📊 7 ENDPOINTS

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /customization/boti` | 🔒 | Apariencia completa de Boti + equipped |
| `POST /customization/preview` | 🔒 | Preview de combinación (sin equipar) |
| `GET /customization/presets` | 🔒 | 5 presets predefinidos |
| `POST /customization/presets/:id/apply` | 🔒 | Aplicar preset (resetea todo) |
| `POST /customization/presets/save` | 🔒 | Guardar config actual como preset |
| `GET /customization/presets/user` | 🔒 | Mis presets guardados |
| `DELETE /customization/reset` | 🔒 | Resetear a defaults |

---

## 🔄 FLUJO COMPLETO

```
┌─── Usuario abre tienda ──────────────────────────────┐
│ GET /shop/catalog → ve items con preview             │
└──────────────────────────────────────────────────────┘
       ↓
┌─── Usuario compra item ──────────────────────────────┐
│ POST /shop/buy/:code → EconomyService debita coins   │
│ → UserShopPurchase creado                            │
└──────────────────────────────────────────────────────┘
       ↓
┌─── Usuario equipa item ──────────────────────────────┐
│ POST /inventory/equip/:code                          │
│ → UserEquipped actualizado (slot único)              │
└──────────────────────────────────────────────────────┘
       ↓
┌─── Boti refleja cambio ──────────────────────────────┐
│ GET /customization/boti → appearance actualizada     │
│ → Frontend renderiza Boti con nuevos items           │
└──────────────────────────────────────────────────────┘
```
