# 🪙 Economy — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/economy/`

---

## 📌 PROPÓSITO

Sistema de economía virtual de **Haru**. Coins como moneda RPG — sin dinero real.

---

## 🏗️ ARQUITECTURA

```
economy/
├── economy.service.ts           # Core: earn, spend, balance, shop catalog (50+ items), buy, stats
├── economy.controller.ts        # 7 endpoints bajo /api/economy/
├── economy.module.ts            # Module (imports CollectionModule)
└── agent.md
```

### Auto-seed en onModuleInit
El catálogo de 50+ items se semilla automáticamente en `ShopItem` al iniciar la app (por FK de `UserShopPurchase`).

---

## 📊 MODELOS PRISMA

```prisma
enum TransactionType {
  quest_completed | badge_unlocked | collectible_unlocked | level_up
  streak_milestone | daily_bonus | admin_grant | refund
  shop_purchase | streak_protection | gifting | admin_deduction
  welcome_bonus
}

model Transaction {
  id, userId, type, amount (±), balance, source, description?, metadata?, createdAt
}

model ShopItem {
  code (unique), name, description, category, rarity, price, imageUrl?
  effect (Json), isActive, isLimited, expiresAt?, maxPerUser?
}

model UserShopPurchase {
  userId, itemId (FK→ShopItem.id), quantity, totalCost, equipped, createdAt
}
```

---

## 🏪 CATÁLOGO COMPLETO (50+ items)

### 🛡️ Protección (2)
| Code | Nombre | Precio | Rareza | Efecto | Max |
|------|--------|--------|--------|--------|-----|
| streak_protection_1 | Protección de Racha | 100 | common | +1 protección | 10 |
| streak_protection_3 | Pack x3 | 250 | uncommon | +3 protecciones | 5 |

### 🎨 Cosméticos — Themes (5)
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| theme_sunset | Atardecer | 200 | uncommon |
| theme_ocean | Océano | 200 | uncommon |
| theme_forest | Bosque | 200 | uncommon |
| theme_galaxy | Galaxia | 400 | rare |
| theme_sakura | Sakura | 400 | rare |

### 🎨 Cosméticos — Boti Expressions (2)
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| boti_party | Boti Festivo | 300 | rare |
| boti_sleepy | Boti Dormilón | 250 | uncommon |

### 🏠 Decoraciones (4)
| Code | Nombre | Precio | Rareza |
|------|--------|--------|--------|
| frame_golden | Marco Dorado | 500 | rare |
| frame_floral | Marco Floral | 300 | uncommon |
| frame_neon | Marco Neón | 700 | epic |
| title_explorer | Título: Explorador | 150 | uncommon |
| title_legend | Título: Leyenda | 1000 | epic |
| title_pioneer | Título: Pionero | 2000 | legendary |

### ⭐ Especiales (3)
| Code | Nombre | Precio | Rareza | Efecto | Max |
|------|--------|--------|--------|--------|-----|
| double_xp_boost | Boost x2 XP | 800 | epic | x2 XP por 24h | 3 |
| lucky_charm | Amuleto de la Suerte | 350 | rare | x1.25 coins en próxima misión | 5 |
| mystery_box | Caja Misteriosa | 600 | epic | Coleccionable random rare+ | 3 |

### 👕 Cosméticos Visuales (40+ items)
- **Body:** round (100), square (100), tall (200), mini (350)
- **Color:** sakura/ocean/forest (50), sunset (100), galaxy (200), golden (500), rainbow (1000)
- **Eyes:** round (75), sleepy (150), stars (300), heart (400)
- **Expression:** happy (50), wink (100), excited (120), cool (250), party (400)
- **Head:** cap (100), crown (600), flower (150), antenna (300)
- **Accessories:** glasses (100), scarf (200), wings (1500)
- **Effect:** sparkle (200), fire (400), rain (180), petals (350)

---

## 💰 EARN SOURCES

| Fuente | Amount | TransactionType |
|--------|--------|-----------------|
| Misión easy | 8 | quest_completed |
| Misión normal | 15 | quest_completed |
| Misión hard | 30 | quest_completed |
| Misión especial | 60 | quest_completed |
| Badge | badge.coinsReward | badge_unlocked |
| Collectible | collectible.coinsReward | collectible_unlocked |
| Level up | levelReward.coins | level_up |
| Streak milestone | milestone coins | streak_milestone |
| Welcome | 50 | welcome_bonus |
| Admin grant | manual | admin_grant |

**Streak multiplier:** +10% por día de racha activa, máximo +50%.

---

## 🔄 FLUJO DE COMPRA

```
POST /economy/shop/buy/:itemCode (+ quantity)
       ↓
Valida: item existe, está activo, user puede pagar, no excede maxPerUser
       ↓
EconomyService.spendCoins() → $transaction: update User + create Transaction
       ↓
Crea UserShopPurchase
       ↓
applyItemEffect():
  streak_protection → incrementa User.streakProtections
  cosmetic → log activity (equipar se maneja en /inventory)
  theme/expression/frame/title → log activity
  xp_boost/coins_boost → log activity con expiresAt
  mystery_collectible → CollectionService.unlockRandomCollectible()
```

---

## 🌐 ENDPOINTS (7)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /economy/balance` | 🔒 | Balance + totalEarned + totalSpent + lastTransaction |
| `GET /economy/transactions` | 🔒 | Historial paginado (?type, ?page, ?limit, ?from, ?to) |
| `GET /economy/transactions/summary` | 🔒 | Resumen por período (today/week/month/all) |
| `GET /economy/shop` | 🔒 | Catálogo con canAfford + owned por item |
| `POST /economy/shop/buy/:itemCode` | 🔒 | Comprar item (+ quantity) |
| `GET /economy/shop/history` | 🔒 | Historial de compras |
| `GET /economy/stats` | 👑 | Stats globales (admin) |

---

## 🔑 REGLAS

1. **El backend controla todo el saldo.** Nunca confiar en el cliente.
2. **No se permite saldo negativo.** Siempre validar antes de spend.
3. **Cada transacción se registra** en Transaction con tipo, monto, balance.
4. **Operaciones transaccionales.** earn/spend usan `$transaction` de Prisma.
5. **La economía es cosmética/divertida.** No hay ventajas competitivas.
6. **Seed automático:** El catálogo se semilla en `onModuleInit`.
7. **Logging:** `[EconomyService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-09-05 | Caja Misteriosa integrada: compra desbloquea coleccionable aleatorio | Buffy |
| 2026-09-05 | Fix tienda: `isActive` default true, seed automático en onModuleInit, FK resolution | Buffy |
| 2026-09-05 | +50 items cosméticos (body, color, eyes, expression, head, accessories, effects) | Buffy |
| 2026-09-05 | +adminGrantCoins, adminDeductCoins, getEconomyStats | Buffy |
