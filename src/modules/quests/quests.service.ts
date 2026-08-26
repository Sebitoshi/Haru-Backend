import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestDto, QuestCategoryDto, QuestDifficultyDto } from './dto/create-quest.dto';
import { QuestFiltersDto } from './dto/quest-filters.dto';
import { Quest, QuestCategory, QuestDifficulty, UserQuestStatus } from '@prisma/client';

// ─── REWARD TABLES ──────────────────────────────────
const XP_BY_DIFFICULTY: Record<string, number> = {
  easy: 10,
  normal: 25,
  hard: 50,
  special: 100,
};

const COINS_BY_DIFFICULTY: Record<string, number> = {
  easy: 8,
  normal: 15,
  hard: 30,
  special: 60,
};

const DURATION_MULTIPLIER: Record<string, number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.3,
  special: 1.5,
};

// ─── CATEGORY METADATA ──────────────────────────────
export const QUEST_CATEGORIES = {
  nature: { emoji: '🌿', name: 'Naturaleza', description: 'Actividades al aire libre' },
  creativity: { emoji: '🎨', name: 'Creatividad', description: 'Actividades creativas' },
  kindness: { emoji: '❤️', name: 'Bondad', description: 'Actos de bondad' },
  learning: { emoji: '🧠', name: 'Aprendizaje', description: 'Aprendizaje' },
  movement: { emoji: '🏃', name: 'Movimiento', description: 'Ejercicio y movimiento' },
  social: { emoji: '👥', name: 'Social', description: 'Interacción social' },
  photography: { emoji: '📸', name: 'Fotografía', description: 'Capturar momentos' },
  relaxation: { emoji: '🌙', name: 'Tranquilidad', description: 'Descanso y desconexión' },
  adventure: { emoji: '🗺️', name: 'Aventura', description: 'Exploración y aventura' },
} as const;

// ─── SEED QUESTS ────────────────────────────────────
interface SeedQuest {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  type?: string;
  xpReward?: number;
  coinsReward?: number;
}

