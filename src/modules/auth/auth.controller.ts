import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Public } from './guards/public.decorator';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── REGISTER ──────────────────────────────────────
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'botifan@boti.com',
          username: 'botifan',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        accessToken: 'eyJ...',
        refreshToken: 'eyJ...',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ─── LOGIN ─────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'botifan@boti.com',
          username: 'botifan',
          avatarUrl: null,
          emailVerified: true,
        },
        accessToken: 'eyJ...',
        refreshToken: 'eyJ...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Request() req: any,
  ) {
    return this.authService.login(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
  }

  // ─── GOOGLE OAuth ─────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Google login successful',
  })
  async googleAuthCallback(@Request() req: any) {
    const result = await this.authService.googleLogin(req.user);
    // In production, redirect to frontend with tokens as query params
    // or set in httpOnly cookies
    return result;
  }

  // ─── REFRESH TOKENS ───────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  @ApiOperation({
    summary: 'Refresh access and refresh tokens (rotation)',
    description:
      'Sends the current refresh token in the Authorization header (Bearer). Returns new token pair and invalidates the old refresh token.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully (rotation)',
    schema: {
      example: {
        accessToken: 'eyJ...(new)',
        refreshToken: 'eyJ...(new)',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  async refreshTokens(@Request() req: any) {
    return this.authService.refreshTokens(
      req.user.refreshTokenId,
      req.user.user.id,
    );
  }

  // ─── LOGOUT ────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout (revoke current refresh token)',
    description: 'Revokes the refresh token sent in the Authorization header.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req: any) {
    // Extract refresh token from header
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader?.replace('Bearer ', '');

    // Find and revoke the token
    if (refreshToken) {
      const storedToken = await this.authService['prisma'].refreshToken.findFirst({
        where: { token: refreshToken },
      });
      if (storedToken) {
        return this.authService.logout(storedToken.id);
      }
    }

    return { message: 'Logged out successfully' };
  }

  // ─── LOGOUT ALL DEVICES ───────────────────────────
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from all devices',
    description: 'Revokes ALL refresh tokens for the current user.',
  })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@Request() req: any) {
    return this.authService.logoutAll(req.user.id);
  }

  // ─── FORGOT PASSWORD ──────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent (or email not found - same response)',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // ─── RESET PASSWORD ───────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // ─── VERIFY EMAIL ─────────────────────────────────
  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiQuery({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // ─── RESEND VERIFICATION ──────────────────────────
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent (or email not found)',
  })
  async resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerification(dto.email);
  }

  // ─── GET ME (Protected) ───────────────────────────
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
