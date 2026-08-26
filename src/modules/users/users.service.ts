import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ─── GET FULL PROFILE ─────────────────────────────
  async getProfile(userId: string) {
    console.log(`[UsersService] GetProfile: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        onboardingCompleted: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        preference: {
          select: {
            theme: true,
            language: true,
            sound: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`[UsersService] GetProfile ERROR: User ${userId} not found`);
      throw new NotFoundException('User not found');
    }

    console.log(`[UsersService] GetProfile: OK for ${user.username}`);
    return user;
  }

  // ─── UPDATE PROFILE ───────────────────────────────
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    console.log(`[UsersService] UpdateProfile: userId=${userId}`, dto);

    // Check username uniqueness + history
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existing && existing.id !== userId) {
        console.log(`[UsersService] UpdateProfile ERROR: Username ${dto.username} already taken`);
        throw new ConflictException('Username already taken');
      }

      // Check username history (30 day cooldown)
      const recentHistory = await this.prisma.usernameHistory.findFirst({
        where: {
          userId,
          oldUsername: dto.username,
          expiresAt: { gt: new Date() },
        },
      });

      if (recentHistory) {
        throw new ConflictException(
          'This username was recently used by you and is on cooldown',
        );
      }

      // Get current username before changing
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      if (currentUser && currentUser.username !== dto.username) {
        // Save old username to history (30 days)
        await this.prisma.usernameHistory.create({
          data: {
            userId,
            oldUsername: currentUser.username,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        console.log(`[UsersService] Username history saved: ${currentUser.username} → ${dto.username}`);
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`[UsersService] UpdateProfile: OK for ${user.username}`);
    return user;
  }

  // ─── UPLOAD AVATAR ────────────────────────────────
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    console.log(`[UsersService] UploadAvatar: userId=${userId}`);

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP, GIF',
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 5MB');
    }

    // Get current user to check for existing avatar
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true },
    });

    // Delete old avatar from Cloudinary
    if (currentUser?.avatarPublicId) {
      await this.cloudinary.deleteImage(currentUser.avatarPublicId);
    }

    // Upload new avatar
    const result = await this.cloudinary.uploadImage(file, 'boti/avatars');

    // Update user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: result.url,
        avatarPublicId: result.publicId,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    console.log(`[UsersService] UploadAvatar: OK - ${result.url}`);
    return user;
  }

  // ─── DELETE AVATAR ────────────────────────────────
  async deleteAvatar(userId: string) {
    console.log(`[UsersService] DeleteAvatar: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true },
    });

    if (user?.avatarPublicId) {
      await this.cloudinary.deleteImage(user.avatarPublicId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
        avatarPublicId: null,
      },
    });

    console.log(`[UsersService] DeleteAvatar: OK`);
    return { message: 'Avatar deleted successfully' };
  }

  // ─── DELETE ACCOUNT (GDPR) ───────────────────────
  async deleteAccount(userId: string) {
    console.log(`[UsersService] DeleteAccount: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete avatar from Cloudinary
    if (user.avatarPublicId) {
      await this.cloudinary.deleteImage(user.avatarPublicId);
    }

    // Soft delete - mark as deleted, anonymize data
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.com`,
        username: `deleted_${userId}`,
        passwordHash: null,
        googleId: null,
        avatarUrl: null,
        avatarPublicId: null,
        bio: null,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        deletedAt: new Date(),
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    console.log(`[UsersService] DeleteAccount: OK - ${user.email} soft deleted`);
    return { message: 'Account deleted successfully' };
  }

  // ─── GET PREFERENCES ──────────────────────────────
  async getPreferences(userId: string) {
    console.log(`[UsersService] GetPreferences: userId=${userId}`);

    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    // Auto-create default preferences if not exist
    if (!prefs) {
      console.log(`[UsersService] GetPreferences: Creating default prefs for ${userId}`);
      prefs = await this.prisma.userPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  // ─── UPDATE PREFERENCES ───────────────────────────
  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    console.log(`[UsersService] UpdatePreferences: userId=${userId}`, dto);

    // Ensure preferences exist
    await this.getPreferences(userId);

    const prefs = await this.prisma.userPreference.update({
      where: { userId },
      data: {
        ...(dto.theme !== undefined && { theme: dto.theme }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.sound !== undefined && { sound: dto.sound }),
        ...(dto.notifications !== undefined && { notifications: dto.notifications }),
      },
    });

    console.log(`[UsersService] UpdatePreferences: OK`);
    return prefs;
  }

  // ─── GET STATISTICS ───────────────────────────────
  async getStats(userId: string) {
    console.log(`[UsersService] GetStats: userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count refresh tokens (active sessions)
    const activeSessions = await this.prisma.refreshToken.count({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    // Count activity logs
    const totalActivities = await this.prisma.activityLog.count({
      where: { userId },
    });

    // Calculate account age in days
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Days since last login
    const daysSinceLastLogin = user.lastLoginAt
      ? Math.floor(
          (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

    const stats = {
      userId: user.id,
      username: user.username,
      accountAgeDays,
      daysSinceLastLogin,
      activeSessions,
      totalActivities,
      registeredAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    console.log(`[UsersService] GetStats: OK - ${accountAgeDays} days old, ${activeSessions} sessions, ${totalActivities} activities`);
    return stats;
  }

  // ─── ACTIVITY LOG ─────────────────────────────────
  async logActivity(userId: string, action: string, details?: any) {
    console.log(`[UsersService] LogActivity: ${action} for ${userId}`);

    await this.prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  }

  async getActivityLog(userId: string, limit: number = 20) {
    console.log(`[UsersService] GetActivityLog: userId=${userId}, limit=${limit}`);

    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
      },
    });

    return logs;
  }

  // ─── ONBOARDING ───────────────────────────────────
  async completeOnboarding(userId: string) {
    console.log(`[UsersService] CompleteOnboarding: userId=${userId}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    // Log the activity
    await this.logActivity(userId, 'onboarding_completed');

    console.log(`[UsersService] CompleteOnboarding: OK`);
    return { message: 'Onboarding completed successfully' };
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true },
    });

    return { onboardingCompleted: user?.onboardingCompleted || false };
  }
}
