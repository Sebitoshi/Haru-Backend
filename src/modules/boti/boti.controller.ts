import { Controller, Get, Patch, Post, Body, Request, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BotiService } from './boti.service';
import { BotiAI } from './boti-ai.service';
import { BotiProfileService } from './boti-profile.service';
import { UpdateBotiDto } from './dto/update-boti.dto';

@ApiTags('BOTI')
@ApiBearerAuth()
@Controller('boti')
export class BotiController {
  constructor(
    private readonly botiService: BotiService,
    private readonly botiAI: BotiAI,
    private readonly profileService: BotiProfileService,
  ) {}

  // ─── GET BOTI ─────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user BOTI character' })
  @ApiResponse({
    status: 200,
    description: 'Returns BOTI with expression, greeting, mood, and memory',
  })
  async getBoti(@Request() req: any) {
    return this.botiService.getBoti(req.user.id);
  }

  // ─── UPDATE BOTI ──────────────────────────────────
  @Patch('me')
  @ApiOperation({ summary: 'Update BOTI character (name, appearance, personality)' })
  @ApiResponse({ status: 200, description: 'BOTI updated successfully' })
  async updateBoti(
    @Request() req: any,
    @Body() dto: UpdateBotiDto,
  ) {
    return this.botiService.updateBoti(req.user.id, dto);
  }

