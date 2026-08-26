import { Controller, Get, Post, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StreaksService } from './streaks.service';

@ApiTags('Streaks')
@ApiBearerAuth()
@Controller('streaks')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user streak info' })
  @ApiResponse({ status: 200, description: 'Returns streak, milestones, protections' })
  async getMyStreak(@Request() req: any) {
    return this.streaksService.getStreak(req.user.id);
  }

  @Post('me/record')
  @ApiOperation({
    summary: 'Record activity and update streak',
    description: 'Called automatically after quest completion. Can also be called manually.',
  })
  @ApiResponse({ status: 200, description: 'Streak updated with milestone check' })
  async recordActivity(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    return this.streaksService.recordActivity(req.user.id, type || 'quest_completed');
  }

  @Post('me/protect')
  @ApiOperation({
    summary: '🛡️ Use a streak protection',
    description: 'Uses 1 protection to prevent streak loss for today. Must be used before midnight.',
  })
  @ApiResponse({ status: 200, description: 'Protection used' })
  @ApiResponse({ status: 400, description: 'Streak not broken or no protections' })
  async useProtection(@Request() req: any) {
    return this.streaksService.useProtection(req.user.id);
  }

  @Post('me/buy-protection')
  @ApiOperation({
    summary: '🛡️ Buy a streak protection',
    description: `Buy 1 protection for ${200} coins. Protects 1 day of streak if broken.`,
  })
  @ApiResponse({ status: 200, description: 'Protection purchased' })
  async buyProtection(@Request() req: any) {
    return this.streaksService.buyProtection(req.user.id);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get streak activity calendar' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days to show (default 30)' })
  @ApiResponse({ status: 200, description: 'Returns calendar view of activity' })
  async getStreakHistory(
    @Request() req: any,
    @Query('days') days?: number,
  ) {
    return this.streaksService.getStreakHistory(req.user.id, days || 30);
  }

  @Get('milestones')
  @ApiOperation({ summary: 'Get all streak milestones and rewards' })
  @ApiResponse({ status: 200, description: 'Returns milestones list' })
  getMilestones() {
    const milestones = [
      { days: 3, reward: { xp: 30, coins: 15 }, message: '📅 3 días de racha' },
      { days: 7, reward: { xp: 75, coins: 40 }, message: '🔥 7 días de racha' },
      { days: 14, reward: { xp: 150, coins: 75 }, message: '⚡ 2 semanas' },
      { days: 21, reward: { xp: 200, coins: 100 }, message: '💎 3 semanas' },
      { days: 30, reward: { xp: 300, coins: 150 }, message: '👑 1 mes' },
      { days: 50, reward: { xp: 500, coins: 250 }, message: '🌟 50 días' },
      { days: 100, reward: { xp: 1000, coins: 500 }, message: '🏆 100 días — ¡LEYENDA!' },
      { days: 365, reward: { xp: 3000, coins: 1500 }, message: '🌍 365 días — ¡AÑO COMPLETO!' },
    ];
    return milestones;
  }
}
