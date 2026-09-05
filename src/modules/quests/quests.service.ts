import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { AchievementsService } from '../achievements/achievements.service';
import { StreaksService } from '../streaks/streaks.service';
import { RankingNotificationService } from '../rankings/ranking-notification.service';
import { CollectionService } from '../collection/collection.service';
import { CreateQuestDto, QuestCategoryDto, QuestDifficultyDto } from './dto/create-quest.dto';
import { ProposeQuestDto } from './dto/propose-quest.dto';
import { QuestFiltersDto } from './dto/quest-filters.dto';
import { Quest, QuestCategory, QuestDifficulty, UserQuestStatus } from '../../generated/prisma/client';

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

// ─── STREAK MULTIPLIER ──────────────────────────────
// Daily rewards +10% XP per streak day, max +50%
function getStreakMultiplier(streakDays: number): number {
  const bonus = Math.min(streakDays * 0.10, 0.50);
  return 1 + bonus;
}

// ─── LEVEL REQUIREMENTS ─────────────────────────────
const MIN_LEVEL_BY_CATEGORY: Record<string, number> = {
  nature: 1,
  creativity: 1,
  kindness: 1,
  learning: 2,
  movement: 1,
  social: 3,
  photography: 2,
  relaxation: 1,
  adventure: 4,
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
  minLevel?: number;
  totalSteps?: number;
  weeklyReset?: boolean;
}

const SEED_QUESTS: SeedQuest[] = [
  // 🌿 Naturaleza (regular)
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
  { title: 'Curiosidad', description: 'Aprende algo nuevo hoy que no sabías. Puede ser un dato, una palabra, un concepto.', category: 'learning', difficulty: 'easy', duration: 10, type: 'regular', minLevel: 2 },
  { title: 'Mini Curso', description: 'Dedica 20 minutos a aprender algo nuevo: un idioma, una habilidad, un tema que te interese.', category: 'learning', difficulty: 'hard', duration: 30, type: 'regular', minLevel: 2 },

  // 🏃 Movimiento
  { title: 'Pasos Primeros', description: 'Da un paseo de al menos 10 minutos. Sin prisas, solo camina y observa.', category: 'movement', difficulty: 'easy', duration: 15, type: 'regular' },
  { title: 'Energía Activa', description: 'Haz 15 minutos de ejercicio: caminar rápido, saltar, estirar, bailar. Lo que prefieras.', category: 'movement', difficulty: 'normal', duration: 20, type: 'regular' },
  { title: 'Reto del Movimiento', description: 'Completa una actividad física de al menos 30 minutos. Correr, nadar, bicicleta, lo que sea.', category: 'movement', difficulty: 'hard', duration: 35, type: 'regular' },

  // 👥 Social
  { title: 'Conversación Real', description: 'Ten una conversación cara a cara con alguien por al menos 10 minutos.', category: 'social', difficulty: 'easy', duration: 15, type: 'regular', minLevel: 3 },
  { title: 'Reconexión', description: 'Contacta con alguien con quien hace tiempo que no hablas.', category: 'social', difficulty: 'normal', duration: 10, type: 'regular', minLevel: 3 },

  // 📸 Fotografía
  { title: 'Captura el Momento', description: 'Toma una foto de algo que te llame la atención hoy. Comparte lo que viste.', category: 'photography', difficulty: 'easy', duration: 10, type: 'regular', minLevel: 2 },
  { title: 'Fotografía Macro', description: 'Acércate mucho a un objeto y tómale una foto. Descubre detalles que no se ven a simple vista.', category: 'photography', difficulty: 'normal', duration: 15, type: 'regular', minLevel: 2 },

  // 🌙 Tranquilidad
  { title: 'Pausa Consciente', description: 'Siéntate en un lugar tranquilo y respira profundamente durante 5 minutos. Solo enfócate en respirar.', category: 'relaxation', difficulty: 'easy', duration: 10, type: 'regular' },
  { title: 'Desconexión', description: 'Pasa 20 minutos sin pantalla. Lee, medita, mira por la ventana, o simplemente descansa.', category: 'relaxation', difficulty: 'normal', duration: 25, type: 'regular' },

  // 🗺️ Aventura
  { title: 'Explorador', description: 'Ve a un lugar donde no has estado antes. Puede ser una calle nueva, una tienda, un parque.', category: 'adventure', difficulty: 'easy', duration: 20, type: 'regular', minLevel: 4 },
  { title: 'Ruta Nueva', description: 'Toma un camino diferente al habitual para llegar a algún lugar que visitas frecuentemente.', category: 'adventure', difficulty: 'normal', duration: 25, type: 'regular', minLevel: 4 },
  { title: 'Descubrimiento', description: 'Explora un barrio o zona que no conoces. Observa, fotografía, disfruta del descubrimiento.', category: 'adventure', difficulty: 'hard', duration: 45, type: 'regular', minLevel: 4 },

  // 🌟 SEMANALES (se resetean cada lunes)
  { title: 'Reto Semanal Creativo', description: 'Esta semana, crea algo nuevo cada día durante 5 minutos. Dibuja, escribe, compone, diseña.', category: 'creativity', difficulty: 'hard', duration: 60, type: 'weekly', weeklyReset: true, xpReward: 100, coinsReward: 50 },
  { title: 'Explorador Semanal', description: 'Visita 3 lugares nuevos esta semana. Documenta cada uno con una foto.', category: 'adventure', difficulty: 'hard', duration: 90, type: 'weekly', weeklyReset: true, minLevel: 4, xpReward: 120, coinsReward: 60 },
  { title: 'Semana de Bondad', description: 'Realiza un acto de bondad cada día de esta semana. Anota cómo te sentiste.', category: 'kindness', difficulty: 'normal', duration: 45, type: 'weekly', weeklyReset: true, totalSteps: 7, xpReward: 80, coinsReward: 40 },
  { title: 'Semana Activa', description: 'Haz ejercicio al menos 15 minutos cada día esta semana. Cualquier actividad cuenta.', category: 'movement', difficulty: 'hard', duration: 60, type: 'weekly', weeklyReset: true, totalSteps: 7, xpReward: 90, coinsReward: 45 },
];

