import { Controller, Get, Post, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BadgeService } from './badge.service';

@ApiTags('Badges')
@ApiBearerAuth()
@Controller('badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  // ─── GET ALL BADGES ───────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all available badges' })
  @ApiResponse({ status: 200, description: 'Returns all badge definitions' })
  async getAllBadges() {
    return this.badgeService.getAllBadges();
  }

  // ─── GET MY BADGES ────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user earned badges' })
  @ApiResponse({ status: 200, description: 'Returns earned badges' })
  async getMyBadges(@Request() req: any) {
    return this.badgeService.getUserBadges(req.user.id);
  }

  // ─── GET BADGE PROGRESS ───────────────────────────
  @Get('me/progress')
  @ApiOperation({ summary: 'Get badge progress for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all badges with progress info',
  })
  async getBadgeProgress(@Request() req: any) {
    return this.badgeService.getBadgeProgress(req.user.id);
  }

  // ─── CHECK AND AWARD BADGES ───────────────────────
  @Post('me/check')
  @ApiOperation({
    summary: 'Check and award any eligible badges',
    description: 'Manually trigger badge check. Usually called automatically.',
  })
  @ApiResponse({ status: 200, description: 'Returns newly awarded badges' })
  async checkBadges(@Request() req: any) {
    const awarded = await this.badgeService.checkAndAwardBadges(req.user.id);
    return {
      awarded,
      count: awarded.length,
      message: awarded.length > 0
        ? `Earned ${awarded.length} new badge(s)!`
        : 'No new badges earned',
    };
  }

  // ─── SEED BADGES (Admin) ──────────────────────────
  @Post('seed')
  @ApiOperation({ summary: 'Seed all badge definitions (admin)' })
  @ApiResponse({ status: 200, description: 'Badges seeded' })
  async seedBadges() {
    await this.badgeService.seedBadges();
    return { message: 'Badges seeded successfully' };
  }
}