const SEED_QUESTS: SeedQuest[] = [
  // 🌿 Naturaleza
  { title: 'Florecimiento', description: 'Sal a caminar y encuentra una flor. Tómale una foto y Observa sus detalles.', category: 'nature', difficulty: 'easy', duration: 10, type: 'regular' },
  { title: 'Aventura Verde', description: 'Visita un parque o zona verde cercana. Pasa al menos 15 minutos disfrutando del entorno.', category: 'nature', difficulty: 'normal', duration: 20, type: 'regular' },
  { title: 'Cielo Azul', description: 'Mira el cielo durante 5 minutos. Nubes, pájaros, colores. Describe lo que ves.', category: 'nature', difficulty: 'easy', duration: 10, type: 'regular' },

  // 🎨 Creatividad
  { title: 'Dibujo Rápido', description: 'Dibuja algo que veas a tu alrededor en menos de 5 minutos. No importa si no eres bueno dibujando.', category: 'creativity', difficulty: 'easy', duration: 10, type: 'regular' },
  { title: 'Foto Creativa', description: 'Toma una foto de algo cotidiano pero desde un ángulo completamente diferente.', category: 'creativity', difficulty: 'normal', duration: 15, type: 'regular' },
  { title: 'Poema del Día', description: 'Escribe un poema corto (4-8 versos) sobre cómo te sientes hoy.', category: 'creativity', difficulty: 'normal', duration: 20, type: 'regular' },

  // ❤️ Bondad
  { title: 'Mensaje Amable', description: 'Envía un mensaje sincero de agradecimiento a alguien que aprecias.', category: 'kindness', difficulty: 'easy', duration: 5, type: 'regular' },
  { title: 'Acto de Bondad', description: 'Realiza un acto de bondad por alguien sin esperar nada a cambio.', category: 'kindness', difficulty: 'normal', duration: 15, type: 'regular' },

  // 🧠 Aprendizaje
  { title: 'Curiosidad', description: 'Aprende algo nuevo hoy que no sabías. Puede ser un dato, una palabra, un concepto.', category: 'learning', difficulty: 'easy', duration: 10, type: 'regular' },
  { title: 'Mini Curso', description: 'Dedica 20 minutos a aprender algo nuevo: un idioma, una habilidad, un tema que te interese.', category: 'learning', difficulty: 'hard', duration: 30, type: 'regular' },

  // 🏃 Movimiento
  { title: 'Pasos Primeros', description: 'Da un paseo de al menos 10 minutos. Sin prisas, solo camina y observa.', category: 'movement', difficulty: 'easy', duration: 15, type: 'regular' },
  { title: 'Energía Activa', description: 'Haz 15 minutos de ejercicio: caminar rápido, saltar, estirar, bailar. Lo que prefieras.', category: 'movement', difficulty: 'normal', duration: 20, type: 'regular' },
  { title: 'Reto del Movimiento', description: 'Completa una actividad física de al menos 30 minutos. Correr, nadar, bicicleta, lo que sea.', category: 'movement', difficulty: 'hard', duration: 35, type: 'regular' },

  // 👥 Social
  { title: 'Conversación Real', description: 'Ten una conversación cara a cara con alguien por al menos 10 minutos.', category: 'social', difficulty: 'easy', duration: 15, type: 'regular' },
  { title: 'Reconexión', description: 'Contacta con alguien con quien hace tiempo que no hablas.', category: 'social', difficulty: 'normal', duration: 10, type: 'regular' },

  // 📸 Fotografía
  { title: 'Captura el Momento', description: 'Toma una foto de algo que te llame la atención hoy. Comparte lo que viste.', category: 'photography', difficulty: 'easy', duration: 10, type: 'regular' },
  { title: 'Fotografía Macro', description: 'Acércate mucho a un objeto y tómale una foto. Descubre detalles que no se ven a simple vista.', category: 'photography', difficulty: 'normal', duration: 15, type: 'regular' },

  // 🌙 Tranquilidad
  { title: 'Pausa Consciente', description: 'Siéntate en un lugar tranquilo y respira profundamente durante 5 minutos. Solo enfócate en respirar.', category: 'relaxation', difficulty: 'easy', duration: 10, type: 'regular' },
  { title: 'Desconexión', description: 'Pasa 20 minutos sin pantalla. Lee, medita, mira por la ventana, o simplemente descansa.', category: 'relaxation', difficulty: 'normal', duration: 25, type: 'regular' },

  // 🗺️ Aventura
  { title: 'Explorador', description: 'Ve a un lugar donde no has estado antes. Puede ser una calle nueva, una tienda, un parque.', category: 'adventure', difficulty: 'easy', duration: 20, type: 'regular' },
  { title: 'Ruta Nueva', description: 'Toma un camino diferente al habitual para llegar a algún lugar que visitas frecuentemente.', category: 'adventure', difficulty: 'normal', duration: 25, type: 'regular' },
  { title: 'Descubrimiento', description: 'Explora un barrio o zona que no conoces. Observa, fotografía, disfruta del descubrimiento.', category: 'adventure', difficulty: 'hard', duration: 45, type: 'regular' },
];

@Injectable()
export class QuestsService {
  constructor(private prisma: PrismaService) {}

  // ─── SEED QUESTS ──────────────────────────────────
  async seedQuests() {
    console.log(`[QuestsService] SeedQuests: Upserting ${SEED_QUESTS.length} quests`);

    let created = 0;
    for (const quest of SEED_QUESTS) {
      const difficulty = quest.difficulty || 'normal';
      const xp = quest.xpReward || XP_BY_DIFFICULTY[difficulty];
      const coins = quest.coinsReward || COINS_BY_DIFFICULTY[difficulty];

      await this.prisma.quest.upsert({
        where: { id: quest.title.toLowerCase().replace(/\s+/g, '-') },
        update: {},
        create: {
          id: quest.title.toLowerCase().replace(/\s+/g, '-'),
          title: quest.title,
          description: quest.description,
          category: quest.category as QuestCategory,
          difficulty: difficulty as QuestDifficulty,
          duration: quest.duration,
          xpReward: xp,
          coinsReward: coins,
          type: (quest.type as any) || 'regular',
        },
      });
      created++;
    }

    console.log(`[QuestsService] SeedQuests: OK — ${created} quests upserted`);
    return { message: `${created} quests seeded successfully`, count: created };
  }