  // ─── SET EXPRESSION ───────────────────────────────
  @Patch('me/expression')
  @ApiOperation({ summary: 'Set BOTI expression manually' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          enum: ['calm', 'happy', 'curious', 'surprised', 'confused', 'tired', 'excited', 'celebrating', 'worried'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Expression set successfully' })
  async setExpression(
    @Request() req: any,
    @Body('expression') expression: string,
  ) {
    return this.botiService.setExpression(req.user.id, expression);
  }

  // ─── SET MOOD ─────────────────────────────────────
  @Patch('me/mood')
  @ApiOperation({ summary: 'Set BOTI mood manually' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        mood: {
          type: 'string',
          enum: ['neutral', 'good', 'great', 'bad', 'awful'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mood set successfully' })
  async setMood(
    @Request() req: any,
    @Body('mood') mood: string,
  ) {
    return this.botiService.setMood(req.user.id, mood);
  }

  // ─── GET DYNAMIC MOOD ─────────────────────────────
  @Get('me/mood')
  @ApiOperation({
    summary: 'Get BOTI dynamic mood',
    description: 'Calculates mood based on user activity, streak, quests, time of day',
  })
  @ApiResponse({ status: 200, description: 'Returns calculated mood with factors' })
  async getMood(@Request() req: any) {
    return this.botiService.getMood(req.user.id);
  }

  // ─── INTERACT ─────────────────────────────────────
  @Post('me/interact')
  @ApiOperation({
    summary: 'Interact with BOTI',
    description: 'Triggers contextual response with memory references',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          enum: ['quest_completed', 'level_up', 'chat_start', 'mission_suggested', 'mission_rejected', 'idle', 'return', 'streak_milestone'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns BOTI response with memory' })
  async interact(
    @Request() req: any,
    @Body('context') context?: string,
  ) {
    return this.botiService.interact(req.user.id, context);
  }

  // ─── SAVE PREFERENCE ──────────────────────────────
  @Post('me/memory/preference')
  @ApiOperation({
    summary: 'Save a user preference to BOTI memory',
    description: 'BOTI will remember this preference for future interactions',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'favorite_category' },
        value: { type: 'string', example: 'creative' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Preference saved to memory' })
  async savePreference(
    @Request() req: any,
    @Body('key') key: string,
    @Body('value') value: any,
  ) {
    return this.botiService.savePreference(req.user.id, key, value);
  }

  // ─── GET MEMORIES ─────────────────────────────────
  @Get('me/memories')
  @ApiOperation({
    summary: 'Get BOTI memories for user',
    description: 'Returns grouped memories by type (preferences, events, milestones)',
  })
  @ApiResponse({ status: 200, description: 'Returns memories grouped by type' })
  async getMemories(@Request() req: any) {
    return this.botiService.getMemories(req.user.id);
  }

  // ─── GET EXPRESSIONS ──────────────────────────────
  @Get('expressions')
  @ApiOperation({ summary: 'Get all available BOTI expressions' })
  @ApiResponse({ status: 200, description: 'Returns all expression options' })
  async getExpressions() {
    return this.botiService.getExpressions();
  }

  // ─── GET STATUS ───────────────────────────────────
  @Get('me/status')
  @ApiOperation({ summary: 'Get BOTI detailed status' })
  @ApiResponse({ status: 200, description: 'Returns BOTI status info' })
  async getStatus(@Request() req: any) {
    return this.botiService.getStatus(req.user.id);
  }

  // ─── CHAT WITH BOTI ──────────────────────────────
  @Post('me/chat')
  @ApiOperation({
    summary: 'Chat with Boti',
    description: 'AI-powered conversation. Boti uses your profile to give contextual responses. Returns suggested quest when relevant.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '¿Qué misión me recomiendas hoy?' },
        recentMessages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'boti'] },
              content: { type: 'string' },
            },
          },
          description: 'Last N messages for conversation context (optional)',
        },
      },
      required: ['message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns Boti response with mode, expression, and optional suggested quest' })
  async chat(
    @Request() req: any,
    @Body('message') message: string,
    @Body('recentMessages') recentMessages?: any[],
  ) {
    const profile = await this.profileService.buildProfile(req.user.id);
    return this.botiAI.chat(req.user.id, message, profile, recentMessages || []);
  }

  // ─── DAILY MESSAGE ───────────────────────────────
  @Post('me/daily')
  @ApiOperation({
    summary: 'Get Boti daily message',
    description: 'Boti generates a contextual daily message based on your profile, streak, and activity. Best mode auto-selected.',
  })
  @ApiResponse({ status: 200, description: 'Returns daily Boti message with mode and suggested quest' })
  async getDailyMessage(@Request() req: any) {
    return this.botiAI.generateDailyMessage(req.user.id);
  }

  // ─── RECOMMENDATIONS ─────────────────────────────
  @Get('me/recommendations')
  @ApiOperation({
    summary: 'Get personalized quest recommendations',
    description: 'Boti analyzes your profile (favorite categories, difficulty, exploration score) to recommend quests.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (default 5)' })
  @ApiResponse({ status: 200, description: 'Returns recommended quests with scores' })
  async getRecommendations(
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    const quests = await this.profileService.getRecommendedQuests(req.user.id, limit || 5);
    const profile = await this.profileService.buildProfile(req.user.id);
    return {
      recommendations: quests,
      profile: {
        favoriteCategories: profile.favoriteCategories,
        ignoredCategories: profile.ignoredCategories,
        explorerScore: profile.explorersScore,
        preferredDifficulty: profile.preferredDifficulty,
      },
    };
  }

  // ─── USER PROFILE ─────────────────────────────────
  @Get('me/profile')
  @ApiOperation({
    summary: 'Get Boti user behavior profile',
    description: 'Shows how Boti sees the user: favorite categories, difficulty, frequency, explorer score.',
  })
  @ApiResponse({ status: 200, description: 'Returns full user behavior profile' })
  async getProfile(@Request() req: any) {
    return this.profileService.buildProfile(req.user.id);
  }

  // ─── MODES INFO ───────────────────────────────────
  @Get('modes')
  @ApiOperation({
    summary: 'Get Boti conversation modes',
    description: 'Returns the 4 Boti modes with descriptions.',
  })
  @ApiResponse({ status: 200, description: 'Returns mode info' })
  getModes() {
    return [
      {
        id: 'recommender',
        emoji: '🎯',
        name: 'Recomendador',
        description: 'Boti analiza tus gustos y te sugiere misiones personalizadas.',
        example: 'Tengo una misión que creo que te va a gustar 🎨',
      },
      {
        id: 'motivator',
        emoji: '🌱',
        name: 'Motivador',
        description: 'Celebra tus logros y te empuja sutilmente a seguir.',
        example: '¡Llevas 6 días seguidos! ¡Uno más! 🔥',
      },
      {
        id: 'explorer',
        emoji: '🧭',
        name: 'Explorador',
        description: 'Te saca de tu zona de confort con retos diferentes.',
        example: 'Siempre eliges creatividad. Probemos aventura.',
      },
      {
        id: 'narrador',
        emoji: '📖',
        name: 'Narrador',
        description: 'Cuenta tu historia de progreso y logros.',
        example: 'Has recorrido bastante camino. Mira todo lo que has conseguido.',
      },
    ];
  }
}
