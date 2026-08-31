import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, ShopItemCategory, ShopItemRarity } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// SHOP ITEMS CATALOG
// ═══════════════════════════════════════════════════════════

interface ShopItemDef {
  code: string;
  name: string;
  description: string;
  category: ShopItemCategory;
  rarity: ShopItemRarity;
  price: number;
  imageUrl?: string;
  effect: Record<string, any>;
  isActive?: boolean;
  isLimited?: boolean;
  expiresAt?: Date;
  maxPerUser?: number;
}

const SHOP_CATALOG: ShopItemDef[] = [
  // ─── 🛡️ PROTECCIÓN ──────────────────────────────
  {
    code: 'streak_protection_1',
    name: '🛡️ Protección de Racha',
    description: 'Protege 1 día de racha perdida. Si olvidas una misión, tu racha no se reinicia.',
    category: 'protection',
    rarity: 'common',
    price: 100,
    effect: { type: 'streak_protection', value: 1 },
    maxPerUser: 10,
  },
  {
    code: 'streak_protection_3',
    name: '🛡️保护pack x3',
    description: 'Paquete de 3 protecciones de racha. Ahorra 50 coins.',
    category: 'protection',
    rarity: 'uncommon',
    price: 250,
    effect: { type: 'streak_protection', value: 3 },
    maxPerUser: 5,
  },

  // ─── 👕 COSMÉTICOS — THEMES ──────────────────────
  {
    code: 'theme_sunset',
    name: '🌅 Tema Atardecer',
    description: 'Tema cálido con tonos naranjas y dorados para tu perfil.',
    category: 'cosmetic',
    rarity: 'uncommon',
    price: 200,
    effect: { type: 'theme', key: 'sunset', value: 'sunset' },
  },
  {
    code: 'theme_ocean',
    name: '🌊 Tema Océano',
    description: 'Tema fresco con tonos azules y turquesa.',
    category: 'cosmetic',
    rarity: 'uncommon',
    price: 200,
    effect: { type: 'theme', key: 'ocean', value: 'ocean' },
  },
  {
    code: 'theme_forest',
    name: '🌲 Tema Bosque',
    description: 'Tema natural con verdes y marrones tierra.',
    category: 'cosmetic',
    rarity: 'uncommon',
    price: 200,
    effect: { type: 'theme', key: 'forest', value: 'forest' },
  },
  {
    code: 'theme_galaxy',
    name: '🌌 Tema Galaxia',
    description: 'Tema oscuro con estrellas y nebulosas.',
    category: 'cosmetic',
    rarity: 'rare',
    price: 400,
    effect: { type: 'theme', key: 'galaxy', value: 'galaxy' },
  },
  {
    code: 'theme_cherry',
    name: '🌸 Tema Sakura',
    description: 'Tema japonés con flores de cerezo y rosa suave.',
    category: 'cosmetic',
    rarity: 'rare',
    price: 400,
    effect: { type: 'theme', key: 'sakura', value: 'sakura' },
  },

  // ─── 👕 COSMÉTICOS — BOTI EXPRESSIONS ────────────
  {
    code: 'boti_party',
    name: '🎉 Boti Festivo',
    description: 'Boti con expresión de fiesta y confeti.',
    category: 'cosmetic',
    rarity: 'rare',
    price: 300,
    effect: { type: 'boti_expression', key: 'party', value: 'party' },
  },
  {
    code: 'boti_sleepy',
    name: '😴 Boti Dormilón',
    description: 'Boti con pijama y antifaz, imagen adorable.',
    category: 'cosmetic',
    rarity: 'uncommon',
    price: 250,
    effect: { type: 'boti_expression', key: 'sleepy', value: 'sleepy' },
  },

  // ─── 🏠 DECORACIONES — PROFILE ───────────────────
  {
    code: 'frame_golden',
    name: '🖼️ Marco Dorado',
    description: 'Marco brillante dorado para tu avatar.',
    category: 'decoration',
    rarity: 'rare',
    price: 500,
    effect: { type: 'avatar_frame', key: 'golden', value: 'golden' },
  },
  {
    code: 'frame_floral',
    name: '🌺 Marco Floral',
    description: 'Marco con flores para tu avatar.',
    category: 'decoration',
    rarity: 'uncommon',
    price: 300,
    effect: { type: 'avatar_frame', key: 'floral', value: 'floral' },
  },
  {
    code: 'title_explorer',
    name: '🗺️ Título: Explorador',
    description: 'Título "Explorador" visible en tu perfil.',
    category: 'decoration',
    rarity: 'uncommon',
    price: 150,
    effect: { type: 'profile_title', key: 'explorer', value: '🗺️ Explorador' },
  },
  {
    code: 'title_legend',
    name: '👑 Título: Leyenda',
    description: 'Título "Leyenda de Haru" visible en tu perfil.',
    category: 'decoration',
    rarity: 'epic',
    price: 1000,
    effect: { type: 'profile_title', key: 'legend', value: '👑 Leyenda de Haru' },
  },

  // ─── ⭐ ESPECIALES ──────────────────────────────
  {
    code: 'double_xp_boost',
    name: '⚡ Boost x2 XP',
    description: 'Duplica tu XP durante 24 horas. ¡Aprovecha al máximo!',
    category: 'special',
    rarity: 'epic',
    price: 800,
    effect: { type: 'xp_boost', multiplier: 2, durationHours: 24 },
    maxPerUser: 3,
  },
  {
    code: 'lucky_charm',
    name: '🍀 Amuleto de la Suerte',
    description: 'Aumenta 25% las recompensas de coins en tu próxima misión.',
    category: 'special',
    rarity: 'rare',
    price: 350,
    effect: { type: 'coins_boost', multiplier: 1.25, durationQuests: 1 },
    maxPerUser: 5,
  },
  {
    code: 'mystery_box',
    name: '🎁 Caja Misteriosa',
    description: 'Contiene un coleccionable aleatorio de rarity rare o superior.',
    category: 'special',
    rarity: 'epic',
    price: 600,
    effect: { type: 'mystery_collectible', minRarity: 'rare' },
    maxPerUser: 3,
  },
];