  // ─── GET ALL QUESTS ───────────────────────────────
  async getAllQuests(filters?: QuestFiltersDto) {
    console.log(`[QuestsService] GetAllQuests:`, filters);

    const where: any = { isActive: true };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }
    if (filters?.maxDuration) {
      where.duration = { lte: filters.maxDuration };
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const quests = await this.prisma.quest.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { difficulty: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        duration: true,
        xpReward: true,
        coinsReward: true,
        type: true,
        isAIGenerated: true,
        expiresAt: true,
      },
    });

    // Enrich with category metadata
    return quests.map((q) => ({
      ...q,
      categoryInfo: QUEST_CATEGORIES[q.category as keyof typeof QUEST_CATEGORIES],
    }));
  }

  // ─── GET QUEST BY ID ──────────────────────────────
  async getQuestById(questId: string) {
    console.log(`[QuestsService] GetQuestById: ${questId}`);

    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        duration: true,
        xpReward: true,
        coinsReward: true,
        type: true,
        isAIGenerated: true,
        requirements: true,
        expiresAt: true,
      },
    });

    if (!quest) {
      throw new NotFoundException(`Quest ${questId} not found`);
    }

    return {
      ...quest,
      categoryInfo: QUEST_CATEGORIES[quest.category as keyof typeof QUEST_CATEGORIES],
    };
  }

  // ─── CREATE QUEST (Admin/Boti) ────────────────────
  async createQuest(dto: CreateQuestDto) {
    console.log(`[QuestsService] CreateQuest: ${dto.title}`);

    const difficulty = dto.difficulty || 'normal';
    const xp = dto.xpReward || this.calculateXP(dto.category, difficulty, dto.duration);
    const coins = dto.coinsReward || this.calculateCoins(dto.category, difficulty);

    const quest = await this.prisma.quest.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category as QuestCategory,
        difficulty: difficulty as QuestDifficulty,
        duration: dto.duration,
        xpReward: xp,
        coinsReward: coins,
        type: (dto.type as any) || 'regular',
        isAIGenerated: dto.isAIGenerated || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    console.log(`[QuestsService] CreateQuest: OK — ${quest.id} (${quest.category}, ${quest.difficulty})`);
    return quest;
  }

  // ─── DAILY QUEST ──────────────────────────────────
  async getDailyQuest(userId: string) {
    console.log(`[QuestsService] GetDailyQuest: userId=${userId}`);

    // Get today's date boundaries (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Check if user already has a daily quest for today
    const existingDaily = await this.prisma.userQuest.findFirst({
      where: {
        userId,
        quest: {
          type: 'daily',
          isActive: true,
        },
        createdAt: { gte: today, lt: tomorrow },
      },
      include: { quest: true },
    });

    if (existingDaily) {
      return {
        ...existingDaily.quest,
        userQuestId: existingDaily.id,
        status: existingDaily.status,
        startedAt: existingDaily.startedAt,
        isToday: true,
        categoryInfo: QUEST_CATEGORIES[existingDaily.quest.category as keyof typeof QUEST_CATEGORIES],
      };
    }

    // Get user's recent categories to avoid repetition
    const recentCategories = await this.prisma.userQuest.findMany({
      where: {
        userId,
        completedAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { quest: { select: { category: true } } },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    const recentCats = recentCategories.map((r) => r.quest.category);

    // Select a quest avoiding recently completed categories
    const availableQuests = await this.prisma.quest.findMany({
      where: {
        isActive: true,
        type: { in: ['regular', 'daily'] },
        category: recentCats.length > 0 ? { notIn: recentCats as any[] } : undefined,
        userQuests: { none: { userId } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (availableQuests.length === 0) {
      // Fallback: any quest not yet done
      const fallback = await this.prisma.quest.findFirst({
        where: {
          isActive: true,
          type: { in: ['regular', 'daily'] },
          userQuests: { none: { userId } },
        },
      });

      if (!fallback) {
        // Absolute fallback: pick any active quest
        const any = await this.prisma.quest.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        if (any) return { ...any, isToday: true, isNew: true };
        throw new NotFoundException('No quests available');
      }

      return { ...fallback, isToday: true, isNew: true };
    }

    // Pick the best match (most different from recent)
    const selected = availableQuests[0];
    console.log(`[QuestsService] GetDailyQuest: Selected "${selected.title}" (${selected.category})`);
    return { ...selected, isToday: true, isNew: true };
  }

  // ─── SURPRISE ME ──────────────────────────────────
  async getSurpriseQuest(userId: string) {
    console.log(`[QuestsService] GetSurpriseQuest: userId=${userId}`);

    // Get recently completed quest IDs to avoid repetition
    const recent = await this.prisma.userQuest.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      select: { questId: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    const recentIds = recent.map((r) => r.questId);

    // Random selection from active quests not recently done
    const candidates = await this.prisma.quest.findMany({
      where: {
        isActive: true,
        id: recentIds.length > 0 ? { notIn: recentIds } : undefined,
      },
    });

    if (candidates.length === 0) {
      // Fallback: any active quest
      const any = await this.prisma.quest.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!any) throw new NotFoundException('No quests available');
      return {
        ...any,
        categoryInfo: QUEST_CATEGORIES[any.category as keyof typeof QUEST_CATEGORIES],
        isSurprise: true,
      };
    }

    // Pick random
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];

    console.log(`[QuestsService] GetSurpriseQuest: Selected "${selected.title}" (${selected.category})`);
    return {
      ...selected,
      categoryInfo: QUEST_CATEGORIES[selected.category as keyof typeof QUEST_CATEGORIES],
      isSurprise: true,
    };
  }

  // ─── ACCEPT QUEST ─────────────────────────────────
  async acceptQuest(userId: string, questId: string) {
    console.log(`[QuestsService] AcceptQuest: userId=${userId}, questId=${questId}`);

    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');
    if (!quest.isActive) throw new BadRequestException('Quest is no longer available');

    // Check if already accepted/active
    const existing = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (existing) {
      if (existing.status === 'completed') {
        throw new ConflictException('You already completed this quest');
      }
      if (existing.status === 'accepted' || existing.status === 'in_progress') {
        throw new ConflictException('You already have this quest active');
      }
      if (existing.status === 'failed' || existing.status === 'skipped') {
        // Allow re-accepting
        const updated = await this.prisma.userQuest.update({
          where: { id: existing.id },
          data: {
            status: 'accepted',
            startedAt: null,
            completedAt: null,
          },
          include: { quest: true },
        });
        console.log(`[QuestsService] AcceptQuest: Re-accepted quest ${questId}`);
        return { userQuest: updated, quest };
      }
    }

    const userQuest = await this.prisma.userQuest.create({
      data: {
        userId,
        questId,
        status: 'accepted',
      },
      include: { quest: true },
    });

    console.log(`[QuestsService] AcceptQuest: OK — UserQuest ${userQuest.id}`);
    return { userQuest, quest };
  }

  // ─── START QUEST ──────────────────────────────────
  async startQuest(userId: string, questId: string) {
    console.log(`[QuestsService] StartQuest: userId=${userId}, questId=${questId}`);

    const userQuest = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) throw new NotFoundException('You have not accepted this quest yet');
    if (userQuest.status !== 'accepted') {
      throw new BadRequestException(`Cannot start quest in status: ${userQuest.status}`);
    }

    const updated = await this.prisma.userQuest.update({
      where: { id: userQuest.id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: { quest: true },
    });

    console.log(`[QuestsService] StartQuest: OK — Quest ${questId} now in_progress`);
    return updated;
  }

  // ─── COMPLETE QUEST ───────────────────────────────
  async completeQuest(userId: string, questId: string) {
    console.log(`[QuestsService] CompleteQuest: userId=${userId}, questId=${questId}`);

    const userQuest = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest) throw new NotFoundException('You have not accepted this quest yet');
    if (userQuest.status !== 'in_progress') {
      throw new BadRequestException(`Cannot complete quest in status: ${userQuest.status}`);
    }

    // Check if quest has expired
    if (userQuest.quest.expiresAt && new Date() > userQuest.quest.expiresAt) {
      await this.prisma.userQuest.update({
        where: { id: userQuest.id },
        data: { status: 'failed' },
      });
      throw new BadRequestException('Quest has expired');
    }

    const quest = userQuest.quest;
    const xp = quest.xpReward;
    const coins = quest.coinsReward;

    // Complete the quest
    const updated = await this.prisma.userQuest.update({
      where: { id: userQuest.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
      include: { quest: true },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'quest_completed',
        details: {
          questId,
          questTitle: quest.title,
          category: quest.category,
          difficulty: quest.difficulty,
          xpEarned: xp,
          coinsEarned: coins,
        },
      },
    });

    console.log(`[QuestsService] CompleteQuest: OK — "${quest.title}" +${xp}XP +${coins} Coins`);

    return {
      userQuest: updated,
      rewards: {
        xp,
        coins,
        questTitle: quest.title,
        category: quest.category,
      },
      message: `🎉 Quest "${quest.title}" completed! +${xp} XP, +${coins} 🪙`,
    };
  }

  // ─── SKIP QUEST ───────────────────────────────────
  async skipQuest(userId: string, questId: string) {
    console.log(`[QuestsService] SkipQuest: userId=${userId}, questId=${questId}`);

    const userQuest = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) throw new NotFoundException('Quest not found in your list');
    if (userQuest.status === 'completed') {
      throw new BadRequestException('Cannot skip a completed quest');
    }

    const updated = await this.prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { status: 'skipped' },
    });

    return { message: 'Quest skipped', userQuest: updated };
  }

  // ─── GET USER'S QUESTS ────────────────────────────
  async getUserQuests(userId: string, status?: string) {
    console.log(`[QuestsService] GetUserQuests: userId=${userId}, status=${status}`);

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const userQuests = await this.prisma.userQuest.findMany({
      where,
      include: {
        quest: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            duration: true,
            xpReward: true,
            coinsReward: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return userQuests.map((uq) => ({
      ...uq.quest,
      userQuestId: uq.id,
      status: uq.status,
      startedAt: uq.startedAt,
      completedAt: uq.completedAt,
      acceptedAt: uq.createdAt,
      categoryInfo: QUEST_CATEGORIES[uq.quest.category as keyof typeof QUEST_CATEGORIES],
    }));
  }

  // ─── GET QUEST STATS ──────────────────────────────
  async getQuestStats(userId: string) {
    console.log(`[QuestsService] GetQuestStats: userId=${userId}`);

    const stats = await this.prisma.userQuest.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    const categoryStats = await this.prisma.userQuest.groupBy({
      by: ['status'],
      where: { userId, status: 'completed' },
      _count: { status: true },
    });

    // Category breakdown
    const completedQuests = await this.prisma.userQuest.findMany({
      where: { userId, status: 'completed' },
      select: { quest: { select: { category: true, xpReward: true, coinsReward: true } } },
    });

    const categoryBreakdown: Record<string, { count: number; xp: number; coins: number }> = {};
    for (const uq of completedQuests) {
      const cat = uq.quest.category;
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, xp: 0, coins: 0 };
      }
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].xp += uq.quest.xpReward;
      categoryBreakdown[cat].coins += uq.quest.coinsReward;
    }

    const totalCompleted = stats.find((s) => s.status === 'completed')?._count.status || 0;
    const totalXp = completedQuests.reduce((sum, q) => sum + q.quest.xpReward, 0);
    const totalCoins = completedQuests.reduce((sum, q) => sum + q.quest.coinsReward, 0);

    return {
      total: stats.reduce((sum, s) => sum + s._count.status, 0),
      completed: totalCompleted,
      inProgress: stats.find((s) => s.status === 'in_progress')?._count.status || 0,
      accepted: stats.find((s) => s.status === 'accepted')?._count.status || 0,
      skipped: stats.find((s) => s.status === 'skipped')?._count.status || 0,
      failed: stats.find((s) => s.status === 'failed')?._count.status || 0,
      totalXpEarned: totalXp,
      totalCoinsEarned: totalCoins,
      categoryBreakdown,
    };
  }

  // ─── CATEGORIES INFO ──────────────────────────────
  getCategories() {
    return Object.entries(QUEST_CATEGORIES).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  }

  // ─── PRIVATE: Calculate Rewards ───────────────────
  private calculateXP(category: string, difficulty: string, duration: number): number {
    const base = XP_BY_DIFFICULTY[difficulty] || 25;
    const durationBonus = Math.floor(duration / 10) * 2;
    return base + durationBonus;
  }

  private calculateCoins(category: string, difficulty: string): number {
    return COINS_BY_DIFFICULTY[difficulty] || 15;
  }
}
