import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotiMemoryService } from './boti-memory.service';
import { BotiMoodService } from './boti-mood.service';
import { UpdateBotiDto } from './dto/update-boti.dto';

// ─── EXPRESSIONS ──────────────────────────────────────
export const EXPRESSIONS = {
  calm: {
    name: 'Tranquilo',
    description: 'Estado relajado y en paz',
    default: true,
    triggers: ['idle', 'return'],
  },
  happy: {
    name: 'Feliz',
    description: 'Sonríe con alegría',
    triggers: ['quest_completed', 'level_up', 'purchase'],
  },
  curious: {
    name: 'Curioso',
    description: 'Ojos abiertos, interesado',
    triggers: ['chat_start', 'new_feature'],
  },
  surprised: {
    name: 'Sorprendido',
    description: 'Boca abierta, ojos grandes',
    triggers: ['level_up', 'rare_drop', 'achievement'],
  },
  confused: {
    name: 'Confundido',
    description: 'Tiene una duda',
    triggers: ['no_quest', 'user_indecisive'],
  },
  tired: {
    name: 'Cansado',
    description: 'Ojos semicerrados',
    triggers: ['late_night', 'long_session'],
  },
  excited: {
    name: 'Emocionado',
    description: 'Muy entusiasmado',
    triggers: ['streak_milestone', 'rare_achievement'],
  },
  celebrating: {
    name: 'Celebrando',
    description: 'Confeti y alegría',
    triggers: ['big_achievement', 'streak_7', 'level_milestone'],
  },
  worried: {
    name: 'Preocupado',
    description: 'Ceño fruncido',
    triggers: ['user_inactive', 'streak_about_to_break'],
  },
} as const;

// ─── GREETINGS ────────────────────────────────────────
const GREETINGS = {
  first_meet: [
    '¡Hola! 👋 Soy BOTI, tu nuevo compañero.',
    '¿Qué hacemos hoy? 🤖',
  ],
  welcome_back: [
    '¡Volviste! 👀',
    'Te estuve esperando 🤖',
    '¡Hola de nuevo! ¿Qué hacemos?',
  ],
  welcome_back_long: [
    '¡Volviste! Han pasado {days} días.',
    'Te extrañé 👀 ¿Todo bien?',
  ],
  daily问候: [
    '¡Buenos días! ☀️ ¿Qué hacemos hoy?',
    '¡Hola! ¿Listo para algo nuevo?',
  ],
  late_night: [
    '¿Despierto a esta hora? 🌙',
    'No te acuestes muy tarde 🤖',
  ],
  idle: [
    '¿Hay algo que quieras hacer?',
    'Puedo sugerirte algo si quieres.',
    '¿Qué tal una misión?',
  ],
  mission_suggested: [
    'Tengo una idea para ti 🎯',
    '¿Qué opinas de esta?',
  ],
  mission_completed: [
    '¡Lo hiciste genial! 🎉',
    '¡Eso salió mejor de lo esperado!',
    '¡Sigue así! 💪',
  ],
  level_up: [
    '¡SUBIMOS DE NIVEL! 🎉',
    '¡Nivel nuevo! Eres increíble.',
  ],
  mission_rejected: [
    'Está bien. Tengo otra idea.',
    'No hay problema, hay muchas más.',
  ],
  streak_milestone: [
    '¡{days} días de racha! 🔥',
    '¡Imparable! Llevas {days} días.',
  ],
  with_memory: [
    'Recuerdo que {memory}',
    'La última vez {memory}',
    'No olvido que {memory}',
  ],
};

@Injectable()
export class BotiService {
  constructor(
    private prisma: PrismaService,
    private memoryService: BotiMemoryService,
    private moodService: BotiMoodService,
  ) {}

  // ─── GET BOTI ─────────────────────────────────────
  async getBoti(userId: string) {
    console.log(`[BotiService] GetBoti: userId=${userId}`);

    let boti = await this.prisma.botiCharacter.findUnique({
      where: { userId },
    });

    // Auto-create BOTI if not exists
    if (!boti) {
      console.log(`[BotiService] GetBoti: Creating default BOTI for ${userId}`);
      boti = await this.prisma.botiCharacter.create({
        data: {
          userId,
          personality: {
            playfulness: 0.7,
            curiosity: 0.8,
            energy: 0.6,
          },
        },
      });
    }

    // Calculate dynamic mood
    const moodResult = await this.moodService.calculateMood(userId);

    // Update mood if different
    if (moodResult.mood !== boti.mood) {
      await this.prisma.botiCharacter.update({
        where: { userId },
        data: { mood: moodResult.mood },
      });
      boti.mood = moodResult.mood;
    }

    // Determine contextual expression
    const expression = await this.getContextualExpression(userId, boti);

    // Get memory reference
    const memoryRef = await this.memoryService.generateMemoryReference(userId);

    return {
      ...boti,
      expression,
      greeting: this.getGreeting(boti),
      memoryReference: memoryRef,
      moodInfo: this.moodService.getMoodDescription(moodResult.mood),
      expressions: Object.keys(EXPRESSIONS),
    };
  }

