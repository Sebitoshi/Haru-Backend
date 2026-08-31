import { Controller, Get, Param, Query, Request, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RankingsService } from './rankings.service';
import { RankingNotificationService } from './ranking-notification.service';

@ApiTags('Rankings')
@ApiBearerAuth()
@Controller('rankings')
export class RankingsController {
  constructor(
    private readonly rankingsService: RankingsService,
    private readonly notifService: RankingNotificationService,
  ) {}

  // ─── GLOBAL RANKING ───────────────────────────────
  @Get('global')
  @ApiOperation({ summary: 'Get global ranking by XP' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns global ranking with user position' })
  async getGlobal(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRanking(
      req.user.id, 'global',
      (period as any) || 'all_time',
      undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─── FRIENDS RANKING ─────────────────────────────
  @Get('friends')
  @ApiOperation({ summary: 'Get ranking among your friends' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns friends-only ranking' })
  async getFriends(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRanking(
      req.user.id, 'friends',
      (period as any) || 'all_time',
      undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─── STREAK RANKING ──────────────────────────────
  @Get('streak')
  @ApiOperation({ summary: 'Get ranking by current streak' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns streak ranking' })
  async getStreak(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRanking(
      req.user.id, 'streak', 'all_time',
      undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─── XP RANKING ──────────────────────────────────
  @Get('xp')
  @ApiOperation({ summary: 'Get ranking by XP earned in period' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns XP ranking for period' })
  async getXp(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRanking(
      req.user.id, 'xp',
      (period as any) || 'all_time',
      undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─── MISSIONS RANKING ────────────────────────────
  @Get('missions')
  @ApiOperation({ summary: 'Get ranking by completed missions' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns missions ranking' })
  async getMissions(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRanking(
      req.user.id, 'missions',
      (period as any) || 'all_time',
      undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─── CATEGORY RANKING ────────────────────────────
  @Get('category/:category')
  @ApiOperation({ summary: 'Get ranking for a specific category' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns category-specific ranking' })
  async getCategory(
    @Request() req: any,
    @Param('category') category: string,
    @Query('period') period?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rankingsService.getRanking(
      req.user.id, 'category',
      (period as any) || 'all_time',
      category,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─── MY RANKING SUMMARY ──────────────────────────
  @Get('me')
  @ApiOperation({
    summary: 'Get your ranking summary across all types',
    description: 'Shows your position in global, missions, and streak rankings.',
  })
  @ApiResponse({ status: 200, description: 'Returns personal ranking summary' })
  async getMySummary(@Request() req: any) {
    return this.rankingsService.getMyRankingSummary(req.user.id);
  }

  // ─── AVAILABLE CATEGORIES ─────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'Get available ranking categories' })
  @ApiResponse({ status: 200, description: 'Returns category list' })
  getCategories() {
    return this.rankingsService.getCategories();
  }

  // ─── NOTIFICATIONS ────────────────────────────────
  @Get('notifications')
  @ApiOperation({ summary: 'Get ranking notifications (position changes, badge unlocks)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns ranking notifications' })
  async getNotifications(@Request() req: any, @Query('limit') limit?: string) {
    return this.notifService.getNotifications(req.user.id, limit ? parseInt(limit) : 20);
  }

  @Patch('notifications/read')
  @ApiOperation({ summary: 'Mark all ranking notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAsRead(@Request() req: any) {
    return this.notifService.markAllAsRead(req.user.id);
  }
}
