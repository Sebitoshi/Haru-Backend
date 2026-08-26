import { Controller, Get, Patch, Post, Body, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { BotiService } from './boti.service';
import { UpdateBotiDto } from './dto/update-boti.dto';

@ApiTags('BOTI')
@ApiBearerAuth()
@Controller('boti')
export class BotiController {
  constructor(private readonly botiService: BotiService) {}

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
}
