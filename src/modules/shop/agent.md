# 🛍️ Shop — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Tienda visual de **Haru** donde los usuarios compran objetos cosméticos con Coins.

---

## 🏷️ RAREZA

Common (Gris) → Uncommon (Verde) → Rare (Azul) → Epic (Púrpura) → Legendary (Dorado)

---

## 🔑 REGLAS

1. **Validar saldo antes de comprar.** EconomyService verifica.
2. **Compra transaccional:** debitar Coins + crear purchase + registrar transacción.
3. **El precio lo define el backend.** Catálogo hardcoded en el servicio.
4. **Los objetos no dan ventajas.** Solo cosmética 100%.
5. **Un item por slot.** Equipar uno quita el anterior automáticamente.

---

## 📁 ESTRUCTURA

```
shop/
├── shop.service.ts        # Catálogo visual, categorías, búsqueda, compra
├── shop.controller.ts     # 4 endpoints
├── shop.module.ts         # Module
└── agent.md
```

---

## 🎨 CATÁLOGO VISUAL (50+ items)

### 👕 Cuerpo (body)
- Boti Redondo, Cuadrado, Alta, Mini

### 🎨 Color (color)
- Sakura Pink, Ocean Blue, Forest Green, Sunset Orange, Galaxy Purple, Golden, Rainbow

### 👓 Ojos (eyes)
- Redondos, Dormilones, Estrella, Corazón

### 😊 Expresiones (expression)
- Feliz, Guiño, Emocionado, Cool, Fiesta

### 🧢 Cabeza (head)
- Gorra, Corona, Flor, Antena

### 👓 Accesorios (accessories)
- Lentes, Bufanda, Alitas

### ✨ Efectos (effect)
- Destellos, Fuego, Lluvia, Pétalos

### 🏠 Temas (theme)
- Atardecer, Océano, Bosque, Galaxia, Sakura

### 🖼️ Marcos (frame)
- Dorado, Floral, Neón

### 🏷️ Títulos (title)
- Explorador, Leyenda, Pionero

---

## 📊 4 ENDPOINTS

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /shop/catalog` | 🔒 | Catálogo con filtros (category, slot, rarity, search, sort) |
| `GET /shop/item/:code` | 🔒 | Detalle de item + items en mismo slot |
| `POST /shop/buy/:code` | 🔒 | Comprar item |
| `GET /shop/categories` | 🔒 | Categorías y slots disponibles |

---

## 🔄 INTEGRACIÓN

- **EconomyService** → buyItem() crea transacción + aplica efecto
- **InventoryService** → usuario equipa items comprados
- **CustomizationService** → Boti refleja items equipados
