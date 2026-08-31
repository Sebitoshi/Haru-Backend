import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AchievementsService } from '../achievements/achievements.service';

export interface RankingNotification {
  id: string;
  type: 'position_up' | 'position_down' | 'badge_unlocked' | 'weekly_reset' | 'top_3' | 'overtaken';
  title: string;
  message: string;
  rankingType: string;
  oldPosition?: number;
  newPosition?: number;
  badge?: { code: string; name: string; icon: string };
  createdAt: Date;
}

@Injectable()
export class RankingNotificationService {
  private readonly logger = new Logger(RankingNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private achievements: AchievementsService,
  ) {}

  // ─── CHECK AND NOTIFY AFTER QUEST COMPLETION ──────
  async checkAfterQuestCompletion(userId: string, questId: string) {
    this.logger.log(`CheckAfterQuestCompletion: userId=${userId}`);

    const notifications: RankingNotification[] = [];

    // Check ranking badges
    const newBadges = await this.achievements.checkRankingBadges(userId);

    for (const badge of newBadges) {
      notifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'badge_unlocked',
        title: `${badge.icon} ¡Nueva insignia!`,
        message: `Desbloqueaste "${badge.name}" por tu posición en el ranking`,
        rankingType: 'badge',
        badge,
        createdAt: new Date(),
      });
    }

    // Check global position change
    const positionChange = await this.checkPositionChange(userId, 'global');
    if (positionChange) {
      notifications.push(positionChange);
    }

    // Check streak ranking
    const streakChange = await this.checkPositionChange(userId, 'streak');
    if (streakChange) {
      notifications.push(streakChange);
    }

    // Check if entered top 3
    const top3 = await this.checkTop3(userId);
    if (top3) {
      notifications.push(top3);
    }

    return { notifications, badgesEarned: newBadges };
  }

  // ─── CHECK POSITION CHANGE ────────────────────────
  private async checkPositionChange(
    userId: string,
    rankingType: string,
  ): Promise<RankingNotification | null> {
    // Get current position
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalXp: true },
    });
    if (!user) return null;

    const newPosition = await this.prisma.user.count({
      where: { totalXp: { gt: user.totalXp }, deletedAt: null },
    }) + 1;

    // Get previous position from activity log
    const previousLog = await this.prisma.activityLog.findFirst({
      where: {
        userId,
        action: 'ranking_position_snapshot',
        details: { path: ['rankingType'], equals: rankingType },
      },
      orderBy: { createdAt: 'desc' },
      select: { details: true, createdAt: true },
    });

    const oldPosition = (previousLog?.details as any)?.position;

    // Save current position as snapshot
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'ranking_position_snapshot',
        details: { rankingType, position: newPosition, checkedAt: new Date().toISOString() },
      },
    });

    // If we have a previous position and it changed significantly
    if (oldPosition && oldPosition !== newPosition) {
      const diff = oldPosition - newPosition; // positive = moved up

      if (diff > 0 && diff >= 3) {
        // Moved up 3+ positions
        return {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'position_up',
          title: `📈 ¡Subiste en el ranking!`,
          message: `Pasaste del puesto #${oldPosition} al #${newPosition} — ¡${diff} posiciones arriba! 🔥`,
          rankingType,
          oldPosition,
          newPosition,
          createdAt: new Date(),
        };
      }

      if (diff < 0 && Math.abs(diff) >= 5) {
        // Moved down 5+ positions
        return {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'position_down',
          title: `📊 Ranking actualizado`,
          message: `Bajaste del #${oldPosition} al #${newPosition}. ¡Una misión te sube de vuelta! 💪`,
          rankingType,
          oldPosition,
          newPosition,
          createdAt: new Date(),
        };
      }
    }

    // First time entering top 50
    if (newPosition <= 50 && (!oldPosition || oldPosition > 50)) {
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'position_up',
        title: `🌟 ¡Entraste al Top 50!`,
        message: `Estás en el puesto #${newPosition} del ranking global. ¡Sigue así!`,
        rankingType,
        oldPosition,
        newPosition,
        createdAt: new Date(),
      };
    }

    return null;
  }

  // ─── CHECK TOP 3 ─────────────────────────────────
  private async checkTop3(userId: string): Promise<RankingNotification | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, username: true },
    });
    if (!user) return null;

    const position = await this.prisma.user.count({
      where: { totalXp: { gt: user.totalXp }, deletedAt: null },
    }) + 1;

    if (position > 3) return null;

    // Check if we already notified for this position
    const alreadyNotified = await this.prisma.activityLog.findFirst({
      where: {
        userId,
        action: 'ranking_top3_notified',
        details: { path: ['position'], equals: position },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
      },
    });

    if (alreadyNotified) return null;

    // Mark as notified
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'ranking_top3_notified',
        details: { position, username: user.username },
      },
    });

    const medals = ['🥇', '🥈', '🥉'];
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'top_3',
      title: `${medals[position - 1]} ¡Top ${position}!`,
      message: `Estás en el puesto #${position} del ranking global. ¡Increíble! 🎉`,
      rankingType: 'global',
      newPosition: position,
      createdAt: new Date(),
    };
  }

  // ─── GET USER NOTIFICATIONS ───────────────────────
  async getNotifications(userId: string, limit: number = 20) {
    this.logger.log(`GetNotifications: userId=${userId}`);

    // Get recent ranking-related activity logs
    const logs = await this.prisma.activityLog.findMany({
      where: {
        userId,
        action: { in: ['ranking_position_snapshot', 'ranking_top3_notified', 'badge_unlocked'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      select: { action: true, details: true, createdAt: true },
    });

    // Convert to notification format
    const notifications: RankingNotification[] = [];

    for (const log of logs) {
      const details = log.details as any;

      if (log.action === 'ranking_top3_notified') {
        const medals = ['🥇', '🥈', '🥉'];
        notifications.push({
          id: `notif-${log.createdAt.getTime()}`,
          type: 'top_3',
          title: `${medals[(details.position || 1) - 1]} Top ${details.position}`,
          message: `Estás en el puesto #${details.position} del ranking global`,
          rankingType: 'global',
          newPosition: details.position,
          createdAt: log.createdAt,
        });
      }
    }

    return {
      notifications: notifications.slice(0, limit),
      count: notifications.length,
    };
  }

  // ─── MARK ALL AS READ ─────────────────────────────
  async markAllAsRead(userId: string) {
    this.logger.log(`MarkAllAsRead: userId=${userId}`);
    // In a real app, we'd have a read flag. For now, just return success.
    return { message: 'Notifications marked as read' };
  }
}
