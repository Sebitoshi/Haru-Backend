import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── STREAK MILESTONES ──────────────────────────────
export const STREAK_MILESTONES = [
  { days: 3, reward: { xp: 30, coins: 15 }, message: '📅 3 días de racha' },
  { days: 7, reward: { xp: 75, coins: 40 }, message: '🔥 7 días de racha' },
  { days: 14, reward: { xp: 150, coins: 75 }, message: '⚡ 2 semanas' },
  { days: 21, reward: { xp: 200, coins: 100 }, message: '💎 3 semanas' },
  { days: 30, reward: { xp: 300, coins: 150 }, message: '👑 1 mes' },
  { days: 50, reward: { xp: 500, coins: 250 }, message: '🌟 50 días' },
  { days: 100, reward: { xp: 1000, coins: 500 }, message: '🏆 100 días — ¡LEYENDA!' },
  { days: 365, reward: { xp: 3000, coins: 1500 }, message: '🌍 365 días — ¡AÑO COMPLETO!' },
];

// ─── PROTECTION COST ────────────────────────────────
export const STREAK_PROTECTION_COST = 200; // coins

@Injectable()
export class StreaksService {
  constructor(private prisma: PrismaService) {}

  // ─── GET STREAK ───────────────────────────────────
  async getStreak(userId: string) {
    console.log(`[StreaksService] GetStreak: userId=${userId}`);

    let streak = await this.prisma.streak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await this.prisma.streak.create({
        data: { userId },
      });
    }

    // Auto-calculate if streak is broken
    const calculated = await this.calculateStreak(userId, streak);

