import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProgressionService } from './progression.service';

@ApiTags('Progression')
@ApiBearerAuth()
@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('me')
  @ApiOperation({ summary: '📊 My progression — level, XP, coins, progress' })
  async getMyProgression(@Request() req: any) {
    return this.progressionService.getProgression(req.user.id);
  }

  @Get('levels')
  @ApiOperation({ summary: '📋 Level table — all levels with XP requirements and rewards' })
  async getLevelTable() {
    return this.progressionService.getLevelTable();
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '🏆 Leaderboard — top users by XP, level, coins, or streak' })
  @ApiQuery({ name: 'type', required: false, enum: ['xp', 'level', 'coins', 'streak'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.progressionService.getLeaderboard({
      type: (type as any) || 'xp',
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
