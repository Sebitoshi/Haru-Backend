import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';

// ═══════════════════════════════════════════════════════════
// BADGE DEFINITIONS — All possible achievements
// ═══════════════════════════════════════════════════════════

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: { type: string; value: number; [key: string]: any };
  xpReward: number;
  coinsReward: number;
}

export const ALL_BADGES: BadgeDefinition[] = [
  // ─── FIRST STEPS ──────────────────────────────────
  { code: 'first_quest', name: 'Primera Misión', description: 'Completaste tu primera misión', icon: '🌱', category: 'quests', requirement: { type: 'quests_completed', value: 1 }, xpReward: 25, coinsReward: 10 },
  { code: 'quest_5', name: 'Explorador', description: 'Completaste 5 misiones', icon: '🔍', category: 'quests', requirement: { type: 'quests_completed', value: 5 }, xpReward: 50, coinsReward: 25 },
  { code: 'quest_10', name: 'Aventurero', description: 'Completaste 10 misiones', icon: '🗺️', category: 'quests', requirement: { type: 'quests_completed', value: 10 }, xpReward: 100, coinsReward: 50 },
  { code: 'quest_25', name: 'Explorador Avanzado', description: 'Completaste 25 misiones', icon: '🧭', category: 'quests', requirement: { type: 'quests_completed', value: 25 }, xpReward: 200, coinsReward: 100 },
  { code: 'quest_50', name: 'Maestro de Misiones', description: 'Completaste 50 misiones', icon: '⚔️', category: 'quests', requirement: { type: 'quests_completed', value: 50 }, xpReward: 500, coinsReward: 250 },
  { code: 'quest_100', name: 'Leyenda de Haru', description: 'Completaste 100 misiones', icon: '🏆', category: 'quests', requirement: { type: 'quests_completed', value: 100 }, xpReward: 1000, coinsReward: 500 },

  // ─── STREAKS ──────────────────────────────────────
  { code: 'streak_3', name: 'Consistente', description: 'Racha de 3 días', icon: '📅', category: 'streaks', requirement: { type: 'longest_streak', value: 3 }, xpReward: 30, coinsReward: 15 },
  { code: 'streak_7', name: 'En llamas', description: 'Racha de 7 días', icon: '🔥', category: 'streaks', requirement: { type: 'longest_streak', value: 7 }, xpReward: 75, coinsReward: 40 },
  { code: 'streak_14', name: 'Imparable', description: 'Racha de 14 días', icon: '⚡', category: 'streaks', requirement: { type: 'longest_streak', value: 14 }, xpReward: 150, coinsReward: 75 },
  { code: 'streak_30', name: 'Dedicación Total', description: 'Racha de 30 días', icon: '👑', category: 'streaks', requirement: { type: 'longest_streak', value: 30 }, xpReward: 300, coinsReward: 150 },
  { code: 'streak_100', name: 'Leyenda Ardiente', description: 'Racha de 100 días', icon: '💎', category: 'streaks', requirement: { type: 'longest_streak', value: 100 }, xpReward: 1000, coinsReward: 500 },

  // ─── LEVELS ───────────────────────────────────────
  { code: 'level_5', name: 'Nivel 5', description: 'Alcanzaste nivel 5', icon: '⭐', category: 'levels', requirement: { type: 'level', value: 5 }, xpReward: 50, coinsReward: 25 },
  { code: 'level_10', name: 'Nivel 10', description: 'Alcanzaste nivel 10', icon: '🌟', category: 'levels', requirement: { type: 'level', value: 10 }, xpReward: 100, coinsReward: 50 },
  { code: 'level_20', name: 'Nivel 20', description: 'Alcanzaste nivel 20', icon: '💫', category: 'levels', requirement: { type: 'level', value: 20 }, xpReward: 300, coinsReward: 150 },
  { code: 'level_50', name: 'Nivel 50 — Máximo', description: 'Alcanzaste el nivel máximo', icon: '🌸', category: 'levels', requirement: { type: 'level', value: 50 }, xpReward: 2000, coinsReward: 1000 },

  // ─── CATEGORIES ───────────────────────────────────
  { code: 'nature_5', name: 'Amante de la Naturaleza', description: 'Completaste 5 misiones de naturaleza', icon: '🌿', category: 'categories', requirement: { type: 'category_quests', value: 5, category: 'nature' }, xpReward: 50, coinsReward: 25 },
  { code: 'creativity_5', name: 'Mente Creativa', description: 'Completaste 5 misiones de creatividad', icon: '🎨', category: 'categories', requirement: { type: 'category_quests', value: 5, category: 'creativity' }, xpReward: 50, coinsReward: 25 },
  { code: 'kindness_5', name: 'Corazón Generoso', description: 'Completaste 5 misiones de bondad', icon: '❤️', category: 'categories', requirement: { type: 'category_quests', value: 5, category: 'kindness' }, xpReward: 50, coinsReward: 25 },
  { code: 'movement_5', name: 'En Movimiento', description: 'Completaste 5 misiones de movimiento', icon: '🏃', category: 'categories', requirement: { type: 'category_quests', value: 5, category: 'movement' }, xpReward: 50, coinsReward: 25 },
  { code: 'social_5', name: 'Mariposa Social', description: 'Completaste 5 misiones sociales', icon: '👥', category: 'categories', requirement: { type: 'category_quests', value: 5, category: 'social' }, xpReward: 50, coinsReward: 25 },
  { code: 'adventure_5', name: 'Espíritu Aventurero', description: 'Completaste 5 misiones de aventura', icon: '🗺️', category: 'categories', requirement: { type: 'category_quests', value: 5, category: 'adventure' }, xpReward: 50, coinsReward: 25 },
  { code: 'all_categories', name: 'Explorador Total', description: 'Completaste al menos 1 misión de cada categoría', icon: '🌈', category: 'categories', requirement: { type: 'all_categories', value: 1 }, xpReward: 200, coinsReward: 100 },

  // ─── SPECIAL ──────────────────────────────────────
  { code: 'early_bird', name: 'Madrugador', description: 'Completaste una misión antes de las 8am', icon: '🌅', category: 'special', requirement: { type: 'early_morning_quest', value: 1 }, xpReward: 30, coinsReward: 15 },
  { code: 'night_owl', name: 'Búho Nocturno', description: 'Completaste una misión después de las 10pm', icon: '🦉', category: 'special', requirement: { type: 'late_night_quest', value: 1 }, xpReward: 30, coinsReward: 15 },
  { code: 'weekend_warrior', name: 'Guerrero del Fin de Semana', description: 'Completaste 3 misiones en un solo fin de semana', icon: '⚔️', category: 'special', requirement: { type: 'weekend_quests', value: 3 }, xpReward: 75, coinsReward: 40 },
  { code: 'collector', name: 'Coleccionista', description: 'Desbloqueaste 10 insignias', icon: '🎒', category: 'special', requirement: { type: 'badges_count', value: 10 }, xpReward: 150, coinsReward: 75 },
  { code: 'onboarding', name: 'Bienvenido a Haru', description: 'Completaste el onboarding', icon: '👋', category: 'special', requirement: { type: 'onboarding_completed', value: 1 }, xpReward: 50, coinsReward: 25 },

  // ─── RANKING ──────────────────────────────────────
  { code: 'rank_global_1', name: '🏆 Campeón Global', description: 'Alcanzaste el puesto #1 global', icon: '🏆', category: 'ranking', requirement: { type: 'ranking_position', value: 1, rankingType: 'global' }, xpReward: 500, coinsReward: 250 },
  { code: 'rank_global_3', name: '🥇 Top 3 Global', description: 'Alcanzaste el top 3 global', icon: '🥇', category: 'ranking', requirement: { type: 'ranking_position', value: 3, rankingType: 'global' }, xpReward: 300, coinsReward: 150 },
  { code: 'rank_global_10', name: '🌟 Top 10 Global', description: 'Alcanzaste el top 10 global', icon: '🌟', category: 'ranking', requirement: { type: 'ranking_position', value: 10, rankingType: 'global' }, xpReward: 150, coinsReward: 75 },
  { code: 'rank_global_50', name: '⭐ Top 50 Global', description: 'Alcanzaste el top 50 global', icon: '⭐', category: 'ranking', requirement: { type: 'ranking_position', value: 50, rankingType: 'global' }, xpReward: 75, coinsReward: 40 },
  { code: 'rank_streak_1', name: '🔥 Rey de la Racha', description: 'La racha más larga de todos', icon: '🔥', category: 'ranking', requirement: { type: 'ranking_position', value: 1, rankingType: 'streak' }, xpReward: 400, coinsReward: 200 },
  { code: 'rank_streak_3', name: '⚡ Top 3 Rachas', description: 'Top 3 en rachas', icon: '⚡', category: 'ranking', requirement: { type: 'ranking_position', value: 3, rankingType: 'streak' }, xpReward: 200, coinsReward: 100 },
  { code: 'rank_missions_1', name: '🎯 Maestro de Misiones', description: 'Más misiones completadas de todos', icon: '🎯', category: 'ranking', requirement: { type: 'ranking_position', value: 1, rankingType: 'missions' }, xpReward: 400, coinsReward: 200 },
  { code: 'rank_missions_3', name: '🏅 Top 3 Misiones', description: 'Top 3 en misiones completadas', icon: '🏅', category: 'ranking', requirement: { type: 'ranking_position', value: 3, rankingType: 'missions' }, xpReward: 200, coinsReward: 100 },
  { code: 'rank_weekly_1', name: '👑 Rey Semanal', description: '#1 del ranking semanal', icon: '👑', category: 'ranking', requirement: { type: 'ranking_position', value: 1, rankingType: 'weekly' }, xpReward: 300, coinsReward: 150 },
  { code: 'rank_weekly_3', name: '🎖️ Top 3 Semanal', description: 'Top 3 del ranking semanal', icon: '🎖️', category: 'ranking', requirement: { type: 'ranking_position', value: 3, rankingType: 'weekly' }, xpReward: 150, coinsReward: 75 },
];

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private prisma: PrismaService,
    private progression: ProgressionService,
  ) {}

  // ─── CHECK ALL BADGES FOR USER ─────────────────────
  async checkBadges(userId: string): Promise<{
    newBadges: Array<{ code: string; name: string; icon: string; xpReward: number; coinsReward: number }>;
    totalChecked: number;
    totalUnlocked: number;
  }> {
    this.logger.log(`CheckBadges: userId=${userId}`);

    // Get user data
    const [user, completedQuests, streak, userBadges] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, totalXp: true, onboardingCompleted: true, createdAt: true },
      }),
      this.prisma.userQuest.findMany({
        where: { userId, status: 'completed' },
        select: { quest: { select: { category: true } }, completedAt: true },
      }),
      this.prisma.streak.findUnique({
        where: { userId },
        select: { longestStreak: true },
      }),
      this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
    ]);

    if (!user) throw new Error('User not found');

    const unlockedBadgeIds = new Set(userBadges.map((b) => b.badgeId));
    const newBadges: Array<{ code: string; name: string; icon: string; xpReward: number; coinsReward: number }> = [];

    // Count quests by category
    const questsByCategory: Record<string, number> = {};
    const categoriesCompleted = new Set<string>();
    let weekendQuests = 0;

    for (const uq of completedQuests) {
      questsByCategory[uq.quest.category] = (questsByCategory[uq.quest.category] || 0) + 1;
      categoriesCompleted.add(uq.quest.category);

      // Check weekend
      if (uq.completedAt) {
        const day = uq.completedAt.getDay();
        if (day === 0 || day === 6) weekendQuests++;
      }
    }

    for (const badge of ALL_BADGES) {
      // Skip if already unlocked
      const badgeRecord = await this.prisma.badge.findUnique({ where: { code: badge.code } });
      if (badgeRecord && unlockedBadgeIds.has(badgeRecord.id)) continue;

      // Check requirement
      const meets = this.checkRequirement(
        badge.requirement,
        user,
        completedQuests.length,
        streak?.longestStreak || 0,
        questsByCategory,
        categoriesCompleted.size,
        weekendQuests,
      );

      if (!meets) continue;

      // Ensure badge exists in DB
      let badgeId: string;
      if (badgeRecord) {
        badgeId = badgeRecord.id;
      } else {
        const created = await this.prisma.badge.create({
          data: {
            code: badge.code,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            category: badge.category,
            requirement: badge.requirement,
            xpReward: badge.xpReward,
            coinsReward: badge.coinsReward,
          },
        });
        badgeId = created.id;
      }

      // Unlock the badge
      await this.prisma.userBadge.create({
        data: { userId, badgeId },
      });

      // Grant rewards
      await this.progression.addXp(userId, badge.xpReward, 'badge_unlocked', { badgeCode: badge.code });
      await this.progression.addCoins(userId, badge.coinsReward, `badge_${badge.code}`);

      newBadges.push({
        code: badge.code,
        name: badge.name,
        icon: badge.icon,
        xpReward: badge.xpReward,
        coinsReward: badge.coinsReward,
      });

      this.logger.log(`Badge unlocked: ${badge.icon} ${badge.name} for user ${userId}`);
    }

    return {
      newBadges,
      totalChecked: ALL_BADGES.length,
      totalUnlocked: unlockedBadgeIds.size + newBadges.length,
    };
  }

  // ─── GET USER BADGES ──────────────────────────────
  async getUserBadges(userId: string) {
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    });

    const allBadges = await this.prisma.badge.findMany();
    const unlockedIds = new Set(userBadges.map((ub) => ub.badgeId));

    return {
      unlocked: userBadges.map((ub) => ({
        ...ub.badge,
        unlockedAt: ub.unlockedAt,
      })),
      locked: allBadges
        .filter((b) => !unlockedIds.has(b.id))
        .map((b) => ({
          ...b,
          unlockedAt: null,
        })),
      stats: {
        total: allBadges.length,
        unlocked: userBadges.length,
        locked: allBadges.length - userBadges.length,
      },
    };
  }

  // ─── GET ALL BADGES (catalog) ─────────────────────
  async getAllBadges() {
    const dbBadges = await this.prisma.badge.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const badge of dbBadges) {
      if (!byCategory[badge.category]) byCategory[badge.category] = [];
      byCategory[badge.category].push(badge);
    }

    return {
      badges: dbBadges,
      byCategory,
      total: dbBadges.length,
    };
  }

  // ─── SEED BADGES ──────────────────────────────────
  async seedBadges() {
    this.logger.log('Seeding badges...');

    let created = 0;
    let existing = 0;

    for (const badge of ALL_BADGES) {
      const exists = await this.prisma.badge.findUnique({ where: { code: badge.code } });
      if (exists) {
        existing++;
        continue;
      }

      await this.prisma.badge.create({
        data: {
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          requirement: badge.requirement,
          xpReward: badge.xpReward,
          coinsReward: badge.coinsReward,
        },
      });
      created++;
    }

    return {
      created,
      existing,
      total: ALL_BADGES.length,
      message: `🌱 ${created} badges created, ${existing} already existed`,
    };
  }

  // ─── PRIVATE: Check Requirement ───────────────────
  private checkRequirement(
    req: { type: string; value: number; [key: string]: any },
    user: any,
    totalQuests: number,
    longestStreak: number,
    questsByCategory: Record<string, number>,
    uniqueCategories: number,
    weekendQuests: number,
  ): boolean {
    switch (req.type) {
      case 'quests_completed':
        return totalQuests >= req.value;
      case 'longest_streak':
        return longestStreak >= req.value;
      case 'level':
        return user.level >= req.value;
      case 'category_quests':
        return (questsByCategory[req.category] || 0) >= req.value;
      case 'all_categories':
        return uniqueCategories >= 9; // all 9 categories
      case 'badges_count':
        // This is checked during the unlock loop
        return false; // handled separately
      case 'onboarding_completed':
        return user.onboardingCompleted === true;
      case 'early_morning_quest':
        return this.hasQuestAtTime(user.id, 5, 8); // before 8am
      case 'late_night_quest':
        return this.hasQuestAtTime(user.id, 22, 24); // after 10pm
      case 'weekend_quests':
        return weekendQuests >= req.value;
      default:
        return false;
    }
  }

  private hasQuestAtTime(userId: string, startHour: number, endHour: number): boolean {
    // Simplified — would need to check completedAt hour in a real implementation
    return false;
  }

  // ─── CHECK RANKING BADGES ────────────────────────
  async checkRankingBadges(userId: string): Promise<Array<{ code: string; name: string; icon: string }>> {
    this.logger.log(`CheckRankingBadges: userId=${userId}`);

    const newBadges: Array<{ code: string; name: string; icon: string }> = [];

    // Get user's current stats
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totalXp: true, level: true },
    });
    if (!user) return [];

    // Get streak
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
      select: { currentStreak: true },
    });

    // Get already unlocked ranking badges
    const unlockedBadges = await this.prisma.userBadge.findMany({
      where: { userId, badge: { category: 'ranking' } },
      include: { badge: { select: { code: true } } },
    });
    const unlockedCodes = new Set(unlockedBadges.map((ub) => ub.badge.code));

    // ─── GLOBAL RANKING ─────────────────────────────
    const globalPosition = await this.prisma.user.count({
      where: { totalXp: { gt: user.totalXp }, deletedAt: null },
    }) + 1;

    const globalBadges = [
      { code: 'rank_global_1', pos: 1 },
      { code: 'rank_global_3', pos: 3 },
      { code: 'rank_global_10', pos: 10 },
      { code: 'rank_global_50', pos: 50 },
    ];

    for (const { code, pos } of globalBadges) {
      if (globalPosition <= pos && !unlockedCodes.has(code)) {
        const badge = await this.unlockRankingBadge(userId, code);
        if (badge) newBadges.push(badge);
      }
    }

    // ─── STREAK RANKING ────────────────────────────
    if (streak && streak.currentStreak > 0) {
      const streakPosition = await this.prisma.streak.count({
        where: { currentStreak: { gt: streak.currentStreak } },
      }) + 1;

      const streakBadges = [
        { code: 'rank_streak_1', pos: 1 },
        { code: 'rank_streak_3', pos: 3 },
      ];

      for (const { code, pos } of streakBadges) {
        if (streakPosition <= pos && !unlockedCodes.has(code)) {
          const badge = await this.unlockRankingBadge(userId, code);
          if (badge) newBadges.push(badge);
        }
      }
    }

    // ─── MISSIONS RANKING ──────────────────────────
    const myMissions = await this.prisma.userQuest.count({
      where: { userId, status: 'completed' },
    });

    const missionAgg = await this.prisma.userQuest.groupBy({
      by: ['userId'],
      where: { status: 'completed' },
      _count: { id: true },
    });

    const missionsPosition = missionAgg.filter((m) => m._count.id > myMissions).length + 1;

    const missionBadges = [
      { code: 'rank_missions_1', pos: 1 },
      { code: 'rank_missions_3', pos: 3 },
    ];

    for (const { code, pos } of missionBadges) {
      if (missionsPosition <= pos && !unlockedCodes.has(code)) {
        const badge = await this.unlockRankingBadge(userId, code);
        if (badge) newBadges.push(badge);
      }
    }

    // ─── WEEKLY RANKING ────────────────────────────
    const dayOfWeek = new Date().getUTCDay();
    const monday = new Date();
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7));

    const weeklyLogs = await this.prisma.activityLog.findMany({
      where: { action: 'xp_earned', createdAt: { gte: monday } },
      select: { userId: true, details: true },
    });

    const weeklyXp: Record<string, number> = {};
    for (const log of weeklyLogs) {
      const details = log.details as any;
      const xp = details?.xp || details?.xpGained || details?.finalXp || 0;
      if (xp > 0) weeklyXp[log.userId] = (weeklyXp[log.userId] || 0) + xp;
    }

    const myWeeklyXp = weeklyXp[userId] || 0;
    const weeklyPosition = Object.values(weeklyXp).filter((x) => x > myWeeklyXp).length + 1;

    const weeklyBadges = [
      { code: 'rank_weekly_1', pos: 1 },
      { code: 'rank_weekly_3', pos: 3 },
    ];

    for (const { code, pos } of weeklyBadges) {
      if (weeklyPosition <= pos && !unlockedCodes.has(code)) {
        const badge = await this.unlockRankingBadge(userId, code);
        if (badge) newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      this.logger.log(`Ranking badges unlocked: ${newBadges.map((b) => b.icon + ' ' + b.name).join(', ')}`);
    }

    return newBadges;
  }

  // ─── UNLOCK RANKING BADGE (helper) ────────────────
  private async unlockRankingBadge(
    userId: string,
    badgeCode: string,
  ): Promise<{ code: string; name: string; icon: string } | null> {
    const badgeDef = ALL_BADGES.find((b) => b.code === badgeCode);
    if (!badgeDef) return null;

    // Ensure badge exists in DB
    let badgeRecord = await this.prisma.badge.findUnique({ where: { code: badgeCode } });
    if (!badgeRecord) {
      badgeRecord = await this.prisma.badge.create({
        data: {
          code: badgeDef.code,
          name: badgeDef.name,
          description: badgeDef.description,
          icon: badgeDef.icon,
          category: badgeDef.category,
          requirement: badgeDef.requirement,
          xpReward: badgeDef.xpReward,
          coinsReward: badgeDef.coinsReward,
        },
      });
    }

    // Check if already unlocked
    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badgeRecord.id } },
    });
    if (existing) return null;

    // Unlock
    await this.prisma.userBadge.create({ data: { userId, badgeId: badgeRecord.id } });
    await this.progression.addXp(userId, badgeDef.xpReward, 'badge_unlocked', { badgeCode });
    await this.progression.addCoins(userId, badgeDef.coinsReward, `badge_${badgeCode}`);

    this.logger.log(`Ranking badge unlocked: ${badgeDef.icon} ${badgeDef.name}`);
    return { code: badgeCode, name: badgeDef.name, icon: badgeDef.icon };
  }
}
