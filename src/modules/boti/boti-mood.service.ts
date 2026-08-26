import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MoodFactors {
  recentActivity: number; // 0-10, based on recent logins
  streakHealth: number; // 0-10, based on streak status
  questProgress: number; // 0-10, based on quest completions
  timeOfDay: number; // 0-10, based on current hour
  inactivity: number; // 0-10, 10 = very inactive
}

@Injectable()
export class BotiMoodService {
  constructor(private prisma: PrismaService) {}

  // ─── CALCULATE MOOD ───────────────────────────────
  async calculateMood(userId: string): Promise<{
    mood: string;
    factors: MoodFactors;
    score: number;
  }> {
    console.log(`[BotiMoodService] CalculateMood: userId=${userId}`);

    const factors = await this.calculateFactors(userId);

    // Weighted score calculation
    const score =
      factors.recentActivity * 0.25 +
      factors.streakHealth * 0.2 +
      factors.questProgress * 0.25 +
      factors.timeOfDay * 0.1 +
      (10 - factors.inactivity) * 0.2;

    // Map score to mood
    let mood: string;
    if (score >= 8) {
      mood = 'great';
    } else if (score >= 6) {
      mood = 'good';
    } else if (score >= 4) {
      mood = 'neutral';
    } else if (score >= 2) {
      mood = 'bad';
    } else {
      mood = 'awful';
    }

    console.log(
      `[BotiMoodService] CalculateMood: ${mood} (score: ${score.toFixed(1)})`,
    );

    return { mood, factors, score: Math.round(score * 10) / 10 };
  }

  // ─── CALCULATE FACTORS ────────────────────────────
  private async calculateFactors(userId: string): Promise<MoodFactors> {
    const now = new Date();

    // 1. Recent Activity (logins in last 7 days)
    const recentLogins = await this.prisma.activityLog.count({
      where: {
        userId,
        action: 'login',
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const recentActivity = Math.min(recentLogins * 2, 10); // 5 logins = 10

    // 2. Streak Health (check last activity date)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    });

    let streakHealth = 5; // default
    if (user?.lastLoginAt) {
      const hoursSinceLogin =
        (now.getTime() - new Date(user.lastLoginAt).getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLogin < 24) streakHealth = 10;
      else if (hoursSinceLogin < 48) streakHealth = 7;
      else if (hoursSinceLogin < 72) streakHealth = 4;
      else if (hoursSinceLogin < 168) streakHealth = 2;
      else streakHealth = 0;
    }

    // 3. Quest Progress (quests completed in last 7 days)
    const recentQuests = await this.prisma.activityLog.count({
      where: {
        userId,
        action: 'quest_completed',
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const questProgress = Math.min(recentQuests * 2.5, 10); // 4 quests = 10

    // 4. Time of Day (BOTI is happier during active hours)
    const hour = now.getHours();
    let timeOfDay: number;
    if (hour >= 9 && hour <= 21) {
      timeOfDay = 8; // Active hours
    } else if (hour >= 6 && hour < 9) {
      timeOfDay = 6; // Morning
    } else if (hour > 21 && hour <= 23) {
      timeOfDay = 5; // Evening
    } else {
      timeOfDay = 2; // Late night / early morning
    }

    // 5. Inactivity (hours since last interaction)
    const boti = await this.prisma.botiCharacter.findUnique({
      where: { userId },
      select: { lastInteractedAt: true },
    });

    let inactivity = 0;
    if (boti?.lastInteractedAt) {
      const hoursSinceInteraction =
        (now.getTime() - new Date(boti.lastInteractedAt).getTime()) /
        (1000 * 60 * 60);
      inactivity = Math.min(hoursSinceInteraction / 24, 10); // 10 days = 10
    } else {
      inactivity = 10; // Never interacted
    }

    return {
      recentActivity,
      streakHealth,
      questProgress,
      timeOfDay,
      inactivity,
    };
  }

  // ─── GET MOOD DESCRIPTION ─────────────────────────
  getMoodDescription(mood: string): {
    name: string;
    emoji: string;
    color: string;
    description: string;
  } {
    const moods: Record<
      string,
      {
        name: string;
        emoji: string;
        color: string;
        description: string;
      }
    > = {
      great: {
        name: 'Genial',
        emoji: '😊',
        color: '#4CAF50',
        description: 'BOTI está muy contento contigo',
      },
      good: {
        name: 'Bien',
        emoji: '🙂',
        color: '#8BC34A',
        description: 'BOTI está de buen humor',
      },
      neutral: {
        name: 'Normal',
        emoji: '😐',
        color: '#FFC107',
        description: 'BOTI está tranquilo',
      },
      bad: {
        name: 'Triste',
        emoji: '😔',
        color: '#FF9800',
        description: 'BOTI extraña tu actividad',
      },
      awful: {
        name: 'Preocupado',
        emoji: '😟',
        color: '#F44336',
        description: 'BOTI está preocupado por ti',
      },
    };

    return moods[mood] || moods.neutral;
  }
}
