import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';

// ═══════════════════════════════════════════════════════════
// XP CURVE — Exponential growth
// ═══════════════════════════════════════════════════════════
// Level N requires: 100 * (1.5 ^ (N-1)) XP
// Level 1→2: 100 XP
// Level 5→6: 759 XP
// Level 10→11: 3,844 XP
// Level 20→21: 24,489 XP
// ═══════════════════════════════════════════════════════════

export const MAX_LEVEL = 50;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 2));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

export function levelFromTotalXp(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  let level = 1;
  let accumulatedXp = 0;

  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level + 1);
    if (accumulatedXp + needed > totalXp) {
      break;
    }
    accumulatedXp += needed;
    level++;
  }

  const currentLevelXp = totalXp - accumulatedXp;
  const nextLevelXp = level < MAX_LEVEL ? xpForLevel(level + 1) : 0;
  const progress = nextLevelXp > 0 ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100)) : 100;

  return { level, currentLevelXp, nextLevelXp, progress };
}

// ═══════════════════════════════════════════════════════════
// LEVEL REWARDS
// ═══════════════════════════════════════════════════════════

export const LEVEL_REWARDS: Record<number, { title: string; description: string; coins: number; unlocks?: string }> = {
  2:  { title: 'Explorador Novato', description: 'Completaste tu primer día', coins: 20 },
  3:  { title: 'Aventurero', description: 'Tu aventura crece', coins: 30, unlocks: 'Categoría Aprendizaje desbloqueada' },
  4:  { title: 'Explorador Nato', description: 'El mundo te espera', coins: 40, unlocks: 'Categoría Aventura desbloqueada' },
  5:  { title: 'Buscador de Realidades', description: 'Has experimentado bastante', coins: 50, unlocks: 'Misiones hard disponibles' },
  7:  { title: 'Sembrador de Experiencias', description: 'Una semana completa de aventuras', coins: 70, unlocks: 'Categoría Social desbloqueada' },
  10: { title: 'Maestro de Misiones', description: '10 niveles de crecimiento', coins: 100, unlocks: 'Misiones especiales disponibles' },
  15: { title: 'Explorador Avanzado', description: 'Conoces Haru como nadie', coins: 150, unlocks: 'Personalización avanzada' },
  20: { title: 'Leyenda de Haru', description: 'Tu impacto es inolvidable', coins: 250, unlocks: 'Todas las categorías' },
  30: { title: 'Maestro Absoluto', description: 'Has alcanzado la cima', coins: 500, unlocks: 'Título exclusivo' },
  50: { title: '🌸-shadow✨', description: 'Nivel máximo alcanzado', coins: 1000, unlocks: 'Insignia dorada exclusiva' },
};

// ═══════════════════════════════════════════════════════════
// XP SOURCES
// ═══════════════════════════════════════════════════════════

