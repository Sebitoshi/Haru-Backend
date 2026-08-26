import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BotiService } from '../boti/boti.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private botiService: BotiService,
  ) {}

  // ─── REGISTER ───────────────────────────────────────
  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        emailVerifyToken,
      },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // TODO: Send verification email in production
    console.log(`📧 Email verification token for ${dto.email}: ${emailVerifyToken}`);

    // Auto-create BOTI for new user
    console.log(`[AuthService] Creating BOTI for new user ${user.username}`);
    await this.botiService.getBoti(user.id);

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user,
      ...tokens,
    };
  }

  // ─── LOGIN ──────────────────────────────────────────
  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      userAgent,
      ip,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  // ─── GOOGLE OAuth ──────────────────────────────────
  async googleLogin(profile: any) {
    const { googleId, email, name, avatar } = profile;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      // Update Google ID if user registered with email/password
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: avatar || user.avatarUrl },
        });
      }
    } else {
      // Create new user from Google
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let counter = 1;

      // Ensure unique username
      while (
        await this.prisma.user.findUnique({ where: { username } })
      ) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          googleId,
          avatarUrl: avatar,
          emailVerified: true, // Google emails are verified
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  // ─── REFRESH TOKEN (Rotation) ─────────────────────
  async refreshTokens(refreshTokenId: string, userId: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: refreshTokenId },
    });

    if (!storedToken || storedToken.revoked) {
      // Token reuse detected! Revoke ALL tokens for this user
      if (storedToken?.userId) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { revoked: true },
        });
      }
      throw new UnauthorizedException('Refresh token revoked or reused');
    }

    // Revoke the old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { revoked: true },
    });

    // Generate new pair
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    return tokens;
  }

  // ─── LOGOUT ────────────────────────────────────────
  async logout(refreshTokenId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { id: refreshTokenId },
      data: { revoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  // ─── LOGOUT ALL DEVICES ───────────────────────────
  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    return { message: 'Logged out from all devices' };
  }

  // ─── FORGOT PASSWORD ──────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account with that email exists, a reset link has been sent',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // TODO: Send reset email in production
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);

    return {
      message:
        'If an account with that email exists, a reset link has been sent',
    };
  }

  // ─── RESET PASSWORD ───────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Revoke all refresh tokens (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    return { message: 'Password reset successfully' };
  }

  // ─── VERIFY EMAIL ─────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  // ─── RESEND VERIFICATION ──────────────────────────
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        message:
          'If an account with that email exists, a verification link has been sent',
      };
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    const emailVerifyToken = randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken },
    });

    // TODO: Send verification email in production
    console.log(`📧 New verification token for ${email}: ${emailVerifyToken}`);

    return {
      message:
        'If an account with that email exists, a verification link has been sent',
    };
  }

  // ─── GET CURRENT USER ─────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ─── PRIVATE: Generate Token Pair ─────────────────
  private async generateTokenPair(
    userId: string,
    email: string,
    userAgent?: string,
    ip?: string,
  ) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, jti: randomBytes(16).toString('hex') } as any,
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m') as any,
        },
      ),
      this.jwtService.signAsync(
        { ...payload, jti: randomBytes(16).toString('hex') } as any,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
        },
      ),
    ]);

    // Store refresh token in DB
    const decoded = this.jwtService.decode(refreshToken) as any;
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        userAgent,
        ip,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
