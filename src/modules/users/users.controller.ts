import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET PROFILE ──────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user full profile' })
  @ApiResponse({ status: 200, description: 'Returns full user profile with preferences' })
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  // ─── UPDATE PROFILE ───────────────────────────────
  @Patch('me/profile')
  @ApiOperation({ summary: 'Update user profile (username, avatar, bio)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 409, description: 'Username already taken or on cooldown' })
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  // ─── UPLOAD AVATAR ────────────────────────────────
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload avatar image to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(req.user.id, file);
  }

  // ─── DELETE AVATAR ────────────────────────────────
  @Delete('me/avatar')
  @ApiOperation({ summary: 'Delete current avatar' })
  @ApiResponse({ status: 200, description: 'Avatar deleted successfully' })
  async deleteAvatar(@Request() req: any) {
    return this.usersService.deleteAvatar(req.user.id);
  }

  // ─── DELETE ACCOUNT (GDPR) ───────────────────────
  @Delete('me')
  @ApiOperation({ summary: 'Delete account (GDPR compliance)' })
  @ApiResponse({ status: 200, description: 'Account soft deleted' })
  async deleteAccount(@Request() req: any) {
    return this.usersService.deleteAccount(req.user.id);
  }

  // ─── GET PREFERENCES ──────────────────────────────
  @Get('me/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'Returns user preferences' })
  async getPreferences(@Request() req: any) {
    return this.usersService.getPreferences(req.user.id);
  }

  // ─── UPDATE PREFERENCES ───────────────────────────
  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(req.user.id, dto);
  }

  // ─── GET STATISTICS ───────────────────────────────
  @Get('me/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Returns user statistics' })
  async getStats(@Request() req: any) {
    return this.usersService.getStats(req.user.id);
  }

  // ─── GET ACTIVITY LOG ─────────────────────────────
  @Get('me/activity')
  @ApiOperation({ summary: 'Get recent activity log' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 20)' })
  @ApiResponse({ status: 200, description: 'Returns activity log' })
  async getActivityLog(
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getActivityLog(req.user.id, limit || 20);
  }

  // ─── ONBOARDING STATUS ────────────────────────────
  @Get('me/onboarding')
  @ApiOperation({ summary: 'Check onboarding status' })
  @ApiResponse({ status: 200, description: 'Returns onboarding status' })
  async getOnboardingStatus(@Request() req: any) {
    return this.usersService.getOnboardingStatus(req.user.id);
  }

  // ─── COMPLETE ONBOARDING ──────────────────────────
  @Post('me/onboarding/complete')
  @ApiOperation({ summary: 'Mark onboarding as completed' })
  @ApiResponse({ status: 200, description: 'Onboarding completed' })
  async completeOnboarding(@Request() req: any) {
    return this.usersService.completeOnboarding(req.user.id);
  }
}
