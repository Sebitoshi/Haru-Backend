import { Controller, Get, Post, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';

@ApiTags('Achievements')
@ApiBearerAuth()
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get('me')
  @ApiOperation({ summary: '🏆 My badges — unlocked and locked' })
  async getMyBadges(@Request() req: any) {
    return this.achievementsService.getUserBadges(req.user.id);
  }

  @Post('me/check')
  @ApiOperation({
    summary: '🔍 Check and unlock new badges',
    description: 'Runs all badge checks for the current user. Call after completing quests, leveling up, etc.',
  })
  async checkMyBadges(@Request() req: any) {
    return this.achievementsService.checkBadges(req.user.id);
  }

  @Get('catalog')
  @ApiOperation({ summary: '📋 All badges catalog — grouped by category' })
  async getCatalog() {
    return this.achievementsService.getAllBadges();
  }

  @Post('seed')
  @ApiOperation({ summary: '🌱 Seed all badge definitions into the database' })
  @ApiResponse({ status: 201, description: 'Badges seeded' })
  async seedBadges() {
    return this.achievementsService.seedBadges();
  }
}
