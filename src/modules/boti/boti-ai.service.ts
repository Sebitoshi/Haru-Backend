import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { BotiProfileService, UserProfile } from './boti-profile.service';

export interface BotiChatMessage {
  role: 'user' | 'boti';
  content: string;
  timestamp: Date;
}

export interface BotiConversationResult {
  message: string;
  mode: string;
  expression: string;
  mood: string;
  suggestedQuest?: any;
  profileSummary: string;
}

@Injectable()
export class BotiAI {
  private readonly logger = new Logger(BotiAI.name);
  private groq: Groq | null = null;
  private readonly chatModel = 'llama-3.3-70b-versatile';

  // Boti's personality system prompt
  private readonly BOTI_SYSTEM_PROMPT = `Eres BOTI, el compañero inteligente de Haru — una app que ayuda a las personas a vivir experiencias diarias fuera de su rutina.

PERSONALIDAD:
- Amigable, divertido, curioso, cercano
- Espontáneo, ligeramente gracioso pero no infantil
- Motivador sin ser intenso ni genérico
- Hablas en español, tono casual y cálido
- Usas emojis con moderación (no en cada frase)
- No eres un chatbot genérico: eres el compañero personal del usuario

REGLAS:
- Respuestas CORTAS (1-3 oraciones máximo)
- Nunca uses frases corporativas ni genéricas como "¿En qué puedo ayudarte?"
- Referenciate a datos del usuario cuando los tengas
- Si el usuario pregunta por misiones, sugiere algo concreto
- Si el usuario está triste o inactivo, sé empático pero no dramático
- Nunca hables de tareas, listas de pendientes o productividad corporativa
- Haru es una aventura, no una herramienta de productividad

MODOS DE CONVERSACIÓN:
1. RECOMENDADOR: Sugiere misiones concretas basadas en gustos del usuario
2. MOTIVADOR: Celebra logros, empuja sutilmente, recuerda rachas
3. EXPLORADOR: Desafía al usuario a salir de su zona de confort
4. NARRADOR: Cuenta la historia del progreso del usuario

Responde SOLO con el mensaje para el usuario. No incluyas metadata ni JSON.`;

  constructor(
    private configService: ConfigService,
    private profileService: BotiProfileService,
  ) {
    const apiKey = this.configService.get('GROQ_API_KEY');
    if (apiKey && apiKey !== 'gsk_your_groq_api_key_here') {
      this.groq = new Groq({ apiKey });
      this.logger.log('BotiAI initialized with Groq — Model: ' + this.chatModel);
    } else {
      this.logger.warn('GROQ_API_KEY not set — BotiAI using template responses');
    }
  }

  get isAvailable(): boolean {
    return this.groq !== null;
  }

