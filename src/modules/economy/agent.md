# 🪙 Economy — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema de economía virtual de **Haru**.

---

## 🪙 COINS

**Moneda virtual: Coins.** Se gana con misiones, logros, rachas. Se usa en la tienda cosmética.

**IMPORTANTE:** Sin dinero real, inversiones, bancos, trading. Exclusivamente RPG.

---

## 🔑 REGLAS

1. **El backend controla todo el saldo.** Nunca confiar en el cliente.
2. **No se permite saldo negativo.** Siempre validar antes de gastar.
3. **Cada transacción se registra** en el modelo `Transaction` con tipo, monto, balance y metadata.
4. **Operaciones transaccionales.** earn/spend usan `$transaction` de Prisma para atomicidad.
5. **La economía es cosmética/divertida.** No hay ventajas competitivas ("pay to win").

---

## 📁 ESTRUCTURA

```
economy/
├── economy.service.ts        # Core: earn, spend, balance, shop, buy
├── economy.controller.ts     # 7 endpoints públicos
├── economy.module.ts         # Module con exports
└── agent.md                  # Este archivo
```

---

## 💰 FLUJO DE COINS

### Earn (ganar coins)
```
Acción del usuario (misión, badge, nivel, racha)
       ↓
ProgressionService.addCoins() o EconomyService.earnCoins()
       ↓
┌─── EconomyService ──────────────────────────────────────┐
│ 1. Leer balance actual                                  │
│ 2. Calcular nuevo balance = actual + amount             │
│ 3. $transaction: update User + create Transaction      │
│    (atomicidad garantizada)                             │
└─────────────────────────────────────────────────────────┘
       ↓
Response: { earned, totalCoins, transactionId }
```

### Spend (gastar coins)
```
Usuario compra item en tienda
       ↓
EconomyService.buyItem()
       ↓
┌─── Validaciones ────────────────────────────────────────┐
│ - Item existe y está activo                             │
│ - User puede pagar (balance >= precio * cantidad)       │
│ - No excede maxPerUser (si aplica)                      │
└─────────────────────────────────────────────────────────┘
       ↓
EconomyService.spendCoins()
       ↓
┌─── $transaction ───────────────────────────────────────┐
│ 1. Validar saldo >= amount                              │
│ 2. newBalance = totalCoins - amount                     │
│ 3. Update User.totalCoins + create Transaction         │
│    (negative amount, balance recorded)                  │
└─────────────────────────────────────────────────────────┘
       ↓
applyItemEffect() → streak_protection, cosmetic, boost...
       ↓
Response: { success, item, balance, effect }
```

---

## 🏪 TIENDA — CATÁLOGO

### 🛡️ Protección (category: protection)
| Item | Precio | Efecto | Max |
|------|--------|--------|-----|
| Protección de Racha | 100 | +1 protección de racha | 10 |
| Pack x3 | 250 | +3 protecciones | 5 |

### 👕 Cosméticos (category: cosmetic)
| Item | Precio | Rareza |
|------|--------|--------|
| Tema Atardecer | 200 | uncommon |
| Tema Océano | 200 | uncommon |
| Tema Bosque | 200 | uncommon |
| Tema Galaxia | 400 | rare |
| Tema Sakura | 400 | rare |
| Boti Festivo | 300 | rare |
| Boti Dormilón | 250 | uncommon |

### 🏠 Decoraciones (category: decoration)
| Item | Precio | Rareza |
|------|--------|--------|
| Marco Dorado | 500 | rare |
| Marco Floral | 300 | uncommon |
| Título: Explorador | 150 | uncommon |
| Título: Leyenda | 1000 | epic |

### ⭐ Especiales (category: special)
| Item | Precio | Efecto | Max |
|------|--------|--------|-----|
| Boost x2 XP | 800 | x2 XP por 24h | 3 |
| Amuleto de la Suerte | 350 | x1.25 coins en próxima misión | 5 |
| Caja Misteriosa | 600 | Coleccionable random rare+ | 3 |

---

## 📊 MODELOS PRISMA

### Transaction
```
id          String (uuid)
userId      String
type        TransactionType (enum)
amount      Int             // +earn / -spend
balance     Int             // balance post-transacción
source      String          // quest_id, badge_code, item_code
description String?
metadata    Json?           // { questTitle, itemName, ... }
createdAt   DateTime
```

