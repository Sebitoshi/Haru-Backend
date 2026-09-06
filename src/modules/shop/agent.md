# 🛍️ Shop — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/shop/`

---

## 📌 PROPÓSITO

Tienda visual de **Haru** donde los usuarios compran objetos cosméticos con Coins.

---

## 🏗️ ARQUITECTURA

```
shop/
├── shop.service.ts              # Visual catalog (50+ items), filters, sorting, item detail, buy
├── shop.controller.ts           # 4 endpoints bajo /api/shop/
├── shop.module.ts               # Module
└── agent.md
```

### Flujo de compra
`POST /shop/buy/:code` → `EconomyService.buyItem()` → debita coins + crea purchase + aplica efecto

---

## 🎨 CATÁLOGO VISUAL (50+ items)

### 👕 Cuerpo (body) — 4 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| body_round | Boti Redondo | 100 | common |
| body_square | Boti Cuadrado | 100 | common |
| body_tall | Boti Alta | 200 | uncommon |
| body_mini | Boti Mini | 350 | rare |

### 🎨 Color — 7 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| color_sakura | Sakura Pink | 50 | common |
| color_ocean | Océano Blue | 50 | common |
| color_forest | Forest Green | 50 | common |
| color_sunset | Sunset Orange | 100 | uncommon |
| color_galaxy | Galaxy Purple | 200 | rare |
| color_golden | Golden Boti | 500 | epic |
| color_rainbow | Rainbow Boti | 1000 | legendary |

### 👓 Ojos (eyes) — 4 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| eyes_round | Ojos Redondos | 75 | common |
| eyes_sleepy | Ojos Dormilones | 150 | uncommon |
| eyes_stars | Ojos de Estrella | 300 | rare |
| eyes_heart | Ojos de Corazón | 400 | epic |

### 😊 Expresiones (expression) — 5 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| expr_happy | Feliz | 50 | common |
| expr_wink | Guiño | 100 | uncommon |
| expr_excited | Emocionado | 120 | uncommon |
| expr_cool | Cool | 250 | rare |
| expr_party | Fiesta | 400 | epic |

### 🧢 Cabeza (head) — 4 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| head_cap | Gorra | 100 | common |
| head_crown | Corona | 600 | epic |
| head_flower | Flor | 150 | uncommon |
| head_antenna | Antena | 300 | rare |

### 👓 Accesorios (accessories) — 3 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| acc_glasses | Lentes | 100 | common |
| acc_scarf | Bufanda | 200 | uncommon |
| acc_wings | Alitas | 1500 | legendary |

### ✨ Efectos (effect) — 4 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| effect_sparkle | Destellos | 200 | uncommon |
| effect_fire | Fuego | 400 | rare |
| effect_rain | Lluvia | 180 | uncommon |
| effect_petals | Pétalos | 350 | rare |

### 🏠 Temas (theme) — 5 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| theme_sunset | Atardecer | 200 | uncommon |
| theme_ocean | Océano | 200 | uncommon |
| theme_forest | Bosque | 200 | uncommon |
| theme_galaxy | Galaxia | 400 | rare |
| theme_sakura | Sakura | 400 | rare |

### 🖼️ Marcos (frame) — 3 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| frame_golden | Marco Dorado | 500 | rare |
| frame_floral | Marco Floral | 300 | uncommon |
| frame_neon | Marco Neón | 700 | epic |

### 🏷️ Títulos (title) — 3 items
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| title_explorer | Explorador | 150 | uncommon |
| title_legend | Leyenda | 1000 | epic |
| title_pioneer | Pionero | 2000 | legendary |

---

## 🔑 REGLAS

1. **Validar saldo antes de comprar.** EconomyService verifica.
2. **Compra transaccional:** debitar coins + crear purchase + registrar transacción.
3. **El precio lo define el backend.** Catálogo hardcoded en el servicio.
4. **Los objetos no dan ventajas.** Solo cosmética 100%.
5. **Un item por slot.** Equipar uno quita el anterior automáticamente.
6. **Logging:** `[ShopService] Operation: details`

---

## 🌐 ENDPOINTS (4)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /shop/catalog` | 🔒 | Catálogo con filtros (category, slot, rarity, search, sort, page, limit) + featured + newArrivals |
| `GET /shop/item/:code` | 🔒 | Detalle de item + items en mismo slot + isEquipped |
| `POST /shop/buy/:code` | 🔒 | Comprar item (+ quantity) |
| `GET /shop/categories` | 🔒 | Categorías (protection/cosmetic/decoration/special) y slots (11 slots) |

---

## 🔄 INTEGRACIÓN

- **EconomyService** → buyItem() crea transacción + aplica efecto
- **InventoryService** → usuario equipa items comprados
- **CustomizationService** → Boti refleja items equipados

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-09-05 | Shop visual completo: 50+ items, 11 slots, featured, newArrivals, pagination | Buffy |
| 2026-09-05 | Buy delega a EconomyService.buyItem() (FK resolution + effect application) | Buffy |