  // ─── CHAT WITH BOTI ────────────────────────────────
  async chat(
    userId: string,
    userMessage: string,
    profile: UserProfile,
    recentMessages: BotiChatMessage[] = [],
  ): Promise<BotiConversationResult> {
    this.logger.log(`Chat with user ${userId}: "${userMessage.substring(0, 50)}..."`);

    // Determine the best mode for this message
    const mode = this.detectMode(userMessage, profile);

    // Get recommended quest if in recommender mode
    let suggestedQuest: any = undefined;
    if (mode === 'recommender') {
      const quests = await this.profileService.getRecommendedQuests(userId, 1);
      suggestedQuest = quests[0] || undefined;
    }

    if (!this.groq) {
      // Fallback: template-based response
      const message = this.profileService.generateModeMessage(mode, profile, suggestedQuest);
      return {
        message,
        mode,
        expression: this.getExpressionForMode(mode),
        mood: profile.recentMood,
        suggestedQuest,
        profileSummary: this.summarizeProfile(profile),
      };
    }

    try {
      // Build context for AI
      const contextParts: string[] = [];

      contextParts.push(`USUARIO: nivel ${profile.currentLevel}, ${profile.totalQuestsCompleted} misiones completadas, racha de ${profile.currentStreak} días.`);

      if (profile.favoriteCategories.length > 0) {
        contextParts.push(`Categorías favoritas: ${profile.favoriteCategories.map(c => c.category).join(', ')}.`);
      }
      if (profile.ignoredCategories.length > 0) {
        contextParts.push(`Categorías que nunca ha probado: ${profile.ignoredCategories.slice(0, 3).map(c => c.category).join(', ')}.`);
      }
      contextParts.push(`Dificultad preferida: ${profile.preferredDifficulty}.`);
      contextParts.push(`Explorador: ${profile.explorersScore}/100 (${profile.explorersScore < 30 ? 'prefiere lo mismo' : profile.explorersScore > 70 ? 'explora todo' : 'equilibrado'}).`);
      contextParts.push(`Horario preferido: ${profile.preferredTimeOfDay}.`);
      contextParts.push(`Frecuencia: ${profile.frequencyDaysPerWeek} días/semana.`);

      if (suggestedQuest) {
        contextParts.push(`\nMISIÓN SUGERIDA: "${suggestedQuest.title}" — ${suggestedQuest.description} (${suggestedQuest.category}, ${suggestedQuest.difficulty}, ${suggestedQuest.duration}min, +${suggestedQuest.xpReward}XP)`);
      }

      const systemMessage = `${this.BOTI_SYSTEM_PROMPT}\n\nCONTEXTO DEL USUARIO:\n${contextParts.join('\n')}\n\nMODO ACTIVO: ${mode.toUpperCase()}`;

      // Build conversation history
      const messages: any[] = [{ role: 'system', content: systemMessage }];

      // Add last 5 messages for context
      for (const msg of recentMessages.slice(-5)) {
        messages.push({
          role: msg.role === 'boti' ? 'assistant' : 'user',
          content: msg.content,
        });
      }

      messages.push({ role: 'user', content: userMessage });

      const completion = await this.groq.chat.completions.create({
        model: this.chatModel,
        messages,
        temperature: 0.8,
        max_completion_tokens: 256,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Hmm, no sé qué decir. ¿Qué hacemos hoy?';

      this.logger.log(`BotiAI response (${mode}): ${aiResponse.substring(0, 100)}...`);

      return {
        message: aiResponse,
        mode,
        expression: this.getExpressionForMode(mode),
        mood: profile.recentMood,
        suggestedQuest,
        profileSummary: this.summarizeProfile(profile),
      };
    } catch (error) {
      this.logger.error(`Groq chat error: ${error.message}`);
      // Fallback to template
      const message = this.profileService.generateModeMessage(mode, profile, suggestedQuest);
      return {
        message,
        mode,
        expression: this.getExpressionForMode(mode),
        mood: profile.recentMood,
        suggestedQuest,
        profileSummary: this.summarizeProfile(profile),
      };
    }
  }

  // ─── GENERATE BOTI DAILY MESSAGE ───────────────────
  async generateDailyMessage(userId: string): Promise<BotiConversationResult> {
    const profile = await this.profileService.buildProfile(userId);
    const mode = this.pickBestMode(profile);
    const quests = await this.profileService.getRecommendedQuests(userId, 1);
    const suggestedQuest = quests[0] || undefined;

    if (!this.groq) {
      const message = this.profileService.generateModeMessage(mode, profile, suggestedQuest);
      return {
        message,
        mode,
        expression: this.getExpressionForMode(mode),
        mood: profile.recentMood,
        suggestedQuest,
        profileSummary: this.summarizeProfile(profile),
      };
    }

    try {
      const contextParts: string[] = [];
      contextParts.push(`USUARIO: nivel ${profile.currentLevel}, ${profile.totalQuestsCompleted} misiones, racha ${profile.currentStreak} días.`);
      if (profile.favoriteCategories.length > 0) {
        contextParts.push(`Favoritas: ${profile.favoriteCategories.map(c => c.category).join(', ')}`);
      }
      if (suggestedQuest) {
        contextParts.push(`MISIÓN SUGERIDA: "${suggestedQuest.title}" — ${suggestedQuest.description} (${suggestedQuest.category})`);
      }

      const completion = await this.groq.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: `${this.BOTI_SYSTEM_PROMPT}\n\nCONTEXTO: ${contextParts.join(' ')}\n\nMODO: ${mode.toUpperCase()}\n\nGenera el mensaje de Boti al usuario para hoy. Sé natural y breve.`,
          },
        ],
        temperature: 0.9,
        max_completion_tokens: 200,
      });

