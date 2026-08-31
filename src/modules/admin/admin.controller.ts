import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { AdminService } from './admin.service';
import { Admin } from '../auth/guards/admin.guard';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ═══════════════════════════════════════════════════
  // 🏁 FIRST ADMIN (Public — no auth needed)
  // ═══════════════════════════════════════════════════

  @Public()
  @Post('promote-first')
  @ApiOperation({
    summary: '🏁 Promote yourself as the first admin (only works when NO admins exist)',
    description: 'Public endpoint. Send your auth token in the header. Only works if zero admins exist.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'First admin promoted to superadmin' })
  @ApiResponse({ status: 400, description: 'Admin already exists' })
  async promoteFirst(@Request() req: any) {
    return this.adminService.promoteFirstAdmin(req.user.id);
  }

  // ═══════════════════════════════════════════════════
  // 📊 DASHBOARD
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('dashboard')
  @ApiOperation({ summary: '📊 Admin dashboard with metrics + audit trail' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ═══════════════════════════════════════════════════
  // 📋 AUDIT LOG
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('audit-log')
  @ApiOperation({ summary: '📋 Admin audit log — who did what, when' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'adminId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  async getAuditLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.getAuditLog({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      adminId,
      action,
    });
  }

  // ═══════════════════════════════════════════════════
  // 👤 USER MANAGEMENT
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('users')
  @ApiOperation({ summary: '👤 List all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: ['user', 'admin', 'superadmin'] })
  @ApiQuery({ name: 'sort', required: false, type: String })
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sort') sort?: string,
  ) {
    return this.adminService.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search, role, sort,
    });
  }

  @Admin()
  @Get('users/:userId')
  @ApiOperation({ summary: '👤 Get detailed user profile' })
  async getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Admin()
  @Patch('users/:userId/role')
  @ApiOperation({
    summary: '👑 Change user role — REQUIRES 2FA CONFIRMATION',
    description: 'Step 1: Call without confirmationToken → get token. Step 2: Call with confirmationToken → execute.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
        confirmationToken: { type: 'string', description: 'Required for execution. First call without it to generate.' },
      },
      required: ['role'],
    },
  })
  async updateUserRole(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { role: 'user' | 'admin' | 'superadmin'; confirmationToken?: string },
  ) {
    return this.adminService.updateUserRole(req.user.id, userId, body.role, body.confirmationToken);
  }

  @Admin()
  @Delete('users/:userId')
  @ApiOperation({
    summary: '🗑️ Soft-delete user — REQUIRES 2FA CONFIRMATION',
    description: 'Step 1: Call without confirmationToken → get token. Step 2: Call with confirmationToken → execute.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        confirmationToken: { type: 'string', description: 'Required for execution. First call without it to generate.' },
      },
    },
  })
  async deleteUser(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { confirmationToken?: string },
  ) {
    return this.adminService.deleteUser(req.user.id, userId, body.confirmationToken);
  }

  // ═══════════════════════════════════════════════════
  // 🎯 QUEST MANAGEMENT
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('quests')
  @ApiOperation({ summary: '🎯 List all quests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  async getAllQuests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getAllQuests({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      category, difficulty, type, isActive,
    });
  }

  @Admin()
  @Post('quests')
  @ApiOperation({ summary: '➕ Create new quest' })
  async createQuest(@Request() req: any, @Body() body: any) {
    return this.adminService.createQuest(req.user.id, body);
  }

  @Admin()
  @Patch('quests/:questId')
  @ApiOperation({ summary: '✏️ Update quest' })
  async updateQuest(
    @Request() req: any,
    @Param('questId') questId: string,
    @Body() body: any,
  ) {
    return this.adminService.updateQuest(req.user.id, questId, body);
  }

  @Admin()
  @Patch('quests/:questId/toggle')
  @ApiOperation({ summary: '🔄 Toggle quest active/inactive' })
  async toggleQuestActive(
    @Request() req: any,
    @Param('questId') questId: string,
  ) {
    return this.adminService.toggleQuestActive(req.user.id, questId);
  }

  @Admin()
  @Delete('quests/:questId')
  @ApiOperation({ summary: '🗑️ Delete quest' })
  async deleteQuest(
    @Request() req: any,
    @Param('questId') questId: string,
  ) {
    return this.adminService.deleteQuest(req.user.id, questId);
  }

  // ═══════════════════════════════════════════════════
  // 📸 VERIFICATION MANAGEMENT
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('verifications')
  @ApiOperation({ summary: '📸 List ALL verifications from ALL users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'evidenceType', required: false, type: String })
  async getAllVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('evidenceType') evidenceType?: string,
  ) {
    return this.adminService.getAllVerifications({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status, userId, evidenceType,
    });
  }

  @Admin()
  @Post('verifications/batch-review')
  @ApiOperation({ summary: '🔍 Batch review — approve/reject from MULTIPLE users' })
  async batchReview(
    @Request() req: any,
    @Body() body: {
      reviews: Array<{ verificationId: string; decision: 'verified' | 'rejected'; note?: string }>;
    },
  ) {
    return this.adminService.batchReview(
      (body.reviews || []).slice(0, 50),
      req.user.id,
    );
  }

  @Admin()
  @Post('verifications/batch-analyze')
  @ApiOperation({ summary: '🤖 Batch analyze — view evidence from MULTIPLE users' })
  async batchAnalyze(
    @Body() body: {
      items: Array<{ verificationId: string; userId: string }>;
    },
  ) {
    return this.adminService.batchAnalyzeByAdmin(
      (body.items || []).slice(0, 30),
    );
  }

  // ═══════════════════════════════════════════════════
  // 📈 ANALYTICS
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('analytics')
  @ApiOperation({ summary: '📈 Analytics by period' })
  @ApiQuery({ name: 'period', required: false, enum: ['24h', '7d', '30d', '90d'] })
  async getAnalytics(@Query('period') period?: string) {
    return this.adminService.getAnalytics({ period });
  }

  // ═══════════════════════════════════════════════════
  // 🗂️ CATEGORY MANAGEMENT
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('categories')
  @ApiOperation({ summary: '🗂️ Get all categories with quest counts' })
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Admin()
  @Patch('categories/:categoryId')
  @ApiOperation({ summary: '🗂️ Update category settings' })
  async updateCategory(
    @Request() req: any,
    @Param('categoryId') categoryId: string,
    @Body() data: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.adminService.updateCategory(req.user.id, categoryId, data);
  }

  // ═══════════════════════════════════════════════════
  // 📝 REPORT MANAGEMENT
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('reports')
  @ApiOperation({ summary: '📝 Get content reports' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'reviewed', 'resolved', 'dismissed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getReports(status, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Admin()
  @Get('reports/stats')
  @ApiOperation({ summary: '📝 Get report statistics' })
  async getReportStats() {
    return this.adminService.getReportStats();
  }

  @Admin()
  @Patch('reports/:reportId')
  @ApiOperation({ summary: '📝 Review a report' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['reviewed', 'resolved', 'dismissed'] }, note: { type: 'string' } } } })
  async reviewReport(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Body('status') status: string,
    @Body('note') note?: string,
  ) {
    return this.adminService.reviewReport(req.user.id, reportId, status, note);
  }

  // ═══════════════════════════════════════════════════
  // 🏆 RANKINGS MANAGEMENT
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('rankings/config')
  @ApiOperation({ summary: '🏆 Get rankings configuration' })
  async getRankingsConfig() {
    return this.adminService.getRankingsConfig();
  }

  @Admin()
  @Patch('rankings/config')
  @ApiOperation({ summary: '🏆 Update rankings configuration' })
  async updateRankingsConfig(@Request() req: any, @Body() config: any) {
    return this.adminService.updateRankingsConfig(req.user.id, config);
  }

  @Admin()
  @Post('rankings/reset-weekly')
  @ApiOperation({ summary: '🏆 Reset weekly rankings' })
  async resetWeeklyRankings(@Request() req: any) {
    return this.adminService.resetWeeklyRankings(req.user.id);
  }

  // ═══════════════════════════════════════════════════
  // 🪙 REWARDS CONFIGURATION
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('rewards/config')
  @ApiOperation({ summary: '🪙 Get rewards configuration (multipliers, bonuses)' })
  async getRewardsConfig() {
    return this.adminService.getRewardsConfig();
  }

  @Admin()
  @Patch('rewards/config')
  @ApiOperation({ summary: '🪙 Update rewards configuration' })
  async updateRewardsConfig(@Request() req: any, @Body() config: any) {
    return this.adminService.updateRewardsConfig(req.user.id, config);
  }

  // ═══════════════════════════════════════════════════
  // 🛡️ CONTENT MODERATION
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('moderation/diary')
  @ApiOperation({ summary: '🛡️ Get diary entries for moderation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false })
  async getDiaryForModeration(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getDiaryEntries(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, userId);
  }

  @Admin()
  @Patch('moderation/diary/:entryId/hide')
  @ApiOperation({ summary: '🛡️ Hide a diary entry' })
  async hideDiaryEntry(
    @Request() req: any,
    @Param('entryId') entryId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.hideDiaryEntry(req.user.id, entryId, reason);
  }

  @Admin()
  @Get('moderation/activity')
  @ApiOperation({ summary: '🛡️ Get activity feed for moderation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivityForModeration(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getActivityFeed(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Admin()
  @Delete('moderation/activity/:activityId')
  @ApiOperation({ summary: '🛡️ Remove an activity' })
  async hideActivity(
    @Request() req: any,
    @Param('activityId') activityId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.hideActivity(req.user.id, activityId, reason);
  }

  // ═══════════════════════════════════════════════════
  // 🔍 FRAUD / SUSPICIOUS ACTIVITY DASHBOARD
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('fraud/dashboard')
  @ApiOperation({ summary: '🔍 Fraud and suspicious activity dashboard' })
  async getFraudDashboard() {
    return this.adminService.getFraudDashboard();
  }

  // ═══════════════════════════════════════════════════
  // ⚙️ SYSTEM CONFIG
  // ═══════════════════════════════════════════════════

  @Admin()
  @Get('config')
  @ApiOperation({ summary: '⚙️ Get all system config' })
  @ApiQuery({ name: 'category', required: false })
  async getSystemConfig(@Query('category') category?: string) {
    return this.adminService.getSystemConfig(category);
  }

  @Admin()
  @Patch('config/:key')
  @ApiOperation({ summary: '⚙️ Update system config' })
  async updateSystemConfig(
    @Request() req: any,
    @Param('key') key: string,
    @Body('value') value: any,
    @Body('description') description?: string,
  ) {
    return this.adminService.updateSystemConfig(req.user.id, key, value, description);
  }
}