  // ─── UPDATE BOTI ──────────────────────────────────
  async updateBoti(userId: string, dto: UpdateBotiDto) {
    console.log(`[BotiService] UpdateBoti: userId=${userId}`, dto);

    // Ensure BOTI exists
    await this.getBoti(userId);

    const boti = await this.prisma.botiCharacter.update({
      where: { userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bodyType !== undefined && { bodyType: dto.bodyType }),
        ...(dto.bodyColor !== undefined && { bodyColor: dto.bodyColor }),
        ...(dto.eyeStyle !== undefined && { eyeStyle: dto.eyeStyle }),
        ...(dto.mouthStyle !== undefined && { mouthStyle: dto.mouthStyle }),
        ...(dto.personality !== undefined && { personality: dto.personality }),
      },
    });

    console.log(`[BotiService] UpdateBoti: OK - name=${boti.name}`);
    return boti;
  }

  // ─── SET EXPRESSION ───────────────────────────────
  async setExpression(userId: string, expression: string) {
    console.log(`[BotiService] SetExpression: ${expression} for ${userId}`);

    if (!EXPRESSIONS[expression as keyof typeof EXPRESSIONS]) {
      throw new BadRequestException(
        `Invalid expression. Valid: ${Object.keys(EXPRESSIONS).join(', ')}`,
      );
    }

    const boti = await this.prisma.botiCharacter.update({
      where: { userId },
      data: { expression },
    });

    console.log(`[BotiService] SetExpression: OK`);
    return {
      expression: boti.expression,
      expressionName: EXPRESSIONS[expression as keyof typeof EXPRESSIONS].name,
    };
  }

  // ─── SET MOOD ─────────────────────────────────────
  async setMood(userId: string, mood: string) {
    console.log(`[BotiService] SetMood: ${mood} for ${userId}`);

    const validMoods = ['neutral', 'good', 'great', 'bad', 'awful'];
    if (!validMoods.includes(mood)) {
      throw new BadRequestException(
        `Invalid mood. Valid: ${validMoods.join(', ')}`,
      );
    }

    await this.prisma.botiCharacter.update({
      where: { userId },
      data: { mood },
    });

    console.log(`[BotiService] SetMood: OK`);
    return { mood };
  }

  // ─── INTERACT ─────────────────────────────────────
  async interact(userId: string, context?: string) {
    console.log(`[BotiService] Interact: userId=${userId}, context=${context}`);

    const boti = await this.getBoti(userId);

    // Update interaction count and last interacted
    await this.prisma.botiCharacter.update({
      where: { userId },
      data: {
        totalInteractions: { increment: 1 },
        lastInteractedAt: new Date(),
      },
    });

    // Save interaction to memory
    await this.memoryService.saveMemory(
      userId,
      'event',
      'last_interaction',
      {
        context,
        timestamp: new Date().toISOString(),
      },
      3,
    );

    // Generate response based on context and personality
    const response = this.generateResponse(boti, context);

    // Get memory reference for response
    const memoryRef = await this.memoryService.generateMemoryReference(userId);

    // Set appropriate expression
    const expression = this.getContextualExpressionForContext(context);
    if (expression) {
      await this.setExpression(userId, expression);
    }

    return {
      name: boti.name,
      expression: expression || boti.expression,
      message: response.message,
      memoryReference: memoryRef,
      action: response.action,
      mood: boti.mood,
    };
  }

  // ─── SAVE PREFERENCE ──────────────────────────────
  async savePreference(userId: string, key: string, value: any) {
    console.log(`[BotiService] SavePreference: ${key}=${value} for ${userId}`);

    await this.memoryService.saveMemory(
      userId,
      'preference',
      key,
      value,
      7, // High importance
    );

    return { message: 'Preference saved' };
  }

  // ─── GET MEMORIES ─────────────────────────────────
  async getMemories(userId: string) {
    console.log(`[BotiService] GetMemories: userId=${userId}`);

    return this.memoryService.getContextualMemories(userId);
  }

  // ─── GET MOOD ─────────────────────────────────────
  async getMood(userId: string) {
    console.log(`[BotiService] GetMood: userId=${userId}`);

    const result = await this.moodService.calculateMood(userId);

    // Update mood in DB
    await this.prisma.botiCharacter.update({
      where: { userId },
      data: { mood: result.mood },
    });

    return {
      mood: result.mood,
      score: result.score,
      factors: result.factors,
      info: this.moodService.getMoodDescription(result.mood),
    };
  }

  // ─── GET EXPRESSIONS ──────────────────────────────
  async getExpressions() {
    return Object.entries(EXPRESSIONS).map(([key, value]) => ({
      code: key,
      name: value.name,
      description: value.description,
      isDefault: (value as any).default || false,
    }));
  }

  // ─── GET BOTI STATUS ──────────────────────────────
  async getStatus(userId: string) {
    console.log(`[BotiService] GetStatus: userId=${userId}`);

    const boti = await this.getBoti(userId);

    // Calculate time since last interaction
    const now = new Date();
    const lastInteracted = boti.lastInteractedAt
      ? new Date(boti.lastInteractedAt)
      : null;

    let timeSinceLastInteraction: number | null = null;
    if (lastInteracted) {
      timeSinceLastInteraction = Math.floor(
        (now.getTime() - lastInteracted.getTime()) / (1000 * 60),
      );
    }

    const shouldWorry =
      timeSinceLastInteraction !== null && timeSinceLastInteraction > 1440;

    const hour = now.getHours();
    const isLateNight = hour >= 0 && hour < 6;

    // Get memory count
    const memories = await this.memoryService.getAllMemories(userId, 100);

    return {
      name: boti.name,
      expression: boti.expression,
      mood: boti.mood,
      bodyType: boti.bodyType,
      bodyColor: boti.bodyColor,
      eyeStyle: boti.eyeStyle,
      mouthStyle: boti.mouthStyle,
      totalInteractions: boti.totalInteractions,
      lastInteractedAt: boti.lastInteractedAt,
      timeSinceLastInteraction,
      isLateNight,
      shouldWorry,
      personality: boti.personality,
      memoryCount: memories.length,
    };
  }

  // ─── PRIVATE: Get Contextual Expression ───────────
  private async getContextualExpression(
    userId: string,
    boti: any,
  ): Promise<string> {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 0 && hour < 6) {
      return 'tired';
    }

    if (boti.lastInteractedAt) {
      const diff =
        now.getTime() - new Date(boti.lastInteractedAt).getTime();
      const hoursSince = diff / (1000 * 60 * 60);

      if (hoursSince > 48) {
        return 'worried';
      }
    }

    return boti.expression || 'calm';
  }

  private getContextualExpressionForContext(
    context?: string,
  ): string | null {
    if (!context) return null;

    const contextMap: Record<string, string> = {
      quest_completed: 'happy',
      level_up: 'surprised',
      achievement: 'excited',
      chat_start: 'curious',
      mission_suggested: 'curious',
      mission_rejected: 'confused',
      late_night: 'tired',
      idle: 'calm',
      streak_milestone: 'celebrating',
      return: 'happy',
    };

    return contextMap[context] || null;
  }

  // ─── PRIVATE: Get Greeting ────────────────────────
  private getGreeting(boti: any): string {
    const now = new Date();
    const hour = now.getHours();
    const lastInteracted = boti.lastInteractedAt
      ? new Date(boti.lastInteractedAt)
      : null;

    if (!lastInteracted) {
      return this.randomFrom(GREETINGS.first_meet);
    }

    if (hour >= 0 && hour < 6) {
      return this.randomFrom(GREETINGS.late_night);
    }

    const daysSince = Math.floor(
      (now.getTime() - lastInteracted.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince > 3) {
      return this.randomFrom(GREETINGS.welcome_back_long).replace(
        '{days}',
        String(daysSince),
      );
    }

    if (daysSince >= 1) {
      return this.randomFrom(GREETINGS.welcome_back);
    }

    if (hour >= 6 && hour < 12) {
      return this.randomFrom(GREETINGS.daily问候);
    }

    return this.randomFrom(GREETINGS.idle);
  }

  // ─── PRIVATE: Generate Response ───────────────────
  private generateResponse(
    boti: any,
    context?: string,
  ): { message: string; action: string } {
    const responses: Record<
      string,
      { messages: string[]; action: string }
    > = {
      quest_completed: {
        messages: GREETINGS.mission_completed,
        action: 'celebrate',
      },
      level_up: {
        messages: GREETINGS.level_up,
        action: 'celebrate',
      },
      mission_rejected: {
        messages: GREETINGS.mission_rejected,
        action: 'suggest_new',
      },
      idle: {
        messages: GREETINGS.idle,
        action: 'suggest',
      },
      chat_start: {
        messages: [
          '¿Qué onda? 🤖',
          '¡Hola! ¿Qué hacemos?',
          '¿En qué te ayudo?',
        ],
        action: 'listen',
      },
    };

    const response = responses[context || 'idle'] || responses.idle;
    const message = this.randomFrom(response.messages);

    return {
      message,
      action: response.action,
    };
  }

  // ─── PRIVATE: Random Helper ───────────────────────
  private randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
