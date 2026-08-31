import { Controller, Get, Post, Param, Query, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TrustService } from './trust.service';
import { Admin } from '../auth/guards/admin.guard';

@ApiTags('Trust')
@ApiBearerAuth()
@Controller('trust')
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Get('me')
  @ApiOperation({ summary: '🛡️ My trust profile — level, score, cooldown, rehabilitation status' })
  async getMyTrustProfile(@Request() req: any) {
    return this.trustService.getTrustProfile(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '🏆 Trust leaderboard — most trusted users' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.trustService.getTrustLeaderboard(limit ? parseInt(limit) : 20);
  }

  @Post('me/rehabilitate')
  @ApiOperation({
    summary: '🔄 Attempt rehabilitation — restore points after maintaining good behavior',
    description: 'If you maintained 🌿 level for 30 days after a fraud, you can restore lost points.',
  })
  async attemptRehabilitation(@Request() req: any) {
    return this.trustService.rehabilitate(req.user.id);
  }

  // ─── ADMIN ENDPOINTS ──────────────────────────────

  @Admin()
  @Get('admin/stats')
  @ApiOperation({ summary: '📊 Admin: trust system statistics + cooldowns + rehabilitations' })
  async getTrustStats() {
    return this.trustService.getTrustStats();
  }

  @Admin()
  @Get('admin/user/:userId')
  @ApiOperation({ summary: '🔍 Admin: view any user trust profile' })
  async getUserTrustProfile(@Param('userId') userId: string) {
    return this.trustService.getTrustProfile(userId);
  }

  @Admin()
  @Post('admin/user/:userId/pardon')
  @ApiOperation({ summary: '✅ Admin: pardon a user (improve trust score)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
  async pardonUser(@Request() req: any, @Param('userId') userId: string, @Body() body: { reason: string }) {
    return this.trustService.pardonUser(userId, req.user.id, body.reason);
  }

  @Admin()
  @Post('admin/user/:userId/warn')
  @ApiOperation({ summary: '⚠️ Admin: warn a user (reduce trust score)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
  async warnUser(@Request() req: any, @Param('userId') userId: string, @Body() body: { reason: string }) {
    return this.trustService.warnUser(userId, req.user.id, body.reason);
  }

  @Admin()
  @Get('admin/fraud/:userId')
  @ApiOperation({ summary: '🕵️ Admin: check fraud patterns for a user' })
  async checkFraud(@Param('userId') userId: string) {
    return this.trustService.checkFraudPatterns(userId);
  }

  @Admin()
  @Post('admin/fraud/:userId/alert')
  @ApiOperation({ summary: '🚨 Admin: manually trigger fraud alert for a user' })
  @ApiBody({ schema: { type: 'object', properties: { patterns: { type: 'array', items: { type: 'string' } }, severity: { type: 'string', enum: ['warning', 'critical'] } }, required: ['patterns', 'severity'] } })
  async triggerFraudAlert(
    @Param('userId') userId: string,
    @Body() body: { patterns: string[]; severity: 'warning' | 'critical' },
  ) {
    return this.trustService.emitFraudAlert(userId, body.patterns, body.severity);
  }
}
