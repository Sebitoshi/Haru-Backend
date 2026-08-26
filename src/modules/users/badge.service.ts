import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: any;
  xpReward: number;
  coinsReward: number;
}

@Injectable()
export class BadgeService {
  constructor(private prisma: PrismaService) {}

  // ─── BADGE DEFINITIONS ────────────────────────────
  private readonly BADGES: BadgeDefinition[] = [
    // Milestones
    {
      code: 'first_steps',
      name: 'Primeros Pasos',
      description: 'Completó el onboarding',
      icon: '👶',
      category: 'milestone',
      requirement: { type: 'onboarding' },
      xpReward: 10,
      coinsReward: 5,
    },
    {
      code: 'veteran',
      name: 'Veterano',
      description: '30 días con BOTI',
      icon: '🎖️',
      category: 'milestone',
      requirement: { type: 'days', value: 30 },
      xpReward: 100,
      coinsReward: 50,
    },
    {
      code: 'pioneer',
      name: 'Pionero',
      description: '7 días con BOTI',
      icon: '🌟',
      category: 'milestone',
      requirement: { type: 'days', value: 7 },
      xpReward: 50,
      coinsReward: 25,
    },
    {
      code: 'newcomer',
      name: 'Recién Llegado',
      description: '1 día con BOTI',
      icon: '🌱',
      category: 'milestone',
      requirement: { type: 'days', value: 1 },
      xpReward: 10,
      coinsReward: 5,
    },

    // Streaks
    {
      code: 'on_fire',
      name: 'En Llamas',
      description: '7 días de racha',
      icon: '🔥',
      category: 'streak',
      requirement: { type: 'streak', value: 7 },
      xpReward: 75,
      coinsReward: 40,
    },
    {
      code: 'unstoppable',
      name: 'Imparable',
      description: '30 días de racha',
      icon: '⚡',
      category: 'streak',
      requirement: { type: 'streak', value: 30 },
      xpReward: 200,
      coinsReward: 100,
    },
    {
      code: 'consistent',
      name: 'Consistente',
      description: '3 días de racha',
      icon: '📅',
      category: 'streak',
      requirement: { type: 'streak', value: 3 },
      xpReward: 30,
      coinsReward: 15,
    },

    // Collection
    {
      code: 'collector',
      name: 'Coleccionista',
      description: '10 objetos en inventario',
      icon: '🎒',
      category: 'collection',
      requirement: { type: 'count', action: 'item_acquired', value: 10 },
      xpReward: 80,
      coinsReward: 40,
    },
    {
      code: 'shopper',
      name: 'Comprador',
      description: 'Primera compra en tienda',
      icon: '🛍️',
      category: 'collection',
      requirement: { type: 'count', action: 'purchase', value: 1 },
      xpReward: 20,
      coinsReward: 10,
    },
    {
      code: 'fashionista',
      name: 'Fashionista',
      description: '5 objetos equipados',
      icon: '👕',
      category: 'collection',
      requirement: { type: 'count', action: 'item_equipped', value: 5 },
      xpReward: 50,
      coinsReward: 25,
    },

    // Social
    {
      code: 'friendly',
      name: 'Amigable',
      description: 'Completó 5 misiones sociales',
      icon: '🤝',
      category: 'social',
      requirement: { type: 'count', action: 'social_quest_completed', value: 5 },
      xpReward: 60,
      coinsReward: 30,
    },
    {
      code: 'first_quest',
      name: 'Primera Misión',
      description: 'Completó su primera misión',
      icon: '🎯',
      category: 'milestone',
      requirement: { type: 'count', action: 'quest_completed', value: 1 },
      xpReward: 15,
      coinsReward: 10,
    },
    {
      code: 'quest_master',
      name: 'Maestro de Misiones',
      description: 'Completó 50 misiones',
      icon: '🏆',
      category: 'milestone',
      requirement: { type: 'count', action: 'quest_completed', value: 50 },
      xpReward: 300,
      coinsReward: 150,
    },
    {
      code: 'surprise_lover',
      name: 'Amante Sorpresas',
      description: 'Completó 5 misiones sorpresa',
      icon: '🎲',
      category: 'milestone',
      requirement: { type: 'count', action: 'surprise_quest_completed', value: 5 },
      xpReward: 50,
      coinsReward: 25,
    },
    {
      code: 'profile_complete',
      name: 'Perfil Completo',
      description: 'Avatar + bio + preferencias',
      icon: '✨',
      category: 'milestone',
      requirement: { type: 'profile_complete' },
      xpReward: 25,
      coinsReward: 15,
    },
  ];

