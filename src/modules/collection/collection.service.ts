import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CollectibleType, CollectibleRarity, CollectibleSource, Prisma } from '../../generated/prisma/client';

// ═══════════════════════════════════════════════════════════
// COLLECTIBLE DEFINITIONS — Seed data
// ═══════════════════════════════════════════════════════════

interface CollectibleDef {
  code: string;
  name: string;
  description: string;
  type: CollectibleType;
  rarity: CollectibleRarity;
  requirement: { type: string; value: number; category?: string; [key: string]: any };
  xpReward: number;
  coinsReward: number;
}

const ALL_COLLECTIBLES: CollectibleDef[] = [
  // ─── 🌱 PLANTAS ────────────────────────────────────
  { code: 'plant_sprout', name: 'Primer Brote', description: 'Completaste tu primera misión. Una pequeña planta nace.', type: 'plant', rarity: 'common', requirement: { type: 'quests_completed', value: 1 }, xpReward: 10, coinsReward: 5 },
  { code: 'plant_daisy', name: 'Margarita', description: 'Completaste 5 misiones. Una flor fresca y alegre.', type: 'plant', rarity: 'common', requirement: { type: 'quests_completed', value: 5 }, xpReward: 20, coinsReward: 10 },
  { code: 'plant_fern', name: 'Helecho', description: 'Completaste 15 misiones. Un helecho robusto y elegante.', type: 'plant', rarity: 'uncommon', requirement: { type: 'quests_completed', value: 15 }, xpReward: 40, coinsReward: 20 },
  { code: 'plant_cactus', name: 'Cactus Rey', description: 'Completaste 30 misiones. Resistente y florece raramente.', type: 'plant', rarity: 'rare', requirement: { type: 'quests_completed', value: 30 }, xpReward: 80, coinsReward: 40 },
  { code: 'plant_bonsai', name: 'Bonsai Sabio', description: 'Completaste 50 misiones. Un bonsai que cuenta historias.', type: 'plant', rarity: 'epic', requirement: { type: 'quests_completed', value: 50 }, xpReward: 150, coinsReward: 75 },
  { code: 'plant_tree_of_life', name: 'Árbol de la Vida', description: 'Completaste 100 misiones. El árbol más antiguo del bosque.', type: 'plant', rarity: 'legendary', requirement: { type: 'quests_completed', value: 100 }, xpReward: 500, coinsReward: 250 },

  // ─── 🏅 INSIGNIAS ──────────────────────────────────
  { code: 'badge_nature_10', name: 'Explorador Verde', description: '10 misiones de naturaleza completadas.', type: 'badge', rarity: 'uncommon', requirement: { type: 'category_quests', value: 10, category: 'nature' }, xpReward: 50, coinsReward: 25 },
  { code: 'badge_creativity_10', name: 'Alma Creativa', description: '10 misiones de creatividad completadas.', type: 'badge', rarity: 'uncommon', requirement: { type: 'category_quests', value: 10, category: 'creativity' }, xpReward: 50, coinsReward: 25 },
  { code: 'badge_kindness_10', name: 'Corazón de Oro', description: '10 misiones de bondad completadas.', type: 'badge', rarity: 'uncommon', requirement: { type: 'category_quests', value: 10, category: 'kindness' }, xpReward: 50, coinsReward: 25 },
  { code: 'badge_movement_10', name: 'Atleta Haru', description: '10 misiones de movimiento completadas.', type: 'badge', rarity: 'uncommon', requirement: { type: 'category_quests', value: 10, category: 'movement' }, xpReward: 50, coinsReward: 25 },
  { code: 'badge_social_10', name: 'Alma Social', description: '10 misiones sociales completadas.', type: 'badge', rarity: 'uncommon', requirement: { type: 'category_quests', value: 10, category: 'social' }, xpReward: 50, coinsReward: 25 },
  { code: 'badge_photography_10', name: 'Ojo de Águila', description: '10 misiones de fotografía completadas.', type: 'badge', rarity: 'uncommon', requirement: { type: 'category_quests', value: 10, category: 'photography' }, xpReward: 50, coinsReward: 25 },
  { code: 'badge_all_categories', name: 'Explorador Total', description: 'Completaste al menos 1 misión de cada categoría.', type: 'badge', rarity: 'rare', requirement: { type: 'all_categories', value: 1 }, xpReward: 200, coinsReward: 100 },
  { code: 'badge_perfectionist', name: 'Perfeccionista', description: 'Completaste 5 misiones难度 hard.', type: 'badge', rarity: 'rare', requirement: { type: 'hard_quests', value: 5 }, xpReward: 150, coinsReward: 75 },

  // ─── 🎒 OBJETOS ────────────────────────────────────
  { code: 'obj_compass', name: 'Brújula', description: 'Siempre apunta a la próxima aventura.', type: 'object', rarity: 'common', requirement: { type: 'quests_completed', value: 3 }, xpReward: 15, coinsReward: 8 },
  { code: 'obj_magnifying_glass', name: 'Lupa', description: 'Para descubrir detalles que otros no ven.', type: 'object', rarity: 'common', requirement: { type: 'quests_completed', value: 8 }, xpReward: 25, coinsReward: 12 },
  { code: 'obj_camera', name: 'Cámara Vintage', description: 'Captura momentos inolvidables.', type: 'object', rarity: 'uncommon', requirement: { type: 'category_quests', value: 5, category: 'photography' }, xpReward: 40, coinsReward: 20 },
  { code: 'obj_journal', name: 'Diario de Aventuras', description: 'Donde se guardan los recuerdos más preciados.', type: 'object', rarity: 'uncommon', requirement: { type: 'diary_entries', value: 10 }, xpReward: 40, coinsReward: 20 },
  { code: 'obj_tent', name: 'Carpa Viajera', description: 'Para las noches bajo las estrellas.', type: 'object', rarity: 'rare', requirement: { type: 'quests_completed', value: 25 }, xpReward: 80, coinsReward: 40 },
  { code: 'obj_binoculars', name: 'Prismáticos', description: 'Para ver más lejos en cada aventura.', type: 'object', rarity: 'rare', requirement: { type: 'streak', value: 14 }, xpReward: 100, coinsReward: 50 },
  { code: 'obj_backpack', name: 'Mochila Legendaria', description: 'Contiene todo lo necesario para cualquier aventura.', type: 'object', rarity: 'epic', requirement: { type: 'level', value: 20 }, xpReward: 200, coinsReward: 100 },
  { code: 'obj_star_map', name: 'Mapa Estelar', description: 'Muestra caminos que solo los exploradores ven.', type: 'object', rarity: 'legendary', requirement: { type: 'quests_completed', value: 75 }, xpReward: 400, coinsReward: 200 },

  // ─── 📮 POSTALES ───────────────────────────────────
  { code: 'postcard_first_quest', name: 'Postal: Primer Paso', description: 'Recuerda tu primera misión en Haru.', type: 'postcard', rarity: 'common', requirement: { type: 'quests_completed', value: 1 }, xpReward: 10, coinsReward: 5 },
  { code: 'postcard_nature', name: 'Postal: Bosque Encantado', description: 'Una postal del bosque más mágico.', type: 'postcard', rarity: 'uncommon', requirement: { type: 'category_quests', value: 5, category: 'nature' }, xpReward: 30, coinsReward: 15 },
  { code: 'postcard_sunset', name: 'Postal: Atardecer Dorado', description: 'El atardecer más hermoso que viste.', type: 'postcard', rarity: 'uncommon', requirement: { type: 'quests_completed', value: 10 }, xpReward: 30, coinsReward: 15 },
  { code: 'postcard_summit', name: 'Postal: Cumbre Alcanzada', description: 'La vista desde la cima lo vale todo.', type: 'postcard', rarity: 'rare', requirement: { type: 'hard_quests', value: 3 }, xpReward: 60, coinsReward: 30 },
  { code: 'postcard_ocean', name: 'Postal: Mar Infinito', description: 'El sonido de las olas nunca se olvida.', type: 'postcard', rarity: 'rare', requirement: { type: 'streak', value: 7 }, xpReward: 60, coinsReward: 30 },
  { code: 'postcard_stars', name: 'Postal: Noche Estrellada', description: 'Millones de estrellas, una por cada misión.', type: 'postcard', rarity: 'epic', requirement: { type: 'quests_completed', value: 40 }, xpReward: 120, coinsReward: 60 },

  // ─── ⭐ ESPECIALES ─────────────────────────────────
  { code: 'special_founding', name: 'Pionero de Haru', description: 'Estuviste entre los primeros usuarios de Haru.', type: 'special', rarity: 'legendary', requirement: { type: 'early_adopter', value: 1 }, xpReward: 500, coinsReward: 250 },
  { code: 'special_streak_30', name: 'Llama Eterna', description: '30 días de racha. Tu dedicación es legendaria.', type: 'special', rarity: 'legendary', requirement: { type: 'streak', value: 30 }, xpReward: 500, coinsReward: 250 },
  { code: 'special_level_25', name: 'Maestro Explorador', description: 'Alcanzaste nivel 25. Pocos llegan aquí.', type: 'special', rarity: 'epic', requirement: { type: 'level', value: 25 }, xpReward: 300, coinsReward: 150 },
  { code: 'special_speedrun', name: 'Velocista', description: 'Completaste 5 misiones en un solo día.', type: 'special', rarity: 'rare', requirement: { type: 'quests_in_day', value: 5 }, xpReward: 100, coinsReward: 50 },
  { code: 'special_night_owl', name: 'Búho nocturno coleccionista', description: 'Completaste una misión después de medianoche.', type: 'special', rarity: 'uncommon', requirement: { type: 'late_night_quest', value: 1 }, xpReward: 30, coinsReward: 15 },
  { code: 'special_early_bird', name: 'Madrugador incansable', description: 'Completaste una misión antes de las 7am.', type: 'special', rarity: 'uncommon', requirement: { type: 'early_morning_quest', value: 1 }, xpReward: 30, coinsReward: 15 },
];

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(private prisma: PrismaService) {}

  // ─── GET FULL CATALOG ─────────────────────────────
  async getCatalog(userId: string) {
    this.logger.log(`GetCatalog: userId=${userId}`);

    const [collectibles, userCollectibles] = await Promise.all([
      this.prisma.collectible.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { rarity: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.userCollectible.findMany({
        where: { userId },
        select: { collectibleId: true, unlockedAt: true, source: true },
      }),
    ]);

    const unlockedMap = new Map(
      userCollectibles.map((uc) => [uc.collectibleId, { unlockedAt: uc.unlockedAt, source: uc.source }]),
    );

    // Group by type
    const byType: Record<string, any[]> = {};
    for (const c of collectibles) {
      if (!byType[c.type]) byType[c.type] = [];
      const unlocked = unlockedMap.get(c.id);
      byType[c.type].push({
        ...c,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt || null,
        source: unlocked?.source || null,
      });
    }

    // Stats
    const total = collectibles.length;
    const unlocked = userCollectibles.length;
    const byRarity: Record<string, { total: number; unlocked: number }> = {};

    for (const c of collectibles) {
      if (!byRarity[c.rarity]) byRarity[c.rarity] = { total: 0, unlocked: 0 };
      byRarity[c.rarity].total++;
      if (unlockedMap.has(c.id)) byRarity[c.rarity].unlocked++;
    }

    const typeEmojis: Record<string, string> = {
      badge: '🏅', plant: '🌱', object: '🎒', postcard: '📮', special: '⭐',
    };

    return {
      catalog: Object.entries(byType).map(([type, items]) => ({
        type,
        emoji: typeEmojis[type] || '🎯',
        items,
        count: items.length,
        unlockedCount: items.filter((i) => i.unlocked).length,
      })),
      stats: {
        total,
        unlocked,
        locked: total - unlocked,
        percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
        byRarity: Object.entries(byRarity).map(([rarity, data]) => ({
          rarity,
          ...data,
          percentage: data.total > 0 ? Math.round((data.unlocked / data.total) * 100) : 0,
        })),
      },
    };
  }

  // ─── GET USER COLLECTION ──────────────────────────
  async getUserCollection(userId: string, type?: string, unseenOnly: boolean = false) {
    this.logger.log(`GetUserCollection: userId=${userId}, type=${type || 'all'}, unseen=${unseenOnly}`);

    const where: Prisma.UserCollectibleWhereInput = { userId };
    if (unseenOnly) where.seen = false;

    const userCollectibles = await this.prisma.userCollectible.findMany({
      where,
      include: {
        collectible: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    let filtered = userCollectibles;
    if (type) {
      filtered = userCollectibles.filter((uc) => uc.collectible.type === type);
    }

    const typeEmojis: Record<string, string> = {
      badge: '🏅', plant: '🌱', object: '🎒', postcard: '📮', special: '⭐',
    };

    const rarityColors: Record<string, string> = {
      common: '#9CA3AF',
      uncommon: '#22C55E',
      rare: '#3B82F6',
      epic: '#A855F7',
      legendary: '#F59E0B',
    };

    return {
      items: filtered.map((uc) => ({
        id: uc.collectible.id,
        code: uc.collectible.code,
        name: uc.collectible.name,
        description: uc.collectible.description,
        type: uc.collectible.type,
        typeEmoji: typeEmojis[uc.collectible.type] || '🎯',
        rarity: uc.collectible.rarity,
        rarityColor: rarityColors[uc.collectible.rarity] || '#9CA3AF',
        imageUrl: uc.collectible.imageUrl,
        source: uc.source,
        unlockedAt: uc.unlockedAt,
        seen: uc.seen,
      })),
      count: filtered.length,
    };
  }

  // ─── GET UNSEEN COUNT ─────────────────────────────
  async getUnseenCount(userId: string) {
    const count = await this.prisma.userCollectible.count({
      where: { userId, seen: false },
    });
    return { unseenCount: count };
  }

  // ─── MARK AS SEEN ────────────────────────────────
  async markAsSeen(userId: string, collectibleId: string) {
    this.logger.log(`MarkAsSeen: userId=${userId}, collectibleId=${collectibleId}`);

    await this.prisma.userCollectible.updateMany({
      where: { userId, collectibleId },
      data: { seen: true },
    });

    return { message: 'Marked as seen' };
  }

  // ─── MARK ALL AS SEEN ────────────────────────────
  async markAllAsSeen(userId: string) {
    this.logger.log(`MarkAllAsSeen: userId=${userId}`);

    await this.prisma.userCollectible.updateMany({
      where: { userId, seen: false },
      data: { seen: true },
    });

    return { message: 'All collectibles marked as seen' };
  }

  // ─── CHECK AND UNLOCK COLLECTIBLES ────────────────
  async checkAndUnlock(userId: string, source: string = 'quest'): Promise<{
    newUnlocks: Array<{ code: string; name: string; type: string; rarity: string }>;
  }> {
    this.logger.log(`CheckAndUnlock: userId=${userId}`);

    const newUnlocks: Array<{ code: string; name: string; type: string; rarity: string }> = [];

    // Load user data
    const [user, completedQuests, streak, userCollectibles] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, totalXp: true, createdAt: true },
      }),
      this.prisma.userQuest.findMany({
        where: { userId, status: 'completed' },
        select: {
          quest: { select: { category: true, difficulty: true } },
          completedAt: true,
        },
      }),
      this.prisma.streak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      this.prisma.userCollectible.findMany({
        where: { userId },
        select: { collectibleId: true },
      }),
    ]);

    if (!user) return { newUnlocks: [] };

    const unlockedIds = new Set(userCollectibles.map((uc) => uc.collectibleId));

    // Pre-compute stats
    const totalQuests = completedQuests.length;
    const questsByCategory: Record<string, number> = {};
    const categoriesCompleted = new Set<string>();
    let hardQuests = 0;

    for (const uq of completedQuests) {
      questsByCategory[uq.quest.category] = (questsByCategory[uq.quest.category] || 0) + 1;
      categoriesCompleted.add(uq.quest.category);
      if (uq.quest.difficulty === 'hard') hardQuests++;
    }

    // Check quests completed today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayQuests = completedQuests.filter(
      (uq) => uq.completedAt && uq.completedAt >= today,
    ).length;

    // Check diary entries count
    const diaryCount = await this.prisma.diaryEntry.count({
      where: { userId, isHidden: false },
    });

    // Check early adopter (first 1000 users)
    const userCount = await this.prisma.user.count();
    const isEarlyAdopter = userCount <= 1000;

    // Hour checks
    const latestQuest = completedQuests[completedQuests.length - 1];
    const questHour = latestQuest?.completedAt?.getHours() ?? 12;

    for (const collectible of ALL_COLLECTIBLES) {
      // Skip if already unlocked
      const dbCollectible = await this.prisma.collectible.findUnique({
        where: { code: collectible.code },
      });
      if (dbCollectible && unlockedIds.has(dbCollectible.id)) continue;

      // Check requirement
      const meets = this.checkRequirement(
        collectible.requirement,
        user,
        totalQuests,
        streak?.longestStreak || 0,
        streak?.currentStreak || 0,
        questsByCategory,
        categoriesCompleted.size,
        hardQuests,
        todayQuests,
        diaryCount,
        isEarlyAdopter,
        questHour,
      );

      if (!meets) continue;

      // Ensure collectible exists in DB
      let dbId: string;
      if (dbCollectible) {
        dbId = dbCollectible.id;
      } else {
        const created = await this.prisma.collectible.create({
          data: {
            code: collectible.code,
            name: collectible.name,
            description: collectible.description,
            type: collectible.type,
            rarity: collectible.rarity,
            requirement: collectible.requirement,
            xpReward: collectible.xpReward,
            coinsReward: collectible.coinsReward,
          },
        });
        dbId = created.id;
      }

      // Check not already unlocked (double-check)
      const alreadyUnlocked = await this.prisma.userCollectible.findUnique({
        where: { userId_collectibleId: { userId, collectibleId: dbId } },
      });
      if (alreadyUnlocked) continue;

      // Unlock!
      await this.prisma.userCollectible.create({
        data: {
          userId,
          collectibleId: dbId,
          source: source as any,
        },
      });

      newUnlocks.push({
        code: collectible.code,
        name: collectible.name,
        type: collectible.type,
        rarity: collectible.rarity,
      });

      this.logger.log(`Collectible unlocked: ${collectible.code} for userId=${userId}`);
    }

    return { newUnlocks };
  }

  // ─── UNLOCK RANDOM COLLECTIBLE (mystery box) ─────
  async unlockRandomCollectible(
    userId: string,
    minRarity: CollectibleRarity = 'common',
    source: CollectibleSource = 'purchase',
  ): Promise<{
    unlocked: boolean;
    collectible?: { code: string; name: string; type: string; rarity: string };
    message: string;
  }> {
    this.logger.log(`UnlockRandomCollectible: userId=${userId}, minRarity=${minRarity}`);

    // Rarity ordering for the >= comparison
    const rarityRank: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
    };
    const minRank = rarityRank[minRarity] ?? 0;

    // Collectibles the user already owns
    const owned = await this.prisma.userCollectible.findMany({
      where: { userId },
      select: { collectibleId: true },
    });
    const ownedIds = new Set(owned.map((o) => o.collectibleId));

    // Eligible: active, rarity >= minRarity, not owned
    const all = await this.prisma.collectible.findMany({
      where: { isActive: true },
    });
    const candidates = all.filter((c) => {
      if (ownedIds.has(c.id)) return false;
      return (rarityRank[c.rarity] ?? 0) >= minRank;
    });

    if (candidates.length === 0) {
      this.logger.log(`UnlockRandomCollectible: no candidates left for userId=${userId}`);
      return {
        unlocked: false,
        message: 'No hay coleccionables disponibles en esa rareza (ya los tienes todos).',
      };
    }

    // Pick a random one
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    await this.prisma.userCollectible.create({
      data: {
        userId,
        collectibleId: pick.id,
        source,
      },
    });

    this.logger.log(`Collectible unlocked (random): ${pick.code} (${pick.rarity}) for userId=${userId}`);

    return {
      unlocked: true,
      collectible: {
        code: pick.code,
        name: pick.name,
        type: pick.type,
        rarity: pick.rarity,
      },
      message: `🎁 ¡Conseguiste: ${pick.name} (${pick.rarity})!`,
    };
  }

  // ─── SEED COLLECTIBLES ───────────────────────────
  async seedCollectibles() {
    this.logger.log('Seeding collectibles...');

    let created = 0;
    let existing = 0;

    for (const c of ALL_COLLECTIBLES) {
      const exists = await this.prisma.collectible.findUnique({ where: { code: c.code } });
      if (exists) {
        existing++;
        continue;
      }

      await this.prisma.collectible.create({
        data: {
          code: c.code,
          name: c.name,
          description: c.description,
          type: c.type,
          rarity: c.rarity,
          requirement: c.requirement,
          xpReward: c.xpReward,
          coinsReward: c.coinsReward,
        },
      });
      created++;
    }

    return {
      created,
      existing,
      total: ALL_COLLECTIBLES.length,
      message: `🌱 ${created} collectibles created, ${existing} already existed`,
    };
  }

  // ─── GET COLLECTION STATS ─────────────────────────
  async getStats(userId: string) {
    this.logger.log(`GetStats: userId=${userId}`);

    const [totalCollectibles, userCollectibles, byType, byRarity] = await Promise.all([
      this.prisma.collectible.count({ where: { isActive: true } }),
      this.prisma.userCollectible.findMany({
        where: { userId },
        include: { collectible: { select: { name: true, type: true, rarity: true } } },
      }),
      this.prisma.userCollectible.groupBy({
        by: ['collectibleId'],
        where: { userId },
      }),
      this.prisma.userCollectible.findMany({
        where: { userId },
        include: { collectible: { select: { name: true, type: true, rarity: true } } },
      }),
    ]);

    // Group by type
    const typeCounts: Record<string, number> = {};
    for (const uc of userCollectibles) {
      typeCounts[uc.collectible.type] = (typeCounts[uc.collectible.type] || 0) + 1;
    }

    // Group by rarity
    const rarityCounts: Record<string, number> = {};
    for (const uc of userCollectibles) {
      rarityCounts[uc.collectible.rarity] = (rarityCounts[uc.collectible.rarity] || 0) + 1;
    }

    // Get total per type from catalog
    const totalByType = await this.prisma.collectible.groupBy({
      by: ['type'],
      where: { isActive: true },
      _count: { id: true },
    });

    const totalByRarity = await this.prisma.collectible.groupBy({
      by: ['rarity'],
      where: { isActive: true },
      _count: { id: true },
    });

    // Recent unlocks
    const recent = userCollectibles
      .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
      .slice(0, 5)
      .map((uc) => ({
        name: uc.collectible.name,
        type: uc.collectible.type,
        rarity: uc.collectible.rarity,
        unlockedAt: uc.unlockedAt,
      }));

    return {
      totalCollectibles,
      unlockedCount: userCollectibles.length,
      percentage: totalCollectibles > 0 ? Math.round((userCollectibles.length / totalCollectibles) * 100) : 0,
      byType: totalByType.map((t) => ({
        type: t.type,
        unlocked: typeCounts[t.type] || 0,
        total: t._count.id,
        percentage: t._count.id > 0 ? Math.round(((typeCounts[t.type] || 0) / t._count.id) * 100) : 0,
      })),
      byRarity: totalByRarity.map((r) => ({
        rarity: r.rarity,
        unlocked: rarityCounts[r.rarity] || 0,
        total: r._count.id,
      })),
      recentUnlocks: recent,
    };
  }

  // ─── PRIVATE: Check Requirement ───────────────────
  private checkRequirement(
    req: { type: string; value: number; [key: string]: any },
    user: any,
    totalQuests: number,
    longestStreak: number,
    currentStreak: number,
    questsByCategory: Record<string, number>,
    uniqueCategories: number,
    hardQuests: number,
    todayQuests: number,
    diaryCount: number,
    isEarlyAdopter: boolean,
    questHour: number,
  ): boolean {
    switch (req.type) {
      case 'quests_completed':
        return totalQuests >= req.value;
      case 'category_quests':
        return (questsByCategory[req.category || ''] || 0) >= req.value;
      case 'all_categories':
        return uniqueCategories >= 9;
      case 'hard_quests':
        return hardQuests >= req.value;
      case 'streak':
        return longestStreak >= req.value;
      case 'current_streak':
        return currentStreak >= req.value;
      case 'level':
        return user.level >= req.value;
      case 'diary_entries':
        return diaryCount >= req.value;
      case 'early_adopter':
        return isEarlyAdopter;
      case 'quests_in_day':
        return todayQuests >= req.value;
      case 'early_morning_quest':
        return questHour >= 5 && questHour < 7;
      case 'late_night_quest':
        return questHour >= 0 && questHour < 5;
      default:
        return false;
    }
  }
}
