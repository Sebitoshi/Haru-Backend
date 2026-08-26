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
} from '@nestjs/swagger';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { QuestFiltersDto } from './dto/quest-filters.dto';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Quests')
@ApiBearerAuth()
@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // ─── GET ALL QUESTS ───────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all available quests with filters' })
  @ApiQuery({ name: 'category', required: false, enum: ['nature', 'creativity', 'kindness', 'learning', 'movement', 'social', 'photography', 'relaxation', 'adventure'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'normal', 'hard', 'special'] })
  @ApiQuery({ name: 'maxDuration', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns filtered quests' })
  async getAllQuests(@Query() filters: QuestFiltersDto) {
    return this.questsService.getAllQuests(filters);
  }

  // ─── GET QUEST CATEGORIES ─────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'Get all quest categories with metadata' })
  @ApiResponse({ status: 200, description: 'Returns categories with emoji, name, description' })
  getCategories() {
    return this.questsService.getCategories();
  }

  // ─── GET DAILY QUEST ──────────────────────────────
  @Get('daily')
  @ApiOperation({ summary: 'Get today\'s recommended quest' })
  @ApiResponse({ status: 200, description: 'Returns daily quest personalized for the user' })
  async getDailyQuest(@Request() req: any) {
    return this.questsService.getDailyQuest(req.user.id);
  }

  // ─── SURPRISE ME ──────────────────────────────────
  @Get('surprise')
  @ApiOperation({ summary: '🎲 SORPRÉNDEME — Get a random quest' })
  @ApiResponse({ status: 200, description: 'Returns a random quest' })
  async getSurpriseQuest(@Request() req: any) {
    return this.questsService.getSurpriseQuest(req.user.id);
  }

  // ─── GET MY QUESTS ────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user\'s quests' })
  @ApiQuery({ name: 'status', required: false, enum: ['available', 'accepted', 'in_progress', 'completed', 'failed', 'skipped'] })
  @ApiResponse({ status: 200, description: 'Returns user quests with status' })
  async getMyQuests(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.questsService.getUserQuests(req.user.id, status);
  }

  // ─── GET QUEST STATS ──────────────────────────────
  @Get('me/stats')
  @ApiOperation({ summary: 'Get quest statistics for current user' })
  @ApiResponse({ status: 200, description: 'Returns quest stats: completed, xp earned, etc.' })
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

  // ─── ACCEPT QUEST ─────────────────────────────────
  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a quest' })
  @ApiResponse({ status: 200, description: 'Quest accepted' })
  @ApiResponse({ status: 409, description: 'Quest already accepted or completed' })
  async acceptQuest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.questsService.acceptQuest(req.user.id, id);
  }

  // ─── START QUEST ──────────────────────────────────
  @Post(':id/start')
  @ApiOperation({ summary: 'Start an accepted quest (sets status to in_progress)' })
  @ApiResponse({ status: 200, description: 'Quest started' })
  @ApiResponse({ status: 400, description: 'Quest not in accepted status' })
  async startQuest(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.questsService.startQuest(req.user.id, id);
  }

  // ─── COMPLETE QUEST ───────────────────────────────
  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a quest and receive rewards' })
  @ApiResponse({ status: 200, description: 'Quest completed, rewards delivered' })
  @ApiResponse({ status: 400, description: 'Quest not in progress or expired' })
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
  @ApiOperation({ summary: 'Seed initial quests (admin)' })
  @ApiResponse({ status: 200, description: 'Quests seeded' })
  async seedQuests() {
    return this.questsService.seedQuests();
  }
}