// ═══════════════════════════════════════════════════════════
// STREAK BONUS FORMULA
// ═══════════════════════════════════════════════════════════

function streakCoinBonus(baseCoins: number, streakDays: number): number {
  // +10% per streak day, max +50%
  const multiplier = Math.min(1 + (streakDays * 0.1), 1.5);
  return Math.round(baseCoins * multiplier);
}

@Injectable()
export class EconomyService {
  private readonly logger = new Logger(EconomyService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════
  // EARN COINS
  // ═══════════════════════════════════════════════════

  async earnCoins(
    userId: string,
    amount: number,
    type: TransactionType,
    source: string,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<{ earned: number; totalCoins: number; transactionId: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive for earnCoins');
    }

    this.logger.log(`EarnCoins: userId=${userId}, +${amount} ${type} (${source})`);

    // Get current balance + update in transaction
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalCoins: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const newBalance = user.totalCoins + amount;

    // Update balance + create transaction in a single write
    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { totalCoins: newBalance },
        select: { totalCoins: true },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type,
          amount,
          balance: newBalance,
          source,
          description: description || null,
          metadata: metadata || undefined,
        },
      }),
    ]);

    this.logger.log(`EarnCoins OK: userId=${userId}, +${amount}, balance=${updatedUser.totalCoins}`);

    return {
      earned: amount,
      totalCoins: updatedUser.totalCoins,
      transactionId: transaction.id,
    };
  }

  // ═══════════════════════════════════════════════════
  // SPEND COINS
  // ═══════════════════════════════════════════════════

  async spendCoins(
    userId: string,
    amount: number,
    type: TransactionType,
    source: string,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<{ spent: number; remaining: number; transactionId: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive for spendCoins');
    }

    this.logger.log(`SpendCoins: userId=${userId}, -${amount} ${type} (${source})`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalCoins: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.totalCoins < amount) {
      this.logger.warn(`SpendCoins FAILED: userId=${userId}, have=${user.totalCoins}, need=${amount}`);
      throw new BadRequestException(
        `Insufficient coins. Have: ${user.totalCoins}, need: ${amount}`,
      );
    }

    const newBalance = user.totalCoins - amount;

    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { totalCoins: newBalance },
        select: { totalCoins: true },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type,
          amount: -amount, // negative for spending
          balance: newBalance,
          source,
          description: description || null,
          metadata: metadata || undefined,
        },
      }),
    ]);

    this.logger.log(`SpendCoins OK: userId=${userId}, -${amount}, remaining=${updatedUser.totalCoins}`);

    return {
      spent: amount,
      remaining: updatedUser.totalCoins,
      transactionId: transaction.id,
    };
  }

  // ═══════════════════════════════════════════════════
  // BALANCE
  // ═══════════════════════════════════════════════════

  async getBalance(userId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
    lastTransaction: { type: string; amount: number; description?: string; createdAt: Date } | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalCoins: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // Get totals from transactions
    const [earnedResult, spentResult, lastTx] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { type: true, amount: true, description: true, createdAt: true },
      }),
    ]);

    return {
      balance: user.totalCoins,
      totalEarned: earnedResult._sum.amount || 0,
      totalSpent: Math.abs(spentResult._sum.amount || 0),
      lastTransaction: lastTx
        ? {
            type: lastTx.type,
            amount: lastTx.amount,
            description: lastTx.description || undefined,
            createdAt: lastTx.createdAt,
          }
        : null,
    };
  }

  // ═══════════════════════════════════════════════════
  // TRANSACTION HISTORY
  // ═══════════════════════════════════════════════════

  async getTransactions(
    userId: string,
    options: {
      type?: TransactionType;
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
    } = {},
  ): Promise<{
    transactions: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { type, page = 1, limit = 20, from, to } = options;

    const where: any = { userId };
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          source: true,
          description: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════
  // TRANSACTION SUMMARY (period)
  // ═══════════════════════════════════════════════════

  async getTransactionSummary(
    userId: string,
    period: 'today' | 'week' | 'month' | 'all' = 'all',
  ): Promise<{
    period: string;
    earned: number;
    spent: number;
    net: number;
    byType: Record<string, { earned: number; spent: number }>;
    transactionCount: number;
  }> {
    const now = new Date();
    let fromDate: Date | undefined;

    switch (period) {
      case 'today':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        fromDate = undefined;
    }

    const where: any = { userId };
    if (fromDate) where.createdAt = { gte: fromDate };

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: { type: true, amount: true },
    });

    const byType: Record<string, { earned: number; spent: number }> = {};
    let totalEarned = 0;
    let totalSpent = 0;

    for (const tx of transactions) {
      if (!byType[tx.type]) {
        byType[tx.type] = { earned: 0, spent: 0 };
      }
      if (tx.amount > 0) {
        totalEarned += tx.amount;
        byType[tx.type].earned += tx.amount;
      } else {
        totalSpent += Math.abs(tx.amount);
        byType[tx.type].spent += Math.abs(tx.amount);
      }
    }

    return {
      period,
      earned: totalEarned,
      spent: totalSpent,
      net: totalEarned - totalSpent,
      byType,
      transactionCount: transactions.length,
    };
  }

  // ═══════════════════════════════════════════════════
  // SHOP — CATALOG
  // ═══════════════════════════════════════════════════

  async getShopCatalog(
    userId: string,
    category?: ShopItemCategory,
  ): Promise<{
    items: any[];
    userCoins: number;
    categories: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalCoins: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // Get purchase counts per item for this user
    const purchases = await this.prisma.userShopPurchase.groupBy({
      by: ['itemId'],
      where: { userId },
      _sum: { quantity: true },
    });

    const purchaseMap: Record<string, number> = {};
    for (const p of purchases) {
      purchaseMap[p.itemId] = p._sum.quantity || 0;
    }

    let catalog = SHOP_CATALOG.filter((item) => item.isActive);

    // Filter limited items that expired
    const now = new Date();
    catalog = catalog.filter((item) => {
      if (item.isLimited && item.expiresAt) {
        return new Date(item.expiresAt) > now;
      }
      return true;
    });

    if (category) {
      catalog = catalog.filter((item) => item.category === category);
    }

    const categories = [...new Set(SHOP_CATALOG.map((i) => i.category))];

    const items = catalog.map((item) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: item.rarity,
      price: item.price,
      imageUrl: item.imageUrl,
      canAfford: user.totalCoins >= item.price,
      owned: purchaseMap[item.code] || 0,
      maxReached: item.maxPerUser ? (purchaseMap[item.code] || 0) >= item.maxPerUser : false,
      isLimited: item.isLimited || false,
    }));

    return {
      items,
      userCoins: user.totalCoins,
      categories,
    };
  }

  // ═══════════════════════════════════════════════════
  // SHOP — BUY ITEM
  // ═══════════════════════════════════════════════════

  async buyItem(
    userId: string,
    itemCode: string,
    quantity: number = 1,
  ): Promise<{
    success: boolean;
    item: { code: string; name: string; quantity: number; totalCost: number };
    balance: number;
    effect: Record<string, any>;
  }> {
    if (quantity < 1 || quantity > 10) {
      throw new BadRequestException('Quantity must be between 1 and 10');
    }

    const itemDef = SHOP_CATALOG.find((i) => i.code === itemCode && i.isActive);
    if (!itemDef) {
      throw new NotFoundException(`Shop item not found: ${itemCode}`);
    }

    const totalCost = itemDef.price * quantity;

    this.logger.log(`BuyItem: userId=${userId}, item=${itemCode}, qty=${quantity}, cost=${totalCost}`);

    // Check max per user
    if (itemDef.maxPerUser) {
      const existingPurchases = await this.prisma.userShopPurchase.aggregate({
        where: { userId, itemId: itemDef.code },
        _sum: { quantity: true },
      });
      const currentOwned = existingPurchases._sum.quantity || 0;
      if (currentOwned + quantity > itemDef.maxPerUser) {
        throw new BadRequestException(
          `Max purchases reached for ${itemDef.name}. Owned: ${currentOwned}, max: ${itemDef.maxPerUser}`,
        );
      }
    }

    // Spend coins (creates transaction)
    const spendResult = await this.spendCoins(
      userId,
      totalCost,
      'shop_purchase',
      itemCode,
      `Compraste ${quantity}x ${itemDef.name}`,
      { itemCode, itemName: itemDef.name, quantity, category: itemDef.category },
    );

    // Record the purchase
    await this.prisma.userShopPurchase.create({
      data: {
        userId,
        itemId: itemDef.code,
        quantity,
        totalCost,
      },
    });

    // Apply effect
    await this.applyItemEffect(userId, itemDef, quantity);

    this.logger.log(`BuyItem OK: userId=${userId}, ${quantity}x ${itemDef.name}, spent=${totalCost}`);

    return {
      success: true,
      item: {
        code: itemDef.code,
        name: itemDef.name,
        quantity,
        totalCost,
      },
      balance: spendResult.remaining,
      effect: itemDef.effect,
    };
  }

  // ═══════════════════════════════════════════════════
  // SHOP — PURCHASE HISTORY
  // ═══════════════════════════════════════════════════

  async getPurchaseHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    purchases: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const [purchases, total] = await Promise.all([
      this.prisma.userShopPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          item: {
            select: {
              code: true,
              name: true,
              category: true,
              rarity: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.userShopPurchase.count({ where: { userId } }),
    ]);

    return {
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════
  // APPLY ITEM EFFECT
  // ═══════════════════════════════════════════════════

  private async applyItemEffect(
    userId: string,
    itemDef: ShopItemDef,
    quantity: number,
  ): Promise<void> {
    const effect = itemDef.effect;

    switch (effect.type) {
      case 'streak_protection': {
        const protections = effect.value * quantity;
        await this.prisma.user.update({
          where: { id: userId },
          data: { streakProtections: { increment: protections } },
        });
        this.logger.log(`Applied streak protection: +${protections} for userId=${userId}`);
        break;
      }

      case 'theme':
      case 'boti_expression':
      case 'avatar_frame':
      case 'profile_title': {
        // Store in user preferences or activity log
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: 'cosmetic_equipped',
            details: {
              type: effect.type,
              key: effect.key,
              value: effect.value,
              itemName: itemDef.name,
            },
          },
        });
        this.logger.log(`Applied cosmetic: ${effect.type}=${effect.value} for userId=${userId}`);
        break;
      }

      case 'xp_boost':
      case 'coins_boost': {
        // Store active boost in activity log (frontend reads from here)
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: 'boost_activated',
            details: {
              type: effect.type,
              multiplier: effect.multiplier,
              durationHours: effect.durationHours,
              durationQuests: effect.durationQuests,
              itemName: itemDef.name,
              expiresAt: effect.durationHours
                ? new Date(Date.now() + effect.durationHours * 60 * 60 * 1000).toISOString()
                : null,
            },
          },
        });
        this.logger.log(`Activated boost: ${effect.type} x${effect.multiplier} for userId=${userId}`);
        break;
      }

      case 'mystery_collectible': {
        // TODO: When collection module has random unlock, integrate here
        this.logger.log(`Mystery box purchased for userId=${userId} — awaiting collection integration`);
        break;
      }

      default:
        this.logger.warn(`Unknown effect type: ${effect.type} for item ${itemDef.code}`);
    }
  }

  // ═══════════════════════════════════════════════════
  // ADMIN — GRANT / DEDUCT COINS
  // ═══════════════════════════════════════════════════

  async adminGrantCoins(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ granted: number; totalCoins: number }> {
    if (amount <= 0 || amount > 100000) {
      throw new BadRequestException('Amount must be between 1 and 100,000');
    }

    this.logger.log(`AdminGrantCoins: userId=${userId}, +${amount}, reason="${reason}"`);

    const result = await this.earnCoins(
      userId,
      amount,
      'admin_grant',
      'admin',
      `Admin grant: ${reason}`,
      { reason, adminAction: true },
    );

    return { granted: result.earned, totalCoins: result.totalCoins };
  }

  async adminDeductCoins(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ deducted: number; remaining: number }> {
    if (amount <= 0 || amount > 100000) {
      throw new BadRequestException('Amount must be between 1 and 100,000');
    }

    this.logger.log(`AdminDeductCoins: userId=${userId}, -${amount}, reason="${reason}"`);

    const result = await this.spendCoins(
      userId,
      amount,
      'admin_deduction',
      'admin',
      `Admin deduction: ${reason}`,
      { reason, adminAction: true },
    );

    return { deducted: result.spent, remaining: result.remaining };
  }

  // ═══════════════════════════════════════════════════
  // STREAK COIN BONUS (called by quests)
  // ═══════════════════════════════════════════════════

  calculateStreakBonus(baseCoins: number, streakDays: number): number {
    return streakCoinBonus(baseCoins, streakDays);
  }

  // ═══════════════════════════════════════════════════
  // ECONOMY STATS (admin)
  // ═══════════════════════════════════════════════════

  async getEconomyStats(): Promise<{
    totalCoinsInCirculation: number;
    totalEarned: number;
    totalSpent: number;
    topEarners: any[];
    recentTransactions: number;
    avgBalance: number;
    totalUsers: number;
  }> {
    const [totalResult, earnedResult, spentResult, topEarners, recentCount, userCount] =
      await Promise.all([
        this.prisma.user.aggregate({ _sum: { totalCoins: true }, where: { deletedAt: null } }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { amount: { gt: 0 } },
        }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { amount: { lt: 0 } },
        }),
        this.prisma.user.findMany({
          where: { deletedAt: null },
          orderBy: { totalCoins: 'desc' },
          take: 10,
          select: {
            id: true,
            username: true,
            level: true,
            totalCoins: true,
            totalXp: true,
          },
        }),
        this.prisma.transaction.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.user.count({ where: { deletedAt: null } }),
      ]);

    return {
      totalCoinsInCirculation: totalResult._sum.totalCoins || 0,
      totalEarned: earnedResult._sum.amount || 0,
      totalSpent: Math.abs(spentResult._sum.amount || 0),
      topEarners: topEarners.map((u, i) => ({ rank: i + 1, ...u })),
      recentTransactions: recentCount,
      avgBalance: userCount > 0 ? Math.round((totalResult._sum.totalCoins || 0) / userCount) : 0,
      totalUsers: userCount,
    };
  }
}