  // ─── SEED BADGES ──────────────────────────────────
  async seedBadges() {
    console.log(`[BadgeService] SeedBadges: Upserting ${this.BADGES.length} badges`);

    for (const badge of this.BADGES) {
      await this.prisma.badge.upsert({
        where: { code: badge.code },
        update: {},
        create: {
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
    }

    console.log(`[BadgeService] SeedBadges: OK`);
  }

  // ─── CHECK AND AWARD BADGES ───────────────────────
  async checkAndAwardBadges(userId: string): Promise<string[]> {
    console.log(`[BadgeService] CheckAndAward: userId=${userId}`);

    const awarded: string[] = [];

    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        avatarUrl: true,
        bio: true,
        onboardingCompleted: true,
        preference: { select: { theme: true } },
      },
    });

    if (!user) return awarded;

    // Get user's existing badges
    const existingBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    // Get all badges
    const allBadges = await this.prisma.badge.findMany();

    // Get activity counts
    const activityCounts = await this.prisma.activityLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: { action: true },
    });

    const countMap = new Map(activityCounts.map((a) => [a.action, a._count.action]));

    // Calculate account age in days
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check each badge
    for (const badge of allBadges) {
      if (existingBadgeIds.has(badge.id)) continue;

      const req = badge.requirement as any;
      let earned = false;

      switch (req.type) {
        case 'days':
          earned = accountAgeDays >= req.value;
          break;

        case 'streak':
          // TODO: When streaks module is implemented, check actual streak
          // For now, check activity consistency
          earned = false;
          break;

        case 'count':
          const count = countMap.get(req.action) || 0;
          earned = count >= req.value;
          break;

        case 'onboarding':
          earned = user.onboardingCompleted;
          break;

        case 'profile_complete':
          earned = !!(user.avatarUrl && user.bio && user.preference);
          break;
      }

      if (earned) {
        await this.prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
          },
        });

        awarded.push(badge.code);
        console.log(`[BadgeService] Badge awarded: ${badge.icon} ${badge.name} to ${userId}`);
      }
    }

    console.log(`[BadgeService] CheckAndAward: ${awarded.length} new badges`);
    return awarded;
  }

  // ─── GET USER BADGES ──────────────────────────────
  async getUserBadges(userId: string) {
    console.log(`[BadgeService] GetUserBadges: userId=${userId}`);

    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          select: {
            code: true,
            name: true,
            description: true,
            icon: true,
            category: true,
            xpReward: true,
            coinsReward: true,
          },
        },
      },
      orderBy: { unlockedAt: 'desc' },
    });

    return userBadges.map((ub) => ({
      ...ub.badge,
      unlockedAt: ub.unlockedAt,
    }));
  }

  // ─── GET ALL AVAILABLE BADGES ─────────────────────
  async getAllBadges() {
    console.log(`[BadgeService] GetAllBadges`);

    return this.prisma.badge.findMany({
      select: {
        code: true,
        name: true,
        description: true,
        icon: true,
        category: true,
        requirement: true,
        xpReward: true,
        coinsReward: true,
      },
      orderBy: { category: 'asc' },
    });
  }

  // ─── GET BADGE PROGRESS ───────────────────────────
  async getBadgeProgress(userId: string) {
    console.log(`[BadgeService] GetBadgeProgress: userId=${userId}`);

    const allBadges = await this.getAllBadges();
    const userBadges = await this.getUserBadges(userId);
    const earnedCodes = new Set(userBadges.map((b) => b.code));

    // Get user data for progress calculation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    const accountAgeDays = user
      ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const activityCounts = await this.prisma.activityLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: { action: true },
    });
    const countMap = new Map(activityCounts.map((a) => [a.action, a._count.action]));

    return allBadges.map((badge) => {
      const earned = earnedCodes.has(badge.code);
      const req = badge.requirement as any;
      let progress = 0;
      let target = 1;

      if (!earned) {
        switch (req.type) {
          case 'days':
            progress = Math.min(accountAgeDays, req.value);
            target = req.value;
            break;
          case 'count':
            progress = Math.min(countMap.get(req.action) || 0, req.value);
            target = req.value;
            break;
          case 'onboarding':
            progress = 0;
            target = 1;
            break;
          case 'profile_complete':
            progress = 0;
            target = 1;
            break;
        }
      } else {
        progress = target;
      }

      return {
        ...badge,
        earned,
        progress,
        target,
        percentage: Math.min(Math.round((progress / target) * 100), 100),
      };
    });
  }
}
