import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserProfile {
  userId: string;
  favoriteCategories: CategoryStat[];
  ignoredCategories: CategoryStat[];
  preferredDifficulty: string;
  avgSessionMinutes: number;
  preferredTimeOfDay: string; // morning, afternoon, evening, night
  frequencyDaysPerWeek: number;
  totalQuestsCompleted: number;
  totalQuestsAccepted: number;
  completionRate: number;
  avgXpPerQuest: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  daysSinceFirstQuest: number;
  recentMood: string;
  lastCompletedCategory: string | null;
  consecutiveDaysSameCategory: number;
  explorersScore: number; // 0-100: how much they explore vs stick to favorites
}

export interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
  avgXp: number;
  lastCompleted: Date | null;
}

@Injectable()
export class BotiProfileService {
  private readonly logger = new Logger(BotiProfileService.name);

  constructor(private prisma: PrismaService) {}

  // ─── BUILD FULL USER PROFILE ───────────────────────
  async buildProfile(userId: string): Promise<UserProfile> {
    this.logger.log(`Building profile for user ${userId}`);

    const [
      completedQuests,
      allQuests,
      user,
      streak,
      recentLogs,
      timeStats,
    ] = await Promise.all([
      this.prisma.userQuest.findMany({
        where: { userId, status: 'completed' },
        include: { quest: { select: { category: true, difficulty: true, xpReward: true, coinsReward: true, duration: true, type: true } } },
        orderBy: { completedAt: 'desc' },
        take: 100,
      }),
      this.prisma.userQuest.findMany({
        where: { userId },
        select: { status: true, quest: { select: { category: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, totalXp: true, createdAt: true, lastLoginAt: true },
      }),
      this.prisma.streak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      this.prisma.activityLog.findMany({
        where: { userId, action: 'quest_completed' },
        select: { createdAt: true, details: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.activityLog.findMany({
        where: { userId, action: { in: ['quest_completed', 'login'] } },
        select: { createdAt: true, action: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    // ─── Category stats ─────────────────────────────
    const categoryMap: Record<string, { count: number; xp: number; lastCompleted: Date | null }> = {};
    for (const uq of completedQuests) {
      const cat = uq.quest.category;
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, xp: 0, lastCompleted: null };
      categoryMap[cat].count++;
      categoryMap[cat].xp += uq.quest.xpReward;
      if (!categoryMap[cat].lastCompleted || (uq.completedAt && uq.completedAt > categoryMap[cat].lastCompleted!)) {
        categoryMap[cat].lastCompleted = uq.completedAt;
      }
    }

    const totalCompleted = completedQuests.length;
    const allCategories = ['nature', 'creativity', 'kindness', 'learning', 'movement', 'social', 'photography', 'relaxation', 'adventure'];

    const categoryStats: CategoryStat[] = allCategories.map(cat => ({
      category: cat,
      count: categoryMap[cat]?.count || 0,
      percentage: totalCompleted > 0 ? ((categoryMap[cat]?.count || 0) / totalCompleted) * 100 : 0,
      avgXp: categoryMap[cat] ? Math.round(categoryMap[cat].xp / categoryMap[cat].count) : 0,
      lastCompleted: categoryMap[cat]?.lastCompleted || null,
    }));

    // Sort by count desc
    categoryStats.sort((a, b) => b.count - a.count);

    const favoriteCategories = categoryStats.filter(c => c.count > 0).slice(0, 3);
    const ignoredCategories = categoryStats.filter(c => c.count === 0);

    // ─── Difficulty preference ───────────────────────
    const difficultyCounts: Record<string, number> = {};
    for (const uq of completedQuests) {
      const d = uq.quest.difficulty;
      difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;
    }
    const preferredDifficulty = Object.entries(difficultyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'normal';

    // ─── Time of day ────────────────────────────────
    const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const log of recentLogs) {
      const hour = new Date(log.createdAt).getHours();
      if (hour >= 6 && hour < 12) hourCounts.morning++;
      else if (hour >= 12 && hour < 18) hourCounts.afternoon++;
      else if (hour >= 18 && hour < 23) hourCounts.evening++;
      else hourCounts.night++;
    }
    const preferredTimeOfDay = (Object.entries(hourCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || 'afternoon';

    // ─── Frequency (days per week) ──────────────────
    const uniqueDays = new Set(
      timeStats
        .filter(t => t.action === 'quest_completed')
        .map(t => new Date(t.createdAt).toISOString().split('T')[0])
    );
    const daysSinceFirst = user?.createdAt
      ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
      : 1;
    const frequencyDaysPerWeek = Math.min(7, (uniqueDays.size / daysSinceFirst) * 7);

    // ─── Completion rate ─────────────────────────────
    const totalAccepted = allQuests.length;
    const completionRate = totalAccepted > 0 ? (totalCompleted / totalAccepted) * 100 : 0;

    // ─── Avg session ────────────────────────────────
    let avgSessionMinutes = 15; // default
    if (completedQuests.length > 0) {
      const durations = completedQuests.map(q => q.quest.duration);
      avgSessionMinutes = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    // ─── Explorer score ──────────────────────────────
    // 100 = tries everything equally, 0 = sticks to one category only
    const activeCategories = categoryStats.filter(c => c.count > 0).length;
    const explorersScore = Math.round((activeCategories / allCategories.length) * 100);

    // ─── Last completed category ─────────────────────
    const lastCompleted = completedQuests[0];
    const lastCompletedCategory = lastCompleted?.quest.category || null;

    // ─── Consecutive days same category ──────────────
    let consecutiveDaysSameCategory = 0;
    if (lastCompletedCategory) {
      for (const uq of completedQuests) {
        if (uq.quest.category === lastCompletedCategory) {
          consecutiveDaysSameCategory++;
        } else {
          break;
        }
      }
    }

    // ─── Recent mood ─────────────────────────────────
    let recentMood = 'neutral';
    if (completedQuests.length > 0) {
      const recentCompletions = completedQuests.filter(q => {
        const daysAgo = (Date.now() - new Date(q.completedAt!).getTime()) / 86400000;
        return daysAgo <= 3;
      });
      if (recentCompletions.length >= 3) recentMood = 'great';
      else if (recentCompletions.length >= 1) recentMood = 'good';
    }
    if (streak && streak.currentStreak >= 7) recentMood = 'great';
    else if (!streak || streak.currentStreak === 0) recentMood = 'neutral';

    const profile: UserProfile = {
      userId,
      favoriteCategories,
      ignoredCategories,
      preferredDifficulty,
      avgSessionMinutes: Math.round(avgSessionMinutes),
      preferredTimeOfDay,
      frequencyDaysPerWeek: Math.round(frequencyDaysPerWeek * 10) / 10,
      totalQuestsCompleted: totalCompleted,
      totalQuestsAccepted: totalAccepted,
      completionRate: Math.round(completionRate),
      avgXpPerQuest: totalCompleted > 0 ? Math.round(completedQuests.reduce((s, q) => s + q.quest.xpReward, 0) / totalCompleted) : 0,
      currentLevel: user?.level || 1,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      daysSinceFirstQuest: daysSinceFirst,
      recentMood,
      lastCompletedCategory,
      consecutiveDaysSameCategory,
      explorersScore,
    };

    this.logger.log(`Profile built: level=${profile.currentLevel}, streak=${profile.currentStreak}, favorites=${favoriteCategories.map(c => c.category).join(',')}, explorer=${profile.explorersScore}`);
    return profile;
  }

  // ─── GET RECOMMENDED QUESTS FOR USER ───────────────
  async getRecommendedQuests(userId: string, limit: number = 5): Promise<any[]> {
    const profile = await this.buildProfile(userId);

    // Determine which categories to recommend
    let targetCategories: string[] = [];

    // If user always does the same category → push them to explore
    if (profile.consecutiveDaysSameCategory >= 3) {
      targetCategories = profile.ignoredCategories.slice(0, 3).map(c => c.category);
      if (targetCategories.length === 0) {
        targetCategories = ['nature', 'creativity', 'adventure'];
      }
    }
    // If user is low explorer score → recommend different categories
    else if (profile.explorersScore < 30) {
      targetCategories = profile.ignoredCategories.slice(0, 2).map(c => c.category);
      // Mix in a favorite
      if (profile.favoriteCategories.length > 0) {
        targetCategories.push(profile.favoriteCategories[0].category);
      }
    }
    // Otherwise → mix of favorites and exploration
    else {
      if (profile.favoriteCategories.length > 0) {
        targetCategories.push(profile.favoriteCategories[0].category);
      }
      if (profile.ignoredCategories.length > 0) {
        targetCategories.push(profile.ignoredCategories[0].category);
      }
      // Add a random unexplored one
      const randomIgnored = profile.ignoredCategories[Math.floor(Math.random() * profile.ignoredCategories.length)];
      if (randomIgnored) targetCategories.push(randomIgnored.category);
    }

    // Get quests in target categories the user hasn't completed
    const completedQuestIds = (await this.prisma.userQuest.findMany({
      where: { userId, status: 'completed' },
      select: { questId: true },
    })).map(q => q.questId);

    const quests = await this.prisma.quest.findMany({
      where: {
        isActive: true,
        category: { in: targetCategories as any[] },
        id: { notIn: completedQuestIds },
        minLevel: { lte: profile.currentLevel },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    });

    // Score and sort quests
    const scored = quests.map(q => {
      let score = 0;

      // Favorite category = high score
      if (profile.favoriteCategories.some(f => f.category === q.category)) score += 30;

      // Ignored category = exploration bonus (if explorer score is low)
      if (profile.ignoredCategories.some(i => i.category === q.category) && profile.explorersScore < 50) score += 20;

      // Preferred difficulty
      if (q.difficulty === profile.preferredDifficulty) score += 15;

      // Duration matches session preference
      const durationDiff = Math.abs(q.duration - profile.avgSessionMinutes);
      if (durationDiff <= 5) score += 10;
      else if (durationDiff <= 15) score += 5;

      // AI-generated quests get a slight boost (novelty)
      if (q.isAIGenerated) score += 5;

      // Weekly quests if user is active
      if (q.type === 'weekly' && profile.frequencyDaysPerWeek >= 4) score += 10;

      // Random factor for variety
      score += Math.random() * 10;

      return { quest: q, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.quest);
  }

  // ─── GENERATE BOTI MESSAGE FOR MODE ────────────────
  generateModeMessage(mode: string, profile: UserProfile, quest?: any): string {
    const { favoriteCategories, currentStreak, currentLevel, totalQuestsCompleted, explorersScore, consecutiveDaysSameCategory } = profile;

    const catEmojis: Record<string, string> = {
      nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
      movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
    };

    switch (mode) {
      case 'recommender': {
        if (quest) {
          const emoji = catEmotes[quest.category] || '🎯';
          return `Tengo una misión que creo que te va a gustar ${emoji}\n\n«${quest.title}»\n${quest.description}\n\n⏱ ${quest.duration}min · ${quest.difficulty} · +${quest.xpReward}XP`;
        }
        if (favoriteCategories.length > 0) {
          const cat = favoriteCategories[0];
          return `He notado que disfrutas mucho las misiones de ${catEmojis[cat.category] || '🎯'} ${cat.category}. Te tengo algo que creo que te va a gustar.`;
        }
        return `Tengo una misión para ti 🎯. ¿Qué opinas?`;
      }

      case 'motivator': {
        if (currentStreak >= 7) {
          return `¡Llevas ${currentStreak} días de racha! 🔥 ¡Eres imparable! No pienso dejarte parar.`;
        }
        if (currentStreak >= 3) {
          return `¡${currentStreak} días seguidos! 🔥 Ya vas ${currentStreak} días. ¡Dale uno más!`;
        }
        if (currentStreak === 0) {
          return `No pasa nada 🌱. Tu aventura continúa. ¿Empezamos de nuevo hoy?`;
        }
        if (totalQuestsCompleted >= 50) {
          return `Ya completaste ${totalQuestsCompleted} misiones. Eres una leyenda 🌟.`;
        }
        if (totalQuestsCompleted >= 10) {
          return `Llevas ${totalQuestsCompleted} misiones completadas. ¡Sigue así! 💪`;
        }
        return `¡Hola! ¿Listo para algo nuevo hoy? 🌱`;
      }

      case 'explorer': {
        if (consecutiveDaysSameCategory >= 3 && favoriteCategories.length > 0) {
          const ignored = profile.ignoredCategories.slice(0, 3);
          const catNames = ignored.map(c => `${catEmojis[c.category] || '🎯'} ${c.category}`).join(', ');
          return `He notado que últimamente solo haces retos de ${catEmojis[favoriteCategories[0].category] || '🎯'} ${favoriteCategories[0].category}. Hoy quiero sacarte un poquito de tu zona de confort.\n\n¿Qué tal probar algo de: ${catNames}?`;
        }
        if (explorersScore < 30) {
          return `Siempre eliges ${favoriteCategories[0]?.category || 'la misma categoría'}. Probemos algo diferente hoy 🧭`;
        }
        if (explorersScore >= 70) {
          return `¡Me encanta que exploras todo! 🌍 Eres un verdadero explorador.`;
        }
        return `Hoy es buen día para descubrir algo nuevo 🧭. ¿Qué te parece esta aventura?`;
      }

      case 'narrador': {
        const lines: string[] = [];
        if (totalQuestsCompleted > 0) {
          lines.push(`Has recorrido bastante camino 🗺️`);
          lines.push(`${totalQuestsCompleted} misiones completadas, nivel ${currentLevel}`);
        }
        if (currentStreak > 0) {
          lines.push(`Racha de ${currentStreak} días 🔥`);
        }
        if (favoriteCategories.length > 0) {
          lines.push(`Tu categoría favorita: ${catEmojis[favoriteCategories[0].category] || '🎯'} ${favoriteCategories[0].category}`);
        }
        if (explorersScore >= 70) {
          lines.push(`Eres explorador nato 🌍`);
        }
        lines.push(`\nMira todo lo que has conseguido. ¡Sigue así! 🌸`);
        return lines.join('\n');
      }

      default:
        return `¿Qué hacemos hoy? 🤖`;
    }
  }
}

// Category emojis helper
const catEmotes: Record<string, string> = {
  nature: '🌿', creativity: '🎨', kindness: '❤️', learning: '🧠',
  movement: '🏃', social: '👥', photography: '📸', relaxation: '🌙', adventure: '🗺️',
};
