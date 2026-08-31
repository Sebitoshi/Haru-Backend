import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGateway } from './admin.gateway';
import { EmailService } from '../common/email/email.service';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// ACTIONS THAT REQUIRE 2FA CONFIRMATION
// ═══════════════════════════════════════════════════════════
const DESTRUCTIVE_ACTIONS = [
  'admin_delete_user',
  'admin_role_change',
  'admin_delete_quest',
  'admin_promote_user',
];

// ═══════════════════════════════════════════════════════════
// ADMIN ACTION → CONFIRMATION TOKEN
// ═══════════════════════════════════════════════════════════
interface PendingConfirmation {
  adminId: string;
  action: string;
  targetId: string;
  payload: any;
  expiresAt: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // In-memory confirmation tokens (expire in 60 seconds)
  private pendingConfirmations = new Map<string, PendingConfirmation>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private gateway: AdminGateway,
    private emailService: EmailService,
  ) {
    // Cleanup expired confirmations every 30s
    setInterval(() => this.cleanupConfirmations(), 30_000);
  }

  // ═══════════════════════════════════════════════════
  // 🔐 2FA CONFIRMATION SYSTEM
  // ═══════════════════════════════════════════════════

  /**
   * Generate a short-lived confirmation token for destructive actions.
   * Flow:
   * 1. Admin calls action → gets pending confirmation + token
   * 2. Admin confirms with token → action executes
   */
  async generateConfirmation(
    adminId: string,
    action: string,
    targetId: string,
    payload: any,
  ): Promise<{ confirmationToken: string; expiresIn: number; message: string }> {
    if (!DESTRUCTIVE_ACTIONS.includes(action)) {
      throw new BadRequestException(`Action "${action}" does not require confirmation`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60_000); // 60 seconds

    this.pendingConfirmations.set(token, {
      adminId,
      action,
      targetId,
      payload,
      expiresAt,
    });

    this.logger.log(`Admin: Confirmation generated for action "${action}" on target ${targetId}`);

    return {
      confirmationToken: token,
      expiresIn: 60,
      message: `⚠️ Confirmation required. Use this token within 60 seconds to confirm the action.`,
    };
  }

  /**
   * Validate a confirmation token
   */
  private validateConfirmation(token: string, adminId: string, action: string): PendingConfirmation {
    const confirmation = this.pendingConfirmations.get(token);

    if (!confirmation) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    if (confirmation.adminId !== adminId) {
      throw new UnauthorizedException('Confirmation token belongs to a different admin');
    }

    if (confirmation.action !== action) {
      throw new BadRequestException(`Confirmation token is for action "${confirmation.action}", not "${action}"`);
    }

    if (new Date() > confirmation.expiresAt) {
      this.pendingConfirmations.delete(token);
      throw new BadRequestException('Confirmation token expired. Generate a new one.');
    }

    // Consume the token
    this.pendingConfirmations.delete(token);
    return confirmation;
  }

  private cleanupConfirmations() {
    const now = new Date();
    for (const [token, conf] of this.pendingConfirmations) {
      if (now > conf.expiresAt) {
        this.pendingConfirmations.delete(token);
      }
    }
  }

  // ═══════════════════════════════════════════════════
  // 🏁 PROMOTE FIRST ADMIN
  // ═══════════════════════════════════════════════════

  /**
   * Promote the first admin when NO admins exist.
   * Public endpoint — no auth needed (but requires email verification).
   */
  async promoteFirstAdmin(userId: string) {
    this.logger.log(`PromoteFirst: userId=${userId}`);

    // Check if any admin exists
    const adminCount = await this.prisma.user.count({
      where: { role: { in: ['admin', 'superadmin'] } },
    });

    if (adminCount > 0) {
      throw new BadRequestException(
        `Admin already exists (${adminCount} admins found). Use the admin panel to promote new admins.`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Promote to superadmin (first admin gets superadmin)
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'superadmin' },
      select: { id: true, username: true, role: true },
    });

    await this.logAdminAction(userId, 'admin_promoted_first', userId, {
      username: user.username,
      email: user.email,
    });

    // Broadcast via WebSocket
    this.gateway.pushEvent('admin-promoted', {
      userId: updated.id,
      username: updated.username,
      role: updated.role,
      timestamp: new Date().toISOString(),
    });

    // 📧 Send welcome admin email
    this.emailService.sendAdminActionEmail(user.email, {
      username: user.username,
      email: user.email,
      action: 'role_promoted',
      details: '🎉 ¡Eres el primer administrador de Haru! Tienes acceso total a la plataforma.',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return {
      user: updated,
      message: `🎉 You are the first admin! Role: superadmin. Welcome to the command center.`,
    };
  }

  // ═══════════════════════════════════════════════════
  // 📊 DASHBOARD
  // ═══════════════════════════════════════════════════

  async getDashboard() {
    this.logger.log('Admin: Loading dashboard stats');

    const [
      totalUsers,
      activeUsers,
      totalQuests,
      completedQuests,
      totalVerifications,
      pendingReviews,
      totalXpDistributed,
      totalCoinsDistributed,
      usersByRole,
      questsByCategory,
      recentActivity,
      recentAdminActions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.quest.count({ where: { isActive: true } }),
      this.prisma.userQuest.count({ where: { status: 'completed' } }),
      this.prisma.questVerification.count(),
      this.prisma.questVerification.count({ where: { status: 'needs_review' } }),
      this.prisma.userQuest.findMany({
        where: { status: 'completed' },
        select: { quest: { select: { xpReward: true } } },
      }).then((uqs) => uqs.reduce((sum, uq) => sum + uq.quest.xpReward, 0)),
      this.prisma.userQuest.findMany({
        where: { status: 'completed' },
        select: { quest: { select: { coinsReward: true } } },
      }).then((uqs) => uqs.reduce((sum, uq) => sum + uq.quest.coinsReward, 0)),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.prisma.quest.groupBy({
        by: ['category'],
        _count: true,
        where: { isActive: true },
      }),
      this.prisma.activityLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true } } },
      }),
      // Admin-specific audit log
      this.prisma.activityLog.findMany({
        where: { action: { startsWith: 'admin_' } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true } } },
      }),
    ]);

    const completionRate = totalQuests > 0
      ? Math.round((completedQuests / totalQuests) * 100)
      : 0;

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalQuests,
        completedQuests,
        completionRate: `${completionRate}%`,
        totalVerifications,
        pendingReviews,
        totalXpDistributed,
        totalCoinsDistributed,
      },
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
      questsByCategory: questsByCategory.map((c) => ({ category: c.category, count: c._count })),
      recentActivity,
      recentAdminActions,
    };
  }

  // ═══════════════════════════════════════════════════
  // 📋 AUDIT LOG — VIEW ALL ADMIN ACTIONS
  // ═══════════════════════════════════════════════════

  async getAuditLog(params: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
  }) {
    const { page = 1, limit = 30, adminId, action } = params;
    const skip = (page - 1) * limit;

    const where: any = { action: { startsWith: 'admin_' } };
    if (adminId) where.userId = adminId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true } } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      auditLog: logs.map((log) => ({
        id: log.id,
        admin: log.user,
        action: log.action,
        details: log.details,
        timestamp: log.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════
  // 👤 USER MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sort?: string;
  }) {
    const { page = 1, limit = 20, search, role, sort = 'createdAt' } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatarUrl: true,
          emailVerified: true,
          onboardingCompleted: true,
          createdAt: true,
          lastLoginAt: true,
          streak: { select: { currentStreak: true, longestStreak: true } },
          _count: { select: { userQuests: true, verifications: true, badges: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        stats: {
          questsCompleted: u._count.userQuests,
          verifications: u._count.verifications,
          badges: u._count.badges,
          currentStreak: u.streak?.currentStreak || 0,
          longestStreak: u.streak?.longestStreak || 0,
        },
        _count: undefined,
        streak: undefined,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        bio: true,
        emailVerified: true,
        onboardingCompleted: true,
        createdAt: true,
        lastLoginAt: true,
        streak: true,
        preference: true,
        _count: {
          select: {
            userQuests: true,
            verifications: true,
            badges: true,
            activityLogs: true,
            refreshTokens: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const [completedQuests, xpSum, coinsSum, recentActivity, recentVerifications] =
      await Promise.all([
        this.prisma.userQuest.count({ where: { userId, status: 'completed' } }),
        this.prisma.userQuest.findMany({
          where: { userId, status: 'completed' },
          select: { quest: { select: { xpReward: true } } },
        }).then((uqs) => uqs.reduce((s, u) => s + u.quest.xpReward, 0)),
        this.prisma.userQuest.findMany({
          where: { userId, status: 'completed' },
          select: { quest: { select: { coinsReward: true } } },
        }).then((uqs) => uqs.reduce((s, u) => s + u.quest.coinsReward, 0)),
        this.prisma.activityLog.findMany({
          where: { userId },
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.questVerification.findMany({
          where: { userId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { quest: { select: { title: true, category: true } } },
        }),
      ]);

    return {
      ...user,
      stats: {
        completedQuests,
        totalXp: xpSum,
        totalCoins: coinsSum,
        verifications: user._count.verifications,
        badges: user._count.badges,
      },
      recentActivity,
      recentVerifications,
      _count: undefined,
    };
  }

  /**
   * Change user role — requires 2FA confirmation
   */
  async updateUserRole(
    adminId: string,
    userId: string,
    role: 'user' | 'admin' | 'superadmin',
    confirmationToken?: string,
  ) {
    this.logger.log(`Admin: Changing role of ${userId} to ${role} (admin: ${adminId})`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === role) {
      throw new BadRequestException(`User already has role "${role}"`);
    }

    // Prevent demoting yourself
    if (userId === adminId && role === 'user') {
      throw new BadRequestException('Cannot demote yourself from admin');
    }

    // 2FA confirmation
    if (!confirmationToken) {
      return this.generateConfirmation(adminId, 'admin_role_change', userId, { role });
    }

    this.validateConfirmation(confirmationToken, adminId, 'admin_role_change');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });

    await this.logAdminAction(adminId, 'admin_role_change', userId, {
      oldRole: user.role,
      newRole: role,
      username: user.username,
    });

    // Broadcast via WebSocket
    this.gateway.pushEvent('admin-action', {
      action: 'role_change',
      admin: adminId,
      target: userId,
      details: { oldRole: user.role, newRole: role },
      timestamp: new Date().toISOString(),
    });

    // 📧 Send email notification (non-blocking)
    this.emailService.sendAdminActionEmail(user.email, {
      username: user.username,
      email: user.email,
      action: role === 'user' ? 'role_demoted' : 'role_promoted',
      details: `Rol anterior: ${user.role} → Nuevo rol: ${role}`,
      timestamp: new Date().toISOString(),
    }).catch(() => {}); // Never block admin action on email failure

    return { user: updated, message: `✅ Role changed: ${user.username} → ${role}` };
  }

  /**
   * Delete user — requires 2FA confirmation
   */
  async deleteUser(
    adminId: string,
    userId: string,
    confirmationToken?: string,
  ) {
    this.logger.log(`Admin: Soft-deleting user ${userId} (admin: ${adminId})`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Cannot delete yourself
    if (userId === adminId) {
      throw new BadRequestException('Cannot delete yourself');
    }

    // Cannot delete superadmins (only superadmins can)
    if (user.role === 'superadmin') {
      throw new BadRequestException('Cannot delete a superadmin');
    }

    // 2FA confirmation
    if (!confirmationToken) {
      return this.generateConfirmation(adminId, 'admin_delete_user', userId, {});
    }

    this.validateConfirmation(confirmationToken, adminId, 'admin_delete_user');

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    await this.logAdminAction(adminId, 'admin_delete_user', userId, {
      username: user.username,
      email: user.email,
    });

    this.gateway.pushEvent('admin-action', {
      action: 'delete_user',
      admin: adminId,
      target: userId,
      details: { username: user.username },
      timestamp: new Date().toISOString(),
    });

    // 📧 Send deletion notification email (non-blocking)
    this.emailService.sendAdminActionEmail(user.email, {
      username: user.username,
      email: user.email,
      action: 'user_deleted',
      details: 'Tu cuenta ha sido eliminada por un administrador. Si crees que esto es un error, contacta a soporte.',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return { message: `✅ User ${user.username} soft-deleted and tokens revoked` };
  }

  // ═══════════════════════════════════════════════════
  // 🎯 QUEST MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getAllQuests(params: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    type?: string;
    isActive?: string;
  }) {
    const { page = 1, limit = 20, category, difficulty, type, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [quests, total] = await Promise.all([
      this.prisma.quest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { userQuests: true, verifications: true } } },
      }),
      this.prisma.quest.count({ where }),
    ]);

    return {
      quests: quests.map((q) => ({
        ...q,
        stats: {
          totalAccepted: q._count.userQuests,
          totalVerifications: q._count.verifications,
        },
        _count: undefined,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createQuest(adminId: string, data: any) {
    this.logger.log(`Admin: Creating quest "${data.title}"`);

    const quest = await this.prisma.quest.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty || 'normal',
        duration: data.duration,
        xpReward: data.xpReward,
        coinsReward: data.coinsReward,
        type: data.type || 'regular',
        minLevel: data.minLevel || 1,
        totalSteps: data.totalSteps,
        weeklyReset: data.weeklyReset || false,
        requirements: data.requirements || undefined,
      },
    });

    await this.logAdminAction(adminId, 'admin_create_quest', quest.id, {
      title: quest.title,
      category: quest.category,
    });

    return { quest, message: `✅ Quest "${quest.title}" created` };
  }

  async updateQuest(adminId: string, questId: string, data: any) {
    this.logger.log(`Admin: Updating quest ${questId}`);

    const existing = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!existing) throw new NotFoundException('Quest not found');

    const quest = await this.prisma.quest.update({ where: { id: questId }, data });

    await this.logAdminAction(adminId, 'admin_update_quest', questId, {
      title: quest.title,
      changed: Object.keys(data),
    });

    return { quest, message: `✅ Quest "${quest.title}" updated` };
  }

  async toggleQuestActive(adminId: string, questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: { isActive: !quest.isActive },
    });

    await this.logAdminAction(adminId, 'admin_toggle_quest', questId, {
      title: quest.title,
      isActive: updated.isActive,
    });

    return {
      quest: updated,
      message: `✅ Quest "${updated.title}" ${updated.isActive ? 'activated' : 'deactivated'}`,
    };
  }

  async deleteQuest(adminId: string, questId: string) {
    this.logger.log(`Admin: Deleting quest ${questId}`);

    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    const userQuestCount = await this.prisma.userQuest.count({ where: { questId } });
    if (userQuestCount > 0) {
      await this.prisma.quest.update({ where: { id: questId }, data: { isActive: false } });
      await this.logAdminAction(adminId, 'admin_deactivate_quest', questId, {
        title: quest.title,
        reason: `${userQuestCount} user records`,
      });
      return { message: `⚠️ Quest has ${userQuestCount} user records — deactivated instead of deleted` };
    }

    await this.prisma.quest.delete({ where: { id: questId } });
    await this.logAdminAction(adminId, 'admin_delete_quest', questId, { title: quest.title });
    return { message: `🗑️ Quest "${quest.title}" permanently deleted` };
  }

  // ═══════════════════════════════════════════════════
  // 📸 VERIFICATION MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getAllVerifications(params: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    evidenceType?: string;
  }) {
    const { page = 1, limit = 20, status, userId, evidenceType } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (evidenceType) where.evidenceType = evidenceType;

    const [verifications, total] = await Promise.all([
      this.prisma.questVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true, avatarUrl: true } },
          quest: { select: { id: true, title: true, category: true, difficulty: true } },
        },
      }),
      this.prisma.questVerification.count({ where }),
    ]);

    return {
      verifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async batchReview(
    reviews: Array<{ verificationId: string; decision: 'verified' | 'rejected'; note?: string }>,
    reviewerId: string,
  ) {
    this.logger.log(`Admin: Batch review ${reviews.length} verifications`);

    const results = await Promise.all(
      reviews.map(async (review) => {
        try {
          const verification = await this.prisma.questVerification.findUnique({
            where: { id: review.verificationId },
            include: { quest: true },
          });

          if (!verification) {
            return { id: review.verificationId, success: false, error: 'Not found' };
          }

          await this.prisma.questVerification.update({
            where: { id: review.verificationId },
            data: {
              status: review.decision,
              reviewerId,
              reviewNote: review.note || null,
              reviewedAt: new Date(),
            },
          });

          if (review.decision === 'verified') {
            await this.prisma.userQuest.update({
              where: { id: verification.userQuestId },
              data: { status: 'completed', completedAt: new Date() },
            });
          }

          return { id: review.verificationId, success: true, status: review.decision };
        } catch (error) {
          return { id: review.verificationId, success: false, error: error.message };
        }
      }),
    );

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await this.logAdminAction(reviewerId, 'admin_batch_review', 'multiple', {
      total: reviews.length,
      succeeded,
      failed,
    });

    return {
      results,
      summary: { total: reviews.length, succeeded, failed },
      message: `✅ Batch review complete: ${succeeded} succeeded, ${failed} failed`,
    };
  }

  async batchAnalyzeByAdmin(items: Array<{ verificationId: string; userId: string }>) {
    this.logger.log(`Admin: Batch analyze ${items.length} verifications`);

    const verifications = await Promise.all(
      items.map(async (item) => {
        return this.prisma.questVerification.findUnique({
          where: { id: item.verificationId },
          include: {
            quest: { select: { title: true, category: true, description: true } },
            user: { select: { id: true, username: true } },
          },
        });
      }),
    );

    return {
      verifications: verifications.filter(Boolean).map((v) => ({
        id: v!.id,
        userId: v!.userId,
        username: v!.user.username,
        questTitle: v!.quest.title,
        questCategory: v!.quest.category,
        evidenceType: v!.evidenceType,
        status: v!.status,
        aiAnalysis: v!.aiAnalysis,
        submittedAt: v!.submittedAt,
      })),
      total: verifications.filter(Boolean).length,
    };
  }

  // ═══════════════════════════════════════════════════
  // 📈 ANALYTICS
  // ═══════════════════════════════════════════════════

  async getAnalytics(params: { period?: string }) {
    const { period = '7d' } = params;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [newUsers, completedQuests, verifications, rejectedVerifications, topUsers] =
      await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: startDate }, deletedAt: null } }),
        this.prisma.userQuest.count({ where: { status: 'completed', completedAt: { gte: startDate } } }),
        this.prisma.questVerification.count({ where: { createdAt: { gte: startDate } } }),
        this.prisma.questVerification.count({ where: { status: 'rejected', createdAt: { gte: startDate } } }),
        this.prisma.userQuest.groupBy({
          by: ['userId'],
          where: { status: 'completed', completedAt: { gte: startDate } },
          _count: true,
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }).then(async (groups) => {
          const userIds = groups.map((g) => g.userId);
          const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, email: true },
          });
          return groups.map((g) => ({
            ...users.find((u) => u.id === g.userId),
            completedCount: g._count,
          }));
        }),
      ]);

    return {
      period,
      startDate: startDate.toISOString(),
      stats: {
        newUsers,
        completedQuests,
        verifications,
        rejectedVerifications,
        approvalRate:
          verifications > 0
            ? `${Math.round(((verifications - rejectedVerifications) / verifications) * 100)}%`
            : 'N/A',
      },
      topUsers,
    };
  }

  // ═══════════════════════════════════════════════════
  // 📋 AUDIT LOG HELPER
  // ═══════════════════════════════════════════════════

  private async logAdminAction(
    adminId: string,
    action: string,
    targetId: string,
    details?: any,
  ) {
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action,
        details: {
          targetId,
          ...details,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════
  // 🗂️ CATEGORY MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getCategories() {
    const categories = [
      { id: 'nature', emoji: '🌿', name: 'Naturaleza', description: 'Actividades al aire libre' },
      { id: 'creativity', emoji: '🎨', name: 'Creatividad', description: 'Actividades creativas' },
      { id: 'kindness', emoji: '❤️', name: 'Bondad', description: 'Actos de bondad' },
      { id: 'learning', emoji: '🧠', name: 'Aprendizaje', description: 'Aprendizaje' },
      { id: 'movement', emoji: '🏃', name: 'Movimiento', description: 'Ejercicio y movimiento' },
      { id: 'social', emoji: '👥', name: 'Social', description: 'Interacción social' },
      { id: 'photography', emoji: '📸', name: 'Fotografía', description: 'Capturar momentos' },
      { id: 'relaxation', emoji: '🌙', name: 'Tranquilidad', description: 'Descanso y desconexión' },
      { id: 'adventure', emoji: '🗺️', name: 'Aventura', description: 'Exploración y aventura' },
    ];

    // Get quest count per category
    const questCounts = await this.prisma.quest.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    const countMap = new Map(questCounts.map((q) => [q.category, q._count.id]));

    return categories.map((c) => ({
      ...c,
      questCount: countMap.get(c.id as any) || 0,
      isActive: true,
    }));
  }

  async updateCategory(adminId: string, categoryId: string, data: { name?: string; description?: string; isActive?: boolean }) {
    this.logger.log(`UpdateCategory: ${categoryId}`);
    // Categories are enum-based, so we update the config
    const config = await this.prisma.systemConfig.upsert({
      where: { key: `category_${categoryId}` },
      update: { value: data, updatedBy: adminId },
      create: { key: `category_${categoryId}`, value: data, category: 'categories', updatedBy: adminId },
    });

    await this.logAdminAction(adminId, 'admin_category_update', categoryId, data);
    return { category: categoryId, config };
  }

  // ═══════════════════════════════════════════════════
  // 📝 REPORT MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getReports(status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    // Enrich with user info
    const userIds = [...new Set([
      ...reports.map((r) => r.reporterId),
      ...reports.filter((r) => r.targetUserId).map((r) => r.targetUserId!),
    ])];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      reports: reports.map((r) => ({
        ...r,
        reporter: userMap.get(r.reporterId) || null,
        targetUser: r.targetUserId ? userMap.get(r.targetUserId) || null : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewReport(adminId: string, reportId: string, status: string, note?: string) {
    this.logger.log(`ReviewReport: ${reportId} → ${status}`);

    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as any,
        reviewedBy: adminId,
        reviewNote: note || null,
        resolvedAt: status === 'resolved' ? new Date() : null,
      },
    });

    await this.logAdminAction(adminId, 'admin_report_review', reportId, { status, note });
    return updated;
  }

  async getReportStats() {
    const [pending, reviewed, resolved, dismissed, byReason] = await Promise.all([
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.report.count({ where: { status: 'reviewed' } }),
      this.prisma.report.count({ where: { status: 'resolved' } }),
      this.prisma.report.count({ where: { status: 'dismissed' } }),
      this.prisma.report.groupBy({ by: ['reason'], _count: { id: true } }),
    ]);

    return {
      pending,
      reviewed,
      resolved,
      dismissed,
      total: pending + reviewed + resolved + dismissed,
      byReason: byReason.map((r) => ({ reason: r.reason, count: r._count.id })),
    };
  }

  // ═══════════════════════════════════════════════════
  // 🏆 RANKINGS MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getRankingsConfig() {
    const config = await this.prisma.systemConfig.findUnique({ where: { key: 'rankings_config' } });
    return config?.value || {
      weeklyResetEnabled: true,
      resetDay: 'monday',
      topPositionsRewarded: true,
      rewards: { 1: { xp: 500, coins: 250 }, 2: { xp: 300, coins: 150 }, 3: { xp: 200, coins: 100 } },
    };
  }

  async updateRankingsConfig(adminId: string, config: any) {
    const updated = await this.prisma.systemConfig.upsert({
      where: { key: 'rankings_config' },
      update: { value: config, updatedBy: adminId },
      create: { key: 'rankings_config', value: config, category: 'rankings', updatedBy: adminId },
    });
    await this.logAdminAction(adminId, 'admin_rankings_config', 'system', config);
    return updated;
  }

  async resetWeeklyRankings(adminId: string) {
    this.logger.log('ResetWeeklyRankings');

    // Snapshot current week rankings before reset
    const topUsers = await this.prisma.user.findMany({
      orderBy: { totalXp: 'desc' },
      take: 100,
      select: { id: true, username: true, totalXp: true, level: true },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'admin_weekly_rankings_reset',
        details: {
          snapshot: topUsers.slice(0, 10),
          timestamp: new Date().toISOString(),
        },
      },
    });

    await this.logAdminAction(adminId, 'admin_weekly_rankings_reset', 'system', { topUsers: topUsers.length });
    return { message: 'Weekly rankings reset initiated', topUsersCount: topUsers.length };
  }

  // ═══════════════════════════════════════════════════
  // 🪙 REWARDS CONFIGURATION
  // ═══════════════════════════════════════════════════

  async getRewardsConfig() {
    const config = await this.prisma.systemConfig.findUnique({ where: { key: 'rewards_config' } });
    return config?.value || {
      xpMultiplier: 1.0,
      coinsMultiplier: 1.0,
      streakBonusEnabled: true,
      streakBonusPerDay: 0.10,
      streakBonusMax: 0.50,
      levelUpBonusCoins: true,
      levelUpBonusFormula: 'level * 10',
    };
  }

  async updateRewardsConfig(adminId: string, config: any) {
    const updated = await this.prisma.systemConfig.upsert({
      where: { key: 'rewards_config' },
      update: { value: config, updatedBy: adminId },
      create: { key: 'rewards_config', value: config, category: 'rewards', updatedBy: adminId },
    });
    await this.logAdminAction(adminId, 'admin_rewards_config', 'system', config);
    return updated;
  }

  // ═══════════════════════════════════════════════════
  // 🛡️ CONTENT MODERATION
  // ═══════════════════════════════════════════════════

  async getDiaryEntries(page: number = 1, limit: number = 20, userId?: string) {
    const where: any = { isHidden: false };
    if (userId) where.userId = userId;

    const [entries, total] = await Promise.all([
      this.prisma.diaryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      this.prisma.diaryEntry.count({ where }),
    ]);

    return {
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async hideDiaryEntry(adminId: string, entryId: string, reason: string) {
    const entry = await this.prisma.diaryEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');

    await this.prisma.diaryEntry.update({ where: { id: entryId }, data: { isHidden: true } });
    await this.logAdminAction(adminId, 'admin_hide_diary', entryId, { reason, userId: entry.userId });
    return { message: 'Entry hidden' };
  }

  async getActivityFeed(page: number = 1, limit: number = 20) {
    const [activities, total] = await Promise.all([
      this.prisma.friendActivity.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      this.prisma.friendActivity.count(),
    ]);

    return {
      activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async hideActivity(adminId: string, activityId: string, reason: string) {
    // Activities don't have isHidden, we delete them
    const activity = await this.prisma.friendActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    await this.prisma.friendActivity.delete({ where: { id: activityId } });
    await this.logAdminAction(adminId, 'admin_hide_activity', activityId, { reason, userId: activity.userId });
    return { message: 'Activity removed' };
  }

  // ═══════════════════════════════════════════════════
  // 🔍 FRAUD / SUSPICIOUS ACTIVITY DASHBOARD
  // ═══════════════════════════════════════════════════

  async getFraudDashboard() {
    // Users with most rejected verifications
    const rejectedAgg = await this.prisma.questVerification.groupBy({
      by: ['userId'],
      where: { status: 'rejected' },
      _count: { id: true },
    });

    const topRejected = rejectedAgg
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    const userIds = topRejected.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, level: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Users with low trust scores
    const lowTrust = await this.prisma.userTrust.findMany({
      where: { score: { lt: 30 } },
      include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } },
      orderBy: { score: 'asc' },
      take: 10,
    });

    // Recent fraud alerts
    const fraudAlerts = await this.prisma.activityLog.findMany({
      where: { action: 'fraud_alert' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Users with most reports
    const reportedAgg = await this.prisma.report.groupBy({
      by: ['targetUserId'],
      where: { targetUserId: { not: null } },
      _count: { id: true },
    });

    const topReported = reportedAgg
      .filter((r) => r.targetUserId)
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    const reportedUserIds = topReported.map((r) => r.targetUserId!);
    const reportedUsers = await this.prisma.user.findMany({
      where: { id: { in: reportedUserIds } },
      select: { id: true, username: true, email: true, level: true },
    });
    const reportedUserMap = new Map(reportedUsers.map((u) => [u.id, u]));

    return {
      rejectedVerifications: topRejected.map((r) => ({
        user: userMap.get(r.userId) || null,
        rejectedCount: r._count.id,
      })),
      lowTrustUsers: lowTrust.map((t) => ({
        userId: t.userId,
        username: t.user.username,
        email: t.user.email,
        avatarUrl: t.user.avatarUrl,
        score: t.score,
        level: t.level,
        fraudAttempts: t.fraudAttempts,
      })),
      fraudAlerts: fraudAlerts.map((a) => ({
        id: a.id,
        details: a.details,
        createdAt: a.createdAt,
      })),
      topReportedUsers: topReported.map((r) => ({
        user: reportedUserMap.get(r.targetUserId!) || null,
        reportCount: r._count.id,
      })),
      summary: {
        totalRejected: rejectedAgg.reduce((s, r) => s + r._count.id, 0),
        totalLowTrust: lowTrust.length,
        totalFraudAlerts: fraudAlerts.length,
        totalReports: reportedAgg.reduce((s, r) => s + r._count.id, 0),
      },
    };
  }

  // ═══════════════════════════════════════════════════
  // ⚙️ SYSTEM CONFIG
  // ═══════════════════════════════════════════════════

  async getSystemConfig(category?: string) {
    const where: any = {};
    if (category) where.category = category;

    const configs = await this.prisma.systemConfig.findMany({ where, orderBy: { key: 'asc' } });
    return configs;
  }

  async updateSystemConfig(adminId: string, key: string, value: any, description?: string) {
    const updated = await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: adminId, description },
      create: { key, value, category: 'general', updatedBy: adminId, description },
    });
    await this.logAdminAction(adminId, 'admin_config_update', key, { value });
    return updated;
  }
}
