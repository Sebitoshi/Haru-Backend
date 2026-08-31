import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RankingType = 'global' | 'friends' | 'streak' | 'xp' | 'missions' | 'category';
export type RankingPeriod = 'weekly' | 'monthly' | 'all_time';

export interface RankingEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  score: number;
  isMe: boolean;
  extra?: any;
}

export interface RankingResponse {
  type: RankingType;
  period: RankingPeriod;
  entries: RankingEntry[];
  myRank: RankingEntry | null;
  total: number;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date | null;
  updatedAt: Date;
}

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── GET RANKING (main entry point) ────────────────
  async getRanking(
    userId: string,
    type: RankingType,
    period: RankingPeriod = 'all_time',
    category?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<RankingResponse> {
    this.logger.log(`GetRanking: type=${type}, period=${period}, category=${category || 'all'}`);

    const { startDate, endDate, periodLabel } = this.getPeriodRange(period);

    switch (type) {
      case 'global':
        return this.getGlobalRanking(userId, startDate, endDate, periodLabel, page, limit);
      case 'friends':
        return this.getFriendsRanking(userId, startDate, endDate, periodLabel, page, limit);
      case 'streak':
        return this.getStreakRanking(userId, periodLabel, page, limit);
      case 'xp':
        return this.getXpRanking(userId, startDate, endDate, periodLabel, page, limit);
      case 'missions':
        return this.getMissionsRanking(userId, startDate, endDate, periodLabel, page, limit);
      case 'category':
        return this.getCategoryRanking(userId, category || 'nature', startDate, endDate, periodLabel, page, limit);
      default:
        return this.getGlobalRanking(userId, startDate, endDate, periodLabel, page, limit);
    }
  }

  // ─── GLOBAL RANKING (by total XP) ─────────────────
  private async getGlobalRanking(
    userId: string,
    startDate: Date,
    endDate: Date | null,
    periodLabel: string,
    page: number,
    limit: number,
  ): Promise<RankingResponse> {
    const where: any = { deletedAt: null };
    if (endDate) {
      // For weekly/monthly, we use activity logs to count XP in period
      return this.getXpRanking(userId, startDate, endDate, periodLabel, page, limit);
    }

    // All-time: use totalXp directly
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, username: true, avatarUrl: true, level: true, totalXp: true,
        },
        orderBy: { totalXp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const myPosition = await this.prisma.user.count({
      where: { ...where, totalXp: { gt: 0 } },
    });

    const entries: RankingEntry[] = users.map((u, i) => ({
      rank: skip + i + 1,
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      level: u.level,
      score: u.totalXp,
      isMe: u.id === userId,
    }));

    const myEntry = entries.find((e) => e.isMe) || null;

    return {
      type: 'global',
      period: endDate ? 'weekly' : 'all_time',
      entries,
      myRank: myEntry,
      total,
      periodLabel,
      periodStart: startDate,
      periodEnd: endDate,
      updatedAt: new Date(),
    };
  }

  // ─── XP RANKING (period-based) ────────────────────
  private async getXpRanking(
    userId: string,
    startDate: Date,
    endDate: Date | null,
    periodLabel: string,
    page: number,
    limit: number,
  ): Promise<RankingResponse> {
    const where: any = { action: 'xp_earned' };
    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

    // Fetch activity logs and aggregate XP in memory
    // (Prisma can't sum JSON fields directly)
    const logs = await this.prisma.activityLog.findMany({
      where,
      select: { userId: true, details: true },
    });

    const userXp: Record<string, number> = {};
    for (const log of logs) {
      const details = log.details as any;
      const xp = details?.xp || details?.xpGained || details?.finalXp || 0;
      if (xp > 0) userXp[log.userId] = (userXp[log.userId] || 0) + xp;
    }

    // Sort by XP
    const sorted = Object.entries(userXp)
      .sort(([, a], [, b]) => b - a)
      .slice((page - 1) * limit, page * limit);

    const total = Object.keys(userXp).length;

    // Get user info
    const userIds = sorted.map(([id]) => id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, level: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: RankingEntry[] = sorted.map(([id, xp], i) => {
      const u = userMap.get(id);
      return {
        rank: (page - 1) * limit + i + 1,
        userId: id,
        username: u?.username || 'Unknown',
        avatarUrl: u?.avatarUrl || null,
        level: u?.level || 1,
        score: xp,
        isMe: id === userId,
      };
    });

    const myEntry = entries.find((e) => e.isMe) || await this.findMyRanking(userId, userXp);

    return {
      type: 'xp',
      period: endDate ? (this.isWeekly(startDate) ? 'weekly' : 'monthly') : 'all_time',
      entries,
      myRank: myEntry,
      total,
      periodLabel,
      periodStart: startDate,
      periodEnd: endDate,
      updatedAt: new Date(),
    };
  }

  // ─── STREAK RANKING ──────────────────────────────
  private async getStreakRanking(
    userId: string,
    periodLabel: string,
    page: number,
    limit: number,
  ): Promise<RankingResponse> {
    const skip = (page - 1) * limit;

    const [streaks, total] = await Promise.all([
      this.prisma.streak.findMany({
        where: { currentStreak: { gt: 0 } },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, level: true },
          },
        },
        orderBy: { currentStreak: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.streak.count({ where: { currentStreak: { gt: 0 } } }),
    ]);

    const entries: RankingEntry[] = streaks.map((s, i) => ({
      rank: skip + i + 1,
      userId: s.userId,
      username: s.user.username,
      avatarUrl: s.user.avatarUrl,
      level: s.user.level,
      score: s.currentStreak,
      isMe: s.userId === userId,
      extra: { longestStreak: s.longestStreak },
    }));

    const myEntry = entries.find((e) => e.isMe) || null;

    return {
      type: 'streak',
      period: 'all_time',
      entries,
      myRank: myEntry,
      total,
      periodLabel,
      periodStart: new Date(0),
      periodEnd: null,
      updatedAt: new Date(),
    };
  }

  // ─── MISSIONS RANKING ────────────────────────────
  private async getMissionsRanking(
    userId: string,
    startDate: Date,
    endDate: Date | null,
    periodLabel: string,
    page: number,
    limit: number,
  ): Promise<RankingResponse> {
    const where: any = { status: 'completed' };
    if (startDate) where.completedAt = { gte: startDate };
    if (endDate) where.completedAt = { ...where.completedAt, lte: endDate };

    const missionAgg = await this.prisma.userQuest.groupBy({
      by: ['userId'],
      where,
      _count: { id: true },
    });

    const sorted = missionAgg
      .map((a) => ({ userId: a.userId, count: a._count.id }))
      .sort((a, b) => b.count - a.count)
      .slice((page - 1) * limit, page * limit);

    const total = missionAgg.length;

    const userIds = sorted.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, level: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: RankingEntry[] = sorted.map((s, i) => {
      const u = userMap.get(s.userId);
      return {
        rank: (page - 1) * limit + i + 1,
        userId: s.userId,
        username: u?.username || 'Unknown',
        avatarUrl: u?.avatarUrl || null,
        level: u?.level || 1,
        score: s.count,
        isMe: s.userId === userId,
      };
    });

    return {
      type: 'missions',
      period: endDate ? (this.isWeekly(startDate) ? 'weekly' : 'monthly') : 'all_time',
      entries,
      myRank: entries.find((e) => e.isMe) || null,
      total,
      periodLabel,
      periodStart: startDate,
      periodEnd: endDate,
      updatedAt: new Date(),
    };
  }

  // ─── FRIENDS RANKING ─────────────────────────────
  private async getFriendsRanking(
    userId: string,
    startDate: Date,
    endDate: Date | null,
    periodLabel: string,
    page: number,
    limit: number,
  ): Promise<RankingResponse> {
    // Get friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'completed' as any,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    // Also check for 'accepted' status
    const acceptedFriendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const allFriendIds = acceptedFriendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const userIds = [userId, ...allFriendIds];

    // Get XP for friends in period
    const where: any = { action: 'xp_earned' };
    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

    const logs = await this.prisma.activityLog.findMany({
      where: { ...where, userId: { in: userIds } },
      select: { userId: true, details: true },
    });

    const userXp: Record<string, number> = {};
    for (const log of logs) {
      const details = log.details as any;
      const xp = details?.xp || details?.xpGained || details?.finalXp || 0;
      if (xp > 0) userXp[log.userId] = (userXp[log.userId] || 0) + xp;
    }

    // Include users with 0 XP
    for (const uid of userIds) {
      if (!userXp[uid]) userXp[uid] = 0;
    }

    const sorted = Object.entries(userXp)
      .sort(([, a], [, b]) => b - a)
      .slice((page - 1) * limit, page * limit);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, level: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const entries: RankingEntry[] = sorted.map(([id, xp], i) => {
      const u = userMap.get(id);
      return {
        rank: (page - 1) * limit + i + 1,
        userId: id,
        username: u?.username || 'Unknown',
        avatarUrl: u?.avatarUrl || null,
        level: u?.level || 1,
        score: xp,
        isMe: id === userId,
      };
    });

    return {
      type: 'friends',
      period: endDate ? (this.isWeekly(startDate) ? 'weekly' : 'monthly') : 'all_time',
      entries,
      myRank: entries.find((e) => e.isMe) || null,
      total: sorted.length,
      periodLabel,
      periodStart: startDate,
      periodEnd: endDate,
      updatedAt: new Date(),
    };
  }

  // ─── CATEGORY RANKING ────────────────────────────
  private async getCategoryRanking(
    userId: string,
    category: string,
    startDate: Date,
    endDate: Date | null,
    periodLabel: string,
    page: number,
    limit: number,
  ): Promise<RankingResponse> {
    // Get quests in this category
    const categoryQuestIds = (
      await this.prisma.quest.findMany({
        where: { category: category as any },
        select: { id: true },
      })
    ).map((q) => q.id);

    const where: any = {
      questId: { in: categoryQuestIds },
      status: 'completed',
    };
    if (startDate) where.completedAt = { gte: startDate };
    if (endDate) where.completedAt = { ...where.completedAt, lte: endDate };

    const agg = await this.prisma.userQuest.groupBy({
      by: ['userId'],
      where,
      _count: { id: true },
    });

    const sorted = agg
      .map((a) => ({ userId: a.userId, count: a._count.id }))
      .sort((a, b) => b.count - a.count)
      .slice((page - 1) * limit, page * limit);

    const total = agg.length;

    const userIds = sorted.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, level: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };

    const entries: RankingEntry[] = sorted.map((s, i) => {
      const u = userMap.get(s.userId);
      return {
        rank: (page - 1) * limit + i + 1,
        userId: s.userId,
        username: u?.username || 'Unknown',
        avatarUrl: u?.avatarUrl || null,
        level: u?.level || 1,
        score: s.count,
        isMe: s.userId === userId,
      };
    });

    return {
      type: 'category',
      period: endDate ? (this.isWeekly(startDate) ? 'weekly' : 'monthly') : 'all_time',
      entries,
      myRank: entries.find((e) => e.isMe) || null,
      total,
      periodLabel: `${catEmojis[category] || '🎯'} ${category} — ${periodLabel}`,
      periodStart: startDate,
      periodEnd: endDate,
      updatedAt: new Date(),
    };
  }

  // ─── GET MY RANKING SUMMARY ──────────────────────
  async getMyRankingSummary(userId: string) {
    this.logger.log(`GetMyRankingSummary: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, avatarUrl: true, level: true, totalXp: true, totalCoins: true },
    });

    if (!user) return null;

    // Get my global rank
    const globalRank = await this.prisma.user.count({
      where: { totalXp: { gt: user.totalXp }, deletedAt: null },
    });

    // Get my streak
    const streak = await this.prisma.streak.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true },
    });

    // Get my missions count
    const missionsCompleted = await this.prisma.userQuest.count({
      where: { userId, status: 'completed' },
    });

    const missionsRank = await this.prisma.userQuest.groupBy({
      by: ['userId'],
      where: { status: 'completed' },
      _count: { id: true },
    });

    const myMissionCount = missionsRank.find((m) => m.userId === userId)?._count.id || 0;
    const missionsPosition = missionsRank.filter((m) => m._count.id > myMissionCount).length + 1;

    // Get streak rank
    const streakRank = await this.prisma.streak.findMany({
      where: { currentStreak: { gt: 0 } },
      select: { currentStreak: true },
      orderBy: { currentStreak: 'desc' },
    });
    const myStreak = streak?.currentStreak || 0;
    const streakPosition = streakRank.filter((s) => s.currentStreak > myStreak).length + 1;

    // Get best category
    const categoryCounts = await this.prisma.userQuest.groupBy({
      by: ['userId'],
      where: { userId, status: 'completed' },
      _count: { id: true },
    });

    return {
      user,
      rankings: {
        global: { position: globalRank + 1, score: user.totalXp, label: 'XP Total' },
        missions: { position: missionsPosition, score: myMissionCount, label: 'Misiones' },
        streak: { position: streakPosition, score: myStreak, label: 'Racha actual' },
      },
    };
  }

  // ─── GET AVAILABLE CATEGORIES ─────────────────────
  getCategories() {
    return [
      { id: 'nature', emoji: '🌿', name: 'Naturaleza' },
      { id: 'creativity', emoji: '🎨', name: 'Creatividad' },
      { id: 'kindness', emoji: '❤️', name: 'Bondad' },
      { id: 'learning', emoji: '🧠', name: 'Aprendizaje' },
      { id: 'movement', emoji: '🏃', name: 'Movimiento' },
      { id: 'social', emoji: '👥', name: 'Social' },
      { id: 'photography', emoji: '📸', name: 'Fotografía' },
      { id: 'relaxation', emoji: '🌙', name: 'Tranquilidad' },
      { id: 'adventure', emoji: '🗺️', name: 'Aventura' },
    ];
  }

  // ─── HELPERS ──────────────────────────────────────
  private getPeriodRange(period: RankingPeriod): {
    startDate: Date;
    endDate: Date | null;
    periodLabel: string;
  } {
    const now = new Date();

    switch (period) {
      case 'weekly': {
        // Monday of this week
        const dayOfWeek = now.getUTCDay();
        const monday = new Date(now);
        monday.setUTCHours(0, 0, 0, 0);
        monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7));
        return {
          startDate: monday,
          endDate: now,
          periodLabel: `Semana del ${monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
        };
      }
      case 'monthly': {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          startDate: firstOfMonth,
          endDate: now,
          periodLabel: now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
        };
      }
      case 'all_time':
      default:
        return {
          startDate: new Date(0),
          endDate: null,
          periodLabel: 'Todos los tiempos',
        };
    }
  }

  private isWeekly(startDate: Date): boolean {
    const now = new Date();
    const diffDays = (now.getTime() - startDate.getTime()) / 86400000;
    return diffDays <= 8;
  }

  private async findMyRanking(userId: string, scores: Record<string, number>): Promise<RankingEntry | null> {
    const myScore = scores[userId];
    if (myScore === undefined) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, avatarUrl: true, level: true },
    });

    if (!user) return null;

    const position = Object.values(scores).filter((s) => s > myScore).length + 1;

    return {
      rank: position,
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      level: user.level,
      score: myScore,
      isMe: true,
    };
  }
}