@Injectable()
export class QuestsService {
  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
    private progression: ProgressionService,
    private achievements: AchievementsService,
    private rankingNotifications: RankingNotificationService,
    private collection: CollectionService,
  ) {}

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
          minLevel: quest.minLevel || MIN_LEVEL_BY_CATEGORY[quest.category] || 1,
          totalSteps: quest.totalSteps || null,
          weeklyReset: quest.weeklyReset || false,
        },
      });
      created++;
    }

    console.log(`[QuestsService] SeedQuests: OK — ${created} quests upserted`);
    return { message: `${created} quests seeded successfully`, count: created };
  }

  // ─── GET ALL QUESTS (with level filter) ───────────
  async getAllQuests(filters?: QuestFiltersDto, userLevel?: number) {
    console.log(`[QuestsService] GetAllQuests:`, filters, `userLevel=${userLevel}`);

    const where: any = { isActive: true };

    // Level filtering: only show quests at or below user level
    if (userLevel && userLevel > 0) {
      where.minLevel = { lte: userLevel };
    }

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
        minLevel: true,
        totalSteps: true,
        weeklyReset: true,
        expiresAt: true,
      },
    });

    return quests.map((q) => ({
      ...q,
      categoryInfo: QUEST_CATEGORIES[q.category as keyof typeof QUEST_CATEGORIES],
      locked: userLevel ? q.minLevel > userLevel : false,
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
        minLevel: true,
        totalSteps: true,
        weeklyReset: true,
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
        minLevel: MIN_LEVEL_BY_CATEGORY[dto.category] || 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    console.log(`[QuestsService] CreateQuest: OK — ${quest.id} (${quest.category}, ${quest.difficulty})`);
    return quest;
  }

  // ─── PROPOSE QUEST (Boti/IA) ──────────────────────
  async proposeQuest(userId: string, dto: ProposeQuestDto) {
    console.log(`[QuestsService] ProposeQuest: Boti proposing "${dto.title}" for ${userId}`);

    // Validate category exists
    if (!QUEST_CATEGORIES[dto.category as keyof typeof QUEST_CATEGORIES]) {
      throw new BadRequestException(`Invalid category: ${dto.category}`);
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'normal', 'hard', 'special'];
    const difficulty = dto.difficulty || 'normal';
    if (!validDifficulties.includes(difficulty)) {
      throw new BadRequestException(`Invalid difficulty: ${difficulty}`);
    }

    // Validate duration reasonableness
    if (dto.duration < 1 || dto.duration > 480) {
      throw new BadRequestException('Duration must be between 1 and 480 minutes');
    }

    // Validate steps if multi-step
    if (dto.steps && dto.steps.length > 0) {
      if (dto.steps.length > 10) {
        throw new BadRequestException('Maximum 10 steps per quest');
      }
      for (const step of dto.steps) {
        if (!step.title || !step.description || !step.type) {
          throw new BadRequestException('Each step must have title, description, and type');
        }
      }
    }

    // Check for similar recent AI-generated quests (avoid spam)
    const recentAI = await this.prisma.quest.findFirst({
      where: {
        isAIGenerated: true,
        title: { contains: dto.title, mode: 'insensitive' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentAI) {
      throw new ConflictException('A similar AI quest was already proposed today');
    }

    // Calculate rewards (backend decides, not AI)
    const xp = dto.steps && dto.steps.length > 0
      ? XP_BY_DIFFICULTY[difficulty] + dto.steps.length * 10
      : XP_BY_DIFFICULTY[difficulty];
    const coins = COINS_BY_DIFFICULTY[difficulty];

    const quest = await this.prisma.quest.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category as QuestCategory,
        difficulty: difficulty as QuestDifficulty,
        duration: dto.duration,
        xpReward: xp,
        coinsReward: coins,
        type: 'ai_generated',
        isAIGenerated: true,
        minLevel: MIN_LEVEL_BY_CATEGORY[dto.category] || 1,
        totalSteps: dto.steps ? dto.steps.length : null,
        requirements: (dto.reasoning || dto.steps ? { ...(dto.reasoning ? { reasoning: dto.reasoning } : {}), ...(dto.steps ? { steps: dto.steps } : {}) } : undefined) as any,
      },
    });

    console.log(`[QuestsService] ProposeQuest: OK — AI quest "${quest.title}" created (backend assigned: +${xp}XP, +${coins} Coins)`);

    return {
      quest,
      backendRewards: { xp, coins },
      message: `🤖 Boti propuso "${quest.title}". Recompensas asignadas por el backend.`,
      reasoning: dto.reasoning || null,
    };
  }

  // ─── WEEKLY QUESTS ────────────────────────────────
  async getWeeklyQuests(userId: string) {
    console.log(`[QuestsService] GetWeeklyQuests: userId=${userId}`);

    // Get Monday of current week (UTC)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const monday = new Date(now);
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7));

    // Get user's weekly quests for this week
    const userWeeklyQuests = await this.prisma.userQuest.findMany({
      where: {
        userId,
        quest: { type: 'weekly', weeklyReset: true },
        createdAt: { gte: monday },
      },
      include: { quest: true },
    });

    // Get all weekly quests
    const allWeeklyQuests = await this.prisma.quest.findMany({
      where: { type: 'weekly', weeklyReset: true, isActive: true },
      orderBy: { category: 'asc' },
    });

    // Map user progress onto weekly quests
    return allWeeklyQuests.map((q) => {
      const userQ = userWeeklyQuests.find((uq) => uq.questId === q.id);
      return {
        ...q,
        categoryInfo: QUEST_CATEGORIES[q.category as keyof typeof QUEST_CATEGORIES],
        userQuestId: userQ?.id || null,
        status: userQ?.status || 'available',
        progress: userQ?.progress || null,
        startedAt: userQ?.startedAt || null,
        completedAt: userQ?.completedAt || null,
        weekStart: monday.toISOString(),
      };
    });
  }

  // ─── DAILY QUEST ──────────────────────────────────
  async getDailyQuest(userId: string, userLevel?: number) {
    console.log(`[QuestsService] GetDailyQuest: userId=${userId}, level=${userLevel}`);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Check if user already has a daily quest for today
    const existingDaily = await this.prisma.userQuest.findFirst({
      where: {
        userId,
        quest: { type: 'daily', isActive: true },
        createdAt: { gte: today, lt: tomorrow },
      },
      include: { quest: true },
    });

    if (existingDaily) {
      return {
        ...existingDaily.quest,
        userQuestId: existingDaily.id,
        status: existingDaily.status,
        progress: existingDaily.progress,
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

    // Build where clause with level filtering
    const questWhere: any = {
      isActive: true,
      type: { in: ['regular', 'daily'] },
      userQuests: { none: { userId } },
    };

    if (recentCats.length > 0) {
      questWhere.category = { notIn: recentCats as any[] };
    }

    if (userLevel && userLevel > 0) {
      questWhere.minLevel = { lte: userLevel };
    }

    const availableQuests = await this.prisma.quest.findMany({
      where: questWhere,
      orderBy: { createdAt: 'desc' },
    });

    if (availableQuests.length === 0) {
      // Fallback: any quest at user level
      const fallbackWhere: any = {
        isActive: true,
        type: { in: ['regular', 'daily'] },
        userQuests: { none: { userId } },
      };
      if (userLevel && userLevel > 0) {
        fallbackWhere.minLevel = { lte: userLevel };
      }

      const fallback = await this.prisma.quest.findFirst({ where: fallbackWhere });
      if (!fallback) {
        const any = await this.prisma.quest.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
        if (any) return { ...any, isToday: true, isNew: true };
        throw new NotFoundException('No quests available');
      }
      return { ...fallback, isToday: true, isNew: true };
    }

    const selected = availableQuests[0];
    console.log(`[QuestsService] GetDailyQuest: Selected "${selected.title}" (${selected.category})`);
    return { ...selected, isToday: true, isNew: true };
  }

  // ─── SURPRISE ME ──────────────────────────────────
  async getSurpriseQuest(userId: string, userLevel?: number) {
    console.log(`[QuestsService] GetSurpriseQuest: userId=${userId}`);

    const recent = await this.prisma.userQuest.findMany({
      where: { userId, completedAt: { not: null } },
      select: { questId: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    const recentIds = recent.map((r) => r.questId);

    const where: any = {
      isActive: true,
      id: recentIds.length > 0 ? { notIn: recentIds } : undefined,
    };

    if (userLevel && userLevel > 0) {
      where.minLevel = { lte: userLevel };
    }

    const candidates = await this.prisma.quest.findMany({ where });

    if (candidates.length === 0) {
      const any = await this.prisma.quest.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
      if (!any) throw new NotFoundException('No quests available');
      return { ...any, categoryInfo: QUEST_CATEGORIES[any.category as keyof typeof QUEST_CATEGORIES], isSurprise: true };
    }

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
  async acceptQuest(userId: string, questId: string, userLevel?: number) {
    console.log(`[QuestsService] AcceptQuest: userId=${userId}, questId=${questId}`);

    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');
    if (!quest.isActive) throw new BadRequestException('Quest is no longer available');

    // Check level requirement
    if (userLevel && userLevel < quest.minLevel) {
      throw new BadRequestException(`You need level ${quest.minLevel} to access this quest. Your level: ${userLevel}`);
    }

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
        const updated = await this.prisma.userQuest.update({
          where: { id: existing.id },
          data: { status: 'accepted', startedAt: null, completedAt: null, progress: undefined },
          include: { quest: true },
        });
        console.log(`[QuestsService] AcceptQuest: Re-accepted quest ${questId}`);
        return { userQuest: updated, quest };
      }
    }

    // Initialize progress for multi-step quests
    const initialProgress = quest.totalSteps
      ? { currentStep: 0, totalSteps: quest.totalSteps, steps: [] }
      : undefined;

    const userQuest = await this.prisma.userQuest.create({
      data: {
        userId,
        questId,
        status: 'accepted',
        progress: initialProgress as any,
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
      data: { status: 'in_progress', startedAt: new Date() },
      include: { quest: true },
    });

    console.log(`[QuestsService] StartQuest: OK — Quest ${questId} now in_progress`);
    return updated;
  }

  // ─── UPDATE PROGRESS (multi-step) ─────────────────
  async updateProgress(userId: string, questId: string, stepData: { stepIndex: number; completed: boolean; evidence?: string }) {
    console.log(`[QuestsService] UpdateProgress: userId=${userId}, questId=${questId}, step=${stepData.stepIndex}`);

    const userQuest = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest) throw new NotFoundException('Quest not found in your list');
    if (userQuest.status !== 'in_progress') {
      throw new BadRequestException(`Quest is not in progress (status: ${userQuest.status})`);
    }

    if (!userQuest.quest.totalSteps) {
      throw new BadRequestException('This quest does not have multiple steps');
    }

    const progress = (userQuest.progress as any) || { currentStep: 0, totalSteps: userQuest.quest.totalSteps, steps: [] };

    if (stepData.stepIndex < 0 || stepData.stepIndex >= progress.totalSteps) {
      throw new BadRequestException(`Invalid step index: ${stepData.stepIndex}. Must be 0-${progress.totalSteps - 1}`);
    }

    // Update the step
    progress.steps[stepData.stepIndex] = {
      completed: stepData.completed,
      evidence: stepData.evidence || null,
      completedAt: stepData.completed ? new Date().toISOString() : null,
    };

    // Recalculate current step
    progress.currentStep = progress.steps.filter((s: any) => s?.completed).length;

    const updated = await this.prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { progress },
      include: { quest: true },
    });

    const allComplete = progress.currentStep >= progress.totalSteps;
    console.log(`[QuestsService] UpdateProgress: Step ${stepData.stepIndex} ${stepData.completed ? '✅' : '⏳'} (${progress.currentStep}/${progress.totalSteps})`);

    return {
      userQuest: updated,
              progress: (progress.currentStep >= progress.totalSteps ? { ...progress, allComplete: true } : progress) as any,
      allStepsComplete: allComplete,
      message: allComplete
        ? `🎉 All ${progress.totalSteps} steps completed! You can now complete the quest.`
        : `Step ${stepData.stepIndex + 1}/${progress.totalSteps} ${stepData.completed ? 'completed' : 'updated'}`,
    };
  }

  // ─── COMPLETE QUEST (with streak multiplier) ──────
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
      await this.prisma.userQuest.update({ where: { id: userQuest.id }, data: { status: 'failed' } });
      throw new BadRequestException('Quest has expired');
    }

    // Check multi-step completion
    const progress = userQuest.progress as any;
    if (userQuest.quest.totalSteps && progress) {
      if (progress.currentStep < progress.totalSteps) {
        throw new BadRequestException(`Quest has ${progress.totalSteps} steps. Complete all ${progress.totalSteps} steps before finishing. (${progress.currentStep}/${progress.totalSteps} done)`);
      }
    }

    // ─── STREAK MULTIPLIER ──────────────────────────
    let streakDays = 0;
    let streakMultiplier = 1.0;

    // Get user's activity for streak calculation
    const recentActivity = await this.prisma.activityLog.findMany({
      where: {
        userId,
        action: 'quest_completed',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate consecutive days with activity
    const activityDays = new Set<string>();
    for (const log of recentActivity) {
      const day = log.createdAt.toISOString().split('T')[0];
      activityDays.add(day);
    }

    const sortedDays = Array.from(activityDays).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Start counting from today or yesterday
    let checkDate = today;
    if (sortedDays.length === 0 || (sortedDays[0] !== today && sortedDays[0] !== yesterday)) {
      streakDays = 0;
    } else {
      streakDays = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
        if (diffDays === 1) {
          streakDays++;
        } else {
          break;
        }
      }
    }

    streakMultiplier = getStreakMultiplier(streakDays);

    // Calculate final rewards with multiplier
    const quest = userQuest.quest;
    const baseXp = quest.xpReward;
    const baseCoins = quest.coinsReward;
    const finalXp = Math.round(baseXp * streakMultiplier);
    const finalCoins = Math.round(baseCoins * streakMultiplier);

    // Complete the quest
    const updated = await this.prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { status: 'completed', completedAt: new Date() },
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
          type: quest.type,
          baseXp,
          baseCoins,
          streakDays,
          streakMultiplier,
          finalXp,
          finalCoins,
        },
      },
    });

    // Record streak activity (uses protection if streak broken)
    const streakResult = await this.streaksService.recordActivity(userId, 'quest_completed');

    const streakMessage = streakResult.action === 'protected'
      ? ` 🛡️ ¡Protección usada! Racha de ${streakResult.streak} días`
      : streakDays > 0
        ? ` 🔥 ${streakResult.streak} day streak! +${Math.round((streakMultiplier - 1) * 100)}% bonus!`
        : streakResult.action === 'broken'
          ? ` 🌱 Racha anterior: ${streakDays} días. Tu aventura continúa`
          : '';

    // ─── CREDIT XP + COINS TO USER ────────────────
    const progressionResult = await this.progression.addXp(userId, finalXp, 'quest_completed', {
      questId,
      questTitle: quest.title,
      category: quest.category,
      difficulty: quest.difficulty,
      streakDays,
      streakMultiplier,
    });

    await this.progression.addCoins(userId, finalCoins, `quest_${quest.id}`);

    // ─── CHECK FOR NEW BADGES ──────────────────────
    const badgeResult = await this.achievements.checkBadges(userId);

    console.log(`[QuestsService] CompleteQuest: OK — "${quest.title}" +${finalXp}XP +${finalCoins} Coins (streak: ${streakDays}d, x${streakMultiplier}, level: ${progressionResult.level})`);

    const result: any = {
      userQuest: updated,
      rewards: {
        baseXp,
        baseCoins,
        finalXp,
        finalCoins,
        streakDays: streakResult.streak,
        streakMultiplier,
        streakAction: streakResult.action,
        questTitle: quest.title,
        category: quest.category,
      },
      streak: {
        current: streakResult.streak,
        longest: streakResult.longestStreak,
        action: streakResult.action,
        milestone: streakResult.milestone,
      },
      progression: {
        xpGained: progressionResult.xpGained,
        totalXp: progressionResult.totalXp,
        level: progressionResult.level,
        leveledUp: progressionResult.leveledUp,
        levelReward: progressionResult.levelReward,
      },
      newBadges: badgeResult.newBadges.length > 0 ? badgeResult.newBadges : undefined,
      message: `🎉 Quest "${quest.title}" completed! +${finalXp} XP, +${finalCoins} 🪙${progressionResult.leveledUp ? ` 🎉 ¡Level ${progressionResult.level}!` : ''}${badgeResult.newBadges.length > 0 ? ` 🏆 ${badgeResult.newBadges.map((b: any) => b.icon + ' ' + b.name).join(', ')}` : ''}${streakMessage}`,
    };

    // ─── RANKING NOTIFICATIONS (async, non-blocking) ──
    try {
      const rankNotifs = await this.rankingNotifications.checkAfterQuestCompletion(userId, questId);
      if (rankNotifs.notifications.length > 0) {
        console.log(`[QuestsService] Ranking notifications: ${rankNotifs.notifications.length} for userId=${userId}`);
        result.rankingNotifications = rankNotifs.notifications;
      }
    } catch (error) {
      console.error(`[QuestsService] Ranking notification error: ${error.message}`);
    }

    // ─── COLLECTION UNLOCKS (async, non-blocking) ──
    try {
      const collectResult = await this.collection.checkAndUnlock(userId, 'quest');
      if (collectResult.newUnlocks.length > 0) {
        console.log(`[QuestsService] Collectibles unlocked: ${collectResult.newUnlocks.length} for userId=${userId}`);
        result.newCollectibles = collectResult.newUnlocks;
        result.message += ` 🎒 ${collectResult.newUnlocks.map((c: any) => c.name).join(', ')}`;
      }
    } catch (error) {
      console.error(`[QuestsService] Collection unlock error: ${error.message}`);
    }

    return result;
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
    if (status) where.status = status;

    const userQuests = await this.prisma.userQuest.findMany({
      where,
      include: {
        quest: {
          select: {
            id: true, title: true, description: true, category: true,
            difficulty: true, duration: true, xpReward: true, coinsReward: true,
            type: true, totalSteps: true, weeklyReset: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return userQuests.map((uq) => ({
      ...uq.quest,
      userQuestId: uq.id,
      status: uq.status,
      progress: uq.progress,
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

    const completedQuests = await this.prisma.userQuest.findMany({
      where: { userId, status: 'completed' },
      select: { quest: { select: { category: true, xpReward: true, coinsReward: true, type: true } } },
    });

    const categoryBreakdown: Record<string, { count: number; xp: number; coins: number }> = {};
    for (const uq of completedQuests) {
      const cat = uq.quest.category;
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, xp: 0, coins: 0 };
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].xp += uq.quest.xpReward;
      categoryBreakdown[cat].coins += uq.quest.coinsReward;
    }

    const totalCompleted = stats.find((s) => s.status === 'completed')?._count.status || 0;
    const totalXp = completedQuests.reduce((sum, q) => sum + q.quest.xpReward, 0);
    const totalCoins = completedQuests.reduce((sum, q) => sum + q.quest.coinsReward, 0);
    const weeklyCompleted = completedQuests.filter((q) => q.quest.type === 'weekly').length;
    const aiCompleted = completedQuests.filter((q) => q.quest.type === 'ai_generated').length;

    return {
      total: stats.reduce((sum, s) => sum + s._count.status, 0),
      completed: totalCompleted,
      inProgress: stats.find((s) => s.status === 'in_progress')?._count.status || 0,
      accepted: stats.find((s) => s.status === 'accepted')?._count.status || 0,
      skipped: stats.find((s) => s.status === 'skipped')?._count.status || 0,
      failed: stats.find((s) => s.status === 'failed')?._count.status || 0,
      weeklyCompleted,
      aiCompleted,
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
      minLevel: MIN_LEVEL_BY_CATEGORY[key] || 1,
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