### TransactionType (enum)
```
quest_completed | badge_unlocked | collectible_unlocked | level_up
streak_milestone | daily_bonus | admin_grant | refund
shop_purchase | streak_protection | gifting | admin_deduction
welcome_bonus
```

### ShopItem
```
code        String (unique)
name        String
description String
category    ShopItemCategory (enum)
rarity      ShopItemRarity (enum)
price       Int
imageUrl    String?
effect      Json            // { type, key, value, multiplier, ... }
isActive    Boolean
isLimited   Boolean
expiresAt   DateTime?
maxPerUser  Int?
```

### UserShopPurchase
```
userId, itemId, quantity, totalCost, createdAt
```

---

## 🎯 EARN SOURCES

| Fuente | Amount | TransactionType |
|--------|--------|-----------------|
| Misión fácil | 10 | quest_completed |
| Misión normal | 15 | quest_completed |
| Misión hard | 25 | quest_completed |
| Misión especial | 50 | quest_completed |
| Badge | badge.coinsReward | badge_unlocked |
| Collectible | collectible.coinsReward | collectible_unlocked |
| Level up | levelReward.coins | level_up |
| Racha milestone | streakReward | streak_milestone |
| Daily bonus | 5-20 | daily_bonus |
| Welcome | 50 | welcome_bonus |
| Admin grant | manual | admin_grant |

**Streak multiplier:** +10% por día de racha activa, máximo +50%.

---

## 📊 7 ENDPOINTS

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /economy/balance` | 🔒 | Balance + totalEarned + totalSpent + lastTransaction |
| `GET /economy/transactions` | 🔒 | Historial paginado, filtro por type/fecha |
| `GET /economy/transactions/summary` | 🔒 | Resumen por período (today/week/month/all) |
| `GET /economy/shop` | 🔒 | Catálogo con canAfford + owned por item |
| `POST /economy/shop/buy/:itemCode` | 🔒 | Comprar item (+ quantity) |
| `GET /economy/shop/history` | 🔒 | Historial de compras |
| `GET /economy/stats` | 👑 | Stats globales (admin) |

---

## 🔄 INTEGRACIONES

### ProgressionService → EconomyService
```typescript
// addCoins delega a EconomyService.earnCoins()
// spendCoins delega a EconomyService.spendCoins()
// addXp level-up → economyService.earnCoins(type: 'level_up')
```

### QuestsService → EconomyService
```typescript
// completeQuest() → economyService.earnCoins(type: 'quest_completed')
// streak bonus calculado por economyService.calculateStreakBonus()
```

### AchievementsService → EconomyService
```typescript
// checkBadges() → economyService.earnCoins(type: 'badge_unlocked')
```

### CollectionService → EconomyService
```typescript
// checkAndUnlock() → economyService.earnCoins(type: 'collectible_unlocked')
```

### AdminModule → EconomyService
```typescript
// adminGrantCoins() → economyService.earnCoins(type: 'admin_grant')
// adminDeductCoins() → economyService.spendCoins(type: 'admin_deduction')
// getEconomyStats() → economyService.getEconomyStats()
```

---

## 🛡️ SEGURIDAD

1. **Validación server-side** — Nunca confiar en amounts del cliente
2. **Atomicidad** — `$transaction` de Prisma garantiza consistencia
3. **Max por usuario** — `maxPerUser` previene compra masiva
4. **No saldo negativo** — check antes de spend
5. **Admin rate limit** — endpoints admin tienen throttling separado

---

## 📋 LOGGING

Todos los要害 operaciones loguean:
```
[EconomyService] EarnCoins: userId=xxx, +25 quest_completed
[EconomyService] SpendCoins: userId=xxx, -100 shop_purchase
[EconomyService] BuyItem OK: userId=xxx, 1x Protección de Racha, spent=100
```

---

## 💡 FUTURAS MEJORAS

1. ** Tienda rotativa** — Items que cambian cada 24h
2. ** Ofertas flash** — Descuentos temporales
3. ** Intercambio entre usuarios** — Gifting coins/items
4. ** Moneda premium** — Para features speciales (sin pay-to-win)
5. ** Economía dinámica** — Precios basados en demanda
6. ** Cashback events** — "Esta semana ganas x2 coins en naturaleza"