export const XP_SOURCES = {
  quest_completed: (difficulty: string, streakDays: number) => {
    const base: Record<string, number> = { easy: 10, normal: 25, hard: 50, special: 100 };
    const baseXp = base[difficulty] || 25;
    const streakMultiplier = Math.min(1 + (streakDays * 0.1), 1.5); // max 1.5x
    return Math.round(baseXp * streakMultiplier);
  },
  streak_milestone: (days: number) => {
    const rewards: Record<number, number> = { 3: 30, 7: 75, 14: 150, 21: 200, 30: 300, 50: 500, 100: 1000, 365: 3000 };
    return rewards[days] || 0;
  },
  badge_unlocked: (xpReward: number) => xpReward,
  daily_login: 5,
  onboarding_completed: 50,
};

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(
    private prisma: PrismaService,
    private economyService: EconomyService,
  ) {}

  // ─── GET USER PROGRESSION ──────────────────────────
  async getProgression(userId: string) {
    this.logger.log(`GetProgression: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        level: true,
        totalXp: true,
        totalCoins: true,
        createdAt: true,
      },
    });

    if (!user) throw new Error('User not found');

    const { level, currentLevelXp, nextLevelXp, progress } = levelFromTotalXp(user.totalXp);
    const levelReward = LEVEL_REWARDS[level] || null;

    // Update level in DB if it changed
    if (level !== user.level) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { level },
      });
    }

    // Get stats
    const [completedQuests, badgesCount, streak] = await Promise.all([
      this.prisma.userQuest.count({ where: { userId, status: 'completed' } }),
      this.prisma.userBadge.count({ where: { userId } }),
      this.prisma.streak.findUnique({ where: { userId }, select: { currentStreak: true, longestStreak: true } }),
    ]);

    return {
      level,
      totalXp: user.totalXp,
      totalCoins: user.totalCoins,
      currentLevelXp,
      nextLevelXp,
      progress: `${progress}%`,
      progressRaw: progress,
      levelReward,
      stats: {
        completedQuests,
        badges: badgesCount,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        memberSince: user.createdAt,
      },
      nextLevel: level < MAX_LEVEL
        ? { level: level + 1, xpNeeded: nextLevelXp - currentLevelXp, reward: LEVEL_REWARDS[level + 1] }
        : null,
    };
  }

  // ─── ADD XP (main entry point) ─────────────────────
  async addXp(userId: string, xpAmount: number, source: string, details?: any): Promise<{
    xpGained: number;
    totalXp: number;
    level: number;
    leveledUp: boolean;
    newLevel?: number;
    levelReward?: any;
  }> {
    this.logger.log(`AddXp: userId=${userId}, +${xpAmount}xp (${source})`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, level: true },
    });

    if (!user) throw new Error('User not found');

    const oldLevel = user.level;
    const newTotalXp = user.totalXp + xpAmount;
    const { level: newLevel } = levelFromTotalXp(newTotalXp);
    const leveledUp = newLevel > oldLevel;

    // Update XP and level
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalXp: newTotalXp,
        level: newLevel,
      },
    });

    // Log the XP gain
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'xp_gained',
        details: {
          amount: xpAmount,
          source,
          oldTotalXp: user.totalXp,
          newTotalXp,
          oldLevel,
          newLevel,
          leveledUp,
          ...details,
        },
      },
    });

    const levelReward = leveledUp ? LEVEL_REWARDS[newLevel] : undefined;

    // Grant level-up rewards (via EconomyService for transaction logging)
    if (leveledUp && levelReward) {
      await this.economyService.earnCoins(
        userId,
        levelReward.coins,
        'level_up',
        `level_${newLevel}`,
        `Level up: ${levelReward.title} (+${levelReward.coins} coins)`,
        { oldLevel, newLevel, title: levelReward.title },
      );

      this.logger.log(`Level up! ${oldLevel} → ${newLevel}. Reward: ${levelReward.title} (+${levelReward.coins} coins)`);
    }

    return {
      xpGained: xpAmount,
      totalXp: newTotalXp,
      level: newLevel,
      leveledUp,
      ...(leveledUp && { newLevel, levelReward }),
    };
  }

  // ─── ADD COINS (delegates to EconomyService) ──────
  async addCoins(userId: string, amount: number, source: string): Promise<{ coinsGained: number; totalCoins: number }> {
    this.logger.log(`AddCoins: userId=${userId}, +${amount} coins (${source})`);

    // Map source to TransactionType
    const txType = this.mapSourceToTxType(source);
    const result = await this.economyService.earnCoins(userId, amount, txType, source, `+${amount} coins from ${source}`);

    return { coinsGained: result.earned, totalCoins: result.totalCoins };
  }

  // ─── SPEND COINS (delegates to EconomyService) ────
  async spendCoins(userId: string, amount: number, source: string): Promise<{ spent: number; remaining: number }> {
    const txType = this.mapSourceToTxType(source);
    const result = await this.economyService.spendCoins(userId, amount, txType, source, `-${amount} coins for ${source}`);

    return { spent: result.spent, remaining: result.remaining };
  }

  // ─── MAP SOURCE TO TRANSACTION TYPE ───────────────
  private mapSourceToTxType(source: string): any {
    if (source.includes('quest')) return 'quest_completed';
    if (source.includes('badge')) return 'badge_unlocked';
    if (source.includes('collectible')) return 'collectible_unlocked';
    if (source.includes('level')) return 'level_up';
    if (source.includes('streak')) return 'streak_milestone';
    if (source.includes('daily')) return 'daily_bonus';
    if (source.includes('admin')) return 'admin_grant';
    return 'quest_completed';
  }

  // ─── GET XP LEADERBOARD ────────────────────────────
  async getLeaderboard(params: {
    type?: 'xp' | 'level' | 'coins' | 'streak';
    limit?: number;
  }) {
    const { type = 'xp', limit = 20 } = params;

    let orderBy: any;
    switch (type) {
      case 'level': orderBy = { level: 'desc' }; break;
      case 'coins': orderBy = { totalCoins: 'desc' }; break;
      case 'streak':
        // Streak leaderboard needs a join
        const streakUsers = await this.prisma.streak.findMany({
          take: limit,
          orderBy: { currentStreak: 'desc' },
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, level: true, totalXp: true },
            },
          },
        });
        return streakUsers.map((s, i) => ({
          rank: i + 1,
          ...s.user,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
        }));
      default: orderBy = { totalXp: 'desc' };
    }

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        level: true,
        totalXp: true,
        totalCoins: true,
      },
    });

    return users.map((u, i) => ({ rank: i + 1, ...u }));
  }

  // ─── GET ALL LEVELS ────────────────────────────────
  getLevelTable() {
    return Object.entries(LEVEL_REWARDS).map(([level, reward]) => ({
      level: parseInt(level),
      xpRequired: xpForLevel(parseInt(level)),
      totalXpRequired: totalXpForLevel(parseInt(level)),
      ...reward,
    }));
  }
}