    // Get user's protections
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streakProtections: true },
    });

    // Find next milestone
    const nextMilestone = STREAK_MILESTONES.find((m) => m.days > calculated.currentStreak);

    // Find achieved milestones
    const achievedMilestones = STREAK_MILESTONES.filter((m) => m.days <= calculated.longestStreak);

    return {
      currentStreak: calculated.currentStreak,
      longestStreak: calculated.longestStreak,
      lastActivityDate: calculated.lastActivityDate,
      streakActive: calculated.isStreakActive,
      protectionsAvailable: user?.streakProtections || 0,
      protectionCost: STREAK_PROTECTION_COST,
      nextMilestone: nextMilestone || null,
      achievedMilestones,
      daysUntilBreak: calculated.daysUntilBreak,
      message: calculated.isStreakActive
        ? `🔥 ${calculated.currentStreak} días de racha`
        : calculated.currentStreak > 0
          ? `🌱 Racha pausada. Tienes ${user?.streakProtections || 0} protección(es) disponibles.`
          : '🌱 Tu aventura comienza hoy',
    };
  }

  // ─── RECORD ACTIVITY (called after quest complete) ─
  async recordActivity(userId: string, activityType: string = 'quest_completed') {
    console.log(`[StreaksService] RecordActivity: userId=${userId}, type=${activityType}`);

    let streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) {
      streak = await this.prisma.streak.create({ data: { userId } });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Already counted today
    if (streak.lastActivityDate) {
      const lastDate = new Date(streak.lastActivityDate);
      lastDate.setUTCHours(0, 0, 0, 0);
      const lastDateStr = lastDate.toISOString().split('T')[0];

      if (lastDateStr === todayStr) {
        console.log(`[StreaksService] RecordActivity: Already counted today`);
        return {
          streak: streak.currentStreak,
          action: 'already_counted',
          message: `🔥 ${streak.currentStreak} días de racha`,
        };
      }
    }

    // Calculate if streak continues
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak: number;
    let action: string;

    if (!streak.lastActivityDate) {
      // First ever activity
      newStreak = 1;
      action = 'started';
    } else {
      const lastDate = new Date(streak.lastActivityDate);
      lastDate.setUTCHours(0, 0, 0, 0);
      const lastDateStr = lastDate.toISOString().split('T')[0];

      if (lastDateStr === yesterdayStr) {
        // Consecutive day
        newStreak = streak.currentStreak + 1;
        action = 'extended';
      } else if (lastDateStr === todayStr) {
        // Same day (already handled above)
        newStreak = streak.currentStreak;
        action = 'already_counted';
      } else {
        // Streak broken — check for protection
        const daysMissed = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { streakProtections: true },
        });

        const protections = user?.streakProtections || 0;
        const daysToProtect = Math.min(daysMissed - 1, protections); // -1 because today counts

        if (daysToProtect > 0) {
          // Use protections!
          const usedProtections = daysToProtect;
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              streakProtections: { decrement: usedProtections },
            },
          });

          newStreak = streak.currentStreak + 1;
          action = 'protected';
          console.log(`[StreaksService] RecordActivity: Used ${usedProtections} protection(s). Streak continues!`);
        } else {
          // Streak broken
          newStreak = 1;
          action = 'broken';
          console.log(`[StreaksService] RecordActivity: Streak broken after ${streak.currentStreak} days`);
        }
      }
    }

    // Update streak
    const updated = await this.prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak.longestStreak),
        lastActivityDate: today,
      },
    });

    // Check milestones
    const milestone = STREAK_MILESTONES.find((m) => m.days === newStreak);

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'streak_update',
        details: {
          type: action,
          previousStreak: streak.currentStreak,
          newStreak,
          longestStreak: updated.longestStreak,
          milestone: milestone || null,
        },
      },
    });

    return {
      streak: newStreak,
      longestStreak: updated.longestStreak,
      action,
      milestone: milestone || null,
      message: action === 'protected'
        ? `🛡️ ¡Protección usada! Racha de ${newStreak} días mantenida`
        : action === 'extended'
          ? `🔥 ${newStreak} días de racha`
          : action === 'broken'
            ? `🌱 Racha anterior: ${streak.currentStreak} días. Tu aventura continúa`
            : action === 'started'
              ? `🌱 ¡Racha iniciada! Día 1`
              : `🔥 ${newStreak} días de racha`,
    };
  }

  // ─── USE PROTECTION (buy from shop) ───────────────
  async useProtection(userId: string) {
    console.log(`[StreaksService] UseProtection: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streakProtections: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.streakProtections <= 0) {
      throw new BadRequestException('No protections available. Buy one from the shop first.');
    }

    // Get streak
    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak || !streak.lastActivityDate) {
      throw new BadRequestException('No active streak to protect');
    }

    // Check if streak is actually broken
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const lastDate = new Date(streak.lastActivityDate);
    lastDate.setUTCHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      throw new BadRequestException('Streak is not broken. Protection not needed.');
    }

    if (daysDiff > 2) {
      throw new BadRequestException(
        `Streak was broken ${daysDiff - 1} days ago. Maximum 1-day protection available.`,
      );
    }

    // Use the protection manually (before activity)
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { streakProtections: { decrement: 1 } },
    });

    // Update last activity to yesterday to simulate continuity
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    await this.prisma.streak.update({
      where: { userId },
      data: { lastActivityDate: yesterday },
    });

    console.log(`[StreaksService] UseProtection: OK — 1 protection used. Remaining: ${updated.streakProtections}`);

    return {
      protectionsRemaining: updated.streakProtections,
      message: '🛡️ Protección usada. Tu racha está protegida para hoy.',
    };
  }

  // ─── GET STREAK HISTORY ───────────────────────────
  async getStreakHistory(userId: string, days: number = 30) {
    console.log(`[StreaksService] GetStreakHistory: userId=${userId}, days=${days}`);

    const activities = await this.prisma.activityLog.findMany({
      where: {
        userId,
        action: { in: ['quest_completed', 'streak_update'] },
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build calendar view
    const calendar: Record<string, { active: boolean; type: string }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      calendar[dateStr] = { active: false, type: 'none' };
    }

    for (const activity of activities) {
      const dateStr = activity.createdAt.toISOString().split('T')[0];
      if (calendar[dateStr]) {
        calendar[dateStr] = {
          active: true,
          type: activity.action,
        };
      }
    }

    return {
      days,
      calendar,
      totalActivities: activities.length,
    };
  }

  // ─── BUY PROTECTION (from shop) ───────────────────
  async buyProtection(userId: string) {
    console.log(`[StreaksService] BuyProtection: userId=${userId}`);

    // This would normally check economy/coins balance
    // For now, directly increment protections
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streakProtections: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { streakProtections: { increment: 1 } },
    });

    // Log the purchase
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'protection_purchased',
        details: {
          cost: STREAK_PROTECTION_COST,
          newTotal: updated.streakProtections,
        },
      },
    });

    console.log(`[StreaksService] BuyProtection: OK — Protections: ${updated.streakProtections}`);

    return {
      protectionsAvailable: updated.streakProtections,
      cost: STREAK_PROTECTION_COST,
      message: `🛡️ Protección comprada. Tienes ${updated.streakProtections} protección(es).`,
    };
  }

  // ─── PRIVATE: Calculate streak ────────────────────
  private async calculateStreak(userId: string, streak: any) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (!streak.lastActivityDate) {
      return {
        currentStreak: 0,
        longestStreak: streak.longestStreak,
        lastActivityDate: null,
        isStreakActive: false,
        daysUntilBreak: 0,
      };
    }

    const lastDate = new Date(streak.lastActivityDate);
    lastDate.setUTCHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const isStreakActive = daysDiff <= 1;
    const daysUntilBreak = daysDiff <= 1 ? (1 - daysDiff) : 0;

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
      isStreakActive,
      daysUntilBreak,
    };
  }
}
