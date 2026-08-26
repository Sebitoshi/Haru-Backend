import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { ProposeQuestDto } from './dto/propose-quest.dto';
import { QuestFiltersDto } from './dto/quest-filters.dto';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Quests')
@ApiBearerAuth()
@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // ─── GET ALL QUESTS ───────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all available quests with filters (level-aware)' })
  @ApiQuery({ name: 'category', required: false, enum: ['nature', 'creativity', 'kindness', 'learning', 'movement', 'social', 'photography', 'relaxation', 'adventure'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'normal', 'hard', 'special'] })
  @ApiQuery({ name: 'maxDuration', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns filtered quests (locked ones marked)' })
  async getAllQuests(
    @Query() filters: QuestFiltersDto,
    @Request() req: any,
  ) {
    return this.questsService.getAllQuests(filters, req.user?.level || 1);
  }

  // ─── GET QUEST CATEGORIES ─────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'Get all quest categories with metadata and min level' })
  @ApiResponse({ status: 200, description: 'Returns categories with emoji, name, minLevel' })
  getCategories() {
    return this.questsService.getCategories();
  }

  // ─── GET DAILY QUEST ──────────────────────────────
  @Get('daily')
  @ApiOperation({ summary: 'Get today\'s recommended quest (personalized)' })
  @ApiResponse({ status: 200, description: 'Returns daily quest' })
  async getDailyQuest(@Request() req: any) {
    return this.questsService.getDailyQuest(req.user.id, req.user?.level || 1);
  }

  // ─── WEEKLY QUESTS ────────────────────────────────
  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly quests (reset every Monday)' })
  @ApiResponse({ status: 200, description: 'Returns weekly quests with progress' })
  async getWeeklyQuests(@Request() req: any) {
    return this.questsService.getWeeklyQuests(req.user.id);
  }

  // ─── SURPRISE ME ──────────────────────────────────
  @Get('surprise')
  @ApiOperation({ summary: '🎲 SORPRÉNDEME — Get a random quest' })
  @ApiResponse({ status: 200, description: 'Returns a random quest' })
  async getSurpriseQuest(@Request() req: any) {
    return this.questsService.getSurpriseQuest(req.user.id, req.user?.level || 1);
  }

  // ─── GET MY QUESTS ────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user\'s quests with progress' })
  @ApiQuery({ name: 'status', required: false, enum: ['available', 'accepted', 'in_progress', 'completed', 'failed', 'skipped'] })
  @ApiResponse({ status: 200, description: 'Returns user quests with status and progress' })
  async getMyQuests(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.questsService.getUserQuests(req.user.id, status);
  }

  // ─── GET QUEST STATS ──────────────────────────────
  @Get('me/stats')
  @ApiOperation({ summary: 'Get quest statistics for current user' })
  @ApiResponse({ status: 200, description: 'Returns quest stats including weekly and AI completions' })
  async getQuestStats(@Request() req: any) {
    return this.questsService.getQuestStats(req.user.id);
  }

  // ─── GET QUEST BY ID ──────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get quest details by ID' })
  @ApiResponse({ status: 200, description: 'Returns quest details' })
  @ApiResponse({ status: 404, description: 'Quest not found' })
  async getQuestById(@Param('id') id: string) {
    return this.questsService.getQuestById(id);
  }

  // ─── CREATE QUEST (Admin/Boti) ────────────────────
  @Post()
  @ApiOperation({ summary: 'Create a new quest (admin or Boti/IA)' })
  @ApiResponse({ status: 201, description: 'Quest created successfully' })
  async createQuest(@Body() dto: CreateQuestDto) {
    return this.questsService.createQuest(dto);
  }

  // ─── PROPOSE QUEST (Boti/IA) ──────────────────────
  @Post('propose')
  @ApiOperation({
    summary: '🤖 Boti/IA proposes a personalized quest',
    description: 'AI proposes quest content. Backend validates structure and assigns rewards.',
  })
  @ApiResponse({ status: 201, description: 'Quest proposed and created by Boti/IA' })
  @ApiResponse({ status: 409, description: 'Similar AI quest proposed recently' })
  async proposeQuest(
    @Request() req: any,
    @Body() dto: ProposeQuestDto,
  ) {
    return this.questsService.proposeQuest(req.user.id, dto);
  }

  // ─── ACCEPT QUEST ─────────────────────────────────
  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a quest' })
  @ApiResponse({ status: 200, description: 'Quest accepted' })
  @ApiResponse({ status: 403, description: 'Level requirement not met' })
  @ApiResponse({ status: 409, description: 'Quest already accepted or completed' })
  async acceptQuest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.questsService.acceptQuest(req.user.id, id, req.user?.level || 1);
  }

  // ─── START QUEST ──────────────────────────────────
  @Post(':id/start')
  @ApiOperation({ summary: 'Start an accepted quest' })
  @ApiResponse({ status: 200, description: 'Quest started' })
  async startQuest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.questsService.startQuest(req.user.id, id);
  }

  // ─── UPDATE PROGRESS (multi-step) ─────────────────
  @Patch(':id/progress')
  @ApiOperation({
    summary: 'Update step progress for multi-step quests',
    description: 'Track progress on each step (photo, text, action).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        stepIndex: { type: 'number', example: 0 },
        completed: { type: 'boolean', example: true },
        evidence: { type: 'string', example: 'https://cloudinary.com/photo.jpg' },
      },
      required: ['stepIndex', 'completed'],
    },
  })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { stepIndex: number; completed: boolean; evidence?: string },
  ) {
    return this.questsService.updateProgress(req.user.id, id, body);
  }

  // ─── COMPLETE QUEST ───────────────────────────────
  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a quest and receive rewards (with streak multiplier)' })
  @ApiResponse({ status: 200, description: 'Quest completed with XP + Coins + streak bonus' })
  async completeQuest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.questsService.completeQuest(req.user.id, id);
  }

  // ─── SKIP QUEST ───────────────────────────────────
  @Post(':id/skip')
  @ApiOperation({ summary: 'Skip a quest' })
  @ApiResponse({ status: 200, description: 'Quest skipped' })
  async skipQuest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.questsService.skipQuest(req.user.id, id);
  }

  // ─── SEED QUESTS (Admin) ─────────────────────────
  @Public()
  @Post('seed')
  @ApiOperation({ summary: 'Seed all quests (regular + weekly)' })
  @ApiResponse({ status: 200, description: 'Quests seeded' })
  async seedQuests() {
    return this.questsService.seedQuests();
  }
}