      const message = completion.choices[0]?.message?.content || this.profileService.generateModeMessage(mode, profile, suggestedQuest);

      return {
        message,
        mode,
        expression: this.getExpressionForMode(mode),
        mood: profile.recentMood,
        suggestedQuest,
        profileSummary: this.summarizeProfile(profile),
      };
    } catch (error) {
      this.logger.error(`Groq daily message error: ${error.message}`);
      const message = this.profileService.generateModeMessage(mode, profile, suggestedQuest);
      return {
        message,
        mode,
        expression: this.getExpressionForMode(mode),
        mood: profile.recentMood,
        suggestedQuest,
        profileSummary: this.summarizeProfile(profile),
      };
    }
  }

  // ─── DETECT MODE FROM USER MESSAGE ─────────────────
  private detectMode(message: string, profile: UserProfile): string {
    const lower = message.toLowerCase();

    // Recommender patterns
    if (/misión|mision|quest|reto|actividad|qué hago|que hago|sugiér|sugier|quiero hacer/.test(lower)) {
      return 'recommender';
    }

    // Motivator patterns
    if (/racha|streak|nivel|level|logro|muy difícil|no puedo|cansado|desanimado|motiva/.test(lower)) {
      return 'motivator';
    }

    // Explorer patterns
    if (/diferente|nuevo|nueva|aventura|explorar|probar|salir|zona de confort|variado/.test(lower)) {
      return 'explorer';
    }

    // Narrator patterns
    if (/progreso|historia|cuánto|cuanto|he hecho|resumen|cuento|cuéntame|cuentame/.test(lower)) {
      return 'narrador';
    }

    // Default: pick based on profile
    return this.pickBestMode(profile);
  }

  // ─── PICK BEST MODE BASED ON PROFILE ───────────────
  private pickBestMode(profile: UserProfile): string {
    // If low streak or inactive → motivator
    if (profile.currentStreak === 0 || profile.frequencyDaysPerWeek < 2) {
      return 'motivator';
    }

    // If same category too many times → explorer
    if (profile.consecutiveDaysSameCategory >= 3) {
      return 'explorer';
    }

    // If low explorer score → explorer
    if (profile.explorersScore < 25 && Math.random() > 0.5) {
      return 'explorer';
    }

    // If high level with good progress → narrator
    if (profile.currentLevel >= 10 && profile.totalQuestsCompleted >= 20 && Math.random() > 0.7) {
      return 'narrador';
    }

    // Default: recommender
    return 'recommender';
  }

  // ─── GET EXPRESSION FOR MODE ───────────────────────
  private getExpressionForMode(mode: string): string {
    const map: Record<string, string> = {
      recommender: 'curious',
      motivator: 'excited',
      explorer: 'curious',
      narrador: 'calm',
    };
    return map[mode] || 'calm';
  }

  // ─── SUMMARIZE PROFILE ─────────────────────────────
  private summarizeProfile(profile: UserProfile): string {
    const parts: string[] = [];
    parts.push(`Nivel ${profile.currentLevel}`);
    parts.push(`${profile.totalQuestsCompleted} misiones`);
    if (profile.currentStreak > 0) parts.push(`Racha ${profile.currentStreak}d`);
    if (profile.favoriteCategories.length > 0) {
      parts.push(`Fav: ${profile.favoriteCategories[0].category}`);
    }
    return parts.join(' · ');
  }
}
