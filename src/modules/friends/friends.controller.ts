import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { FriendsService } from './friends.service';

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  // ─── SEARCH USERS ──────────────────────────────────
  @Get('search')
  @ApiOperation({ summary: 'Search users by username or email' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns users with friendship/follow status' })
  async searchUsers(@Request() req: any, @Query('q') query: string, @Query('limit') limit?: string) {
    return this.friendsService.searchUsers(req.user.id, query, limit ? parseInt(limit) : 20);
  }

  // ─── FRIEND REQUESTS ──────────────────────────────
  @Post('request/:userId')
  @ApiOperation({ summary: 'Send friend request' })
  @ApiResponse({ status: 201, description: 'Friend request sent (or auto-accepted if they sent one)' })
  async sendRequest(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.sendFriendRequest(req.user.id, userId);
  }

  @Patch('request/:id/accept')
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiResponse({ status: 200, description: 'Friend request accepted' })
  async acceptRequest(@Request() req: any, @Param('id') id: string) {
    return this.friendsService.acceptFriendRequest(req.user.id, id);
  }

  @Patch('request/:id/decline')
  @ApiOperation({ summary: 'Decline friend request' })
  @ApiResponse({ status: 200, description: 'Friend request declined' })
  async declineRequest(@Request() req: any, @Param('id') id: string) {
    return this.friendsService.declineFriendRequest(req.user.id, id);
  }

  // ─── FRIENDS LIST ─────────────────────────────────
  @Get('')
  @ApiOperation({ summary: 'Get friends list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns friends with pagination' })
  async getFriends(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.friendsService.getFriends(req.user.id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending friend requests (received + sent)' })
  @ApiResponse({ status: 200, description: 'Returns pending requests' })
  async getPendingRequests(@Request() req: any) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiResponse({ status: 200, description: 'Friend removed' })
  async removeFriend(@Request() req: any, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }

  // ─── BLOCK ────────────────────────────────────────
  @Post('block/:userId')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  async blockUser(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.blockUser(req.user.id, userId);
  }

  // ─── FOLLOW / UNFOLLOW ────────────────────────────
  @Post('follow/:userId')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 201, description: 'Now following' })
  async follow(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.follow(req.user.id, userId);
  }

  @Delete('follow/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Unfollowed' })
  async unfollow(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.unfollow(req.user.id, userId);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users you follow' })
  @ApiResponse({ status: 200, description: 'Returns following list' })
  async getFollowing(@Request() req: any) {
    return this.friendsService.getFollowing(req.user.id);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get your followers' })
  @ApiResponse({ status: 200, description: 'Returns followers list' })
  async getFollowers(@Request() req: any) {
    return this.friendsService.getFollowers(req.user.id);
  }

  // ─── ACTIVITY FEED ────────────────────────────────
  @Get('feed')
  @ApiOperation({ summary: 'Get friends activity feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns activity feed with celebrations' })
  async getActivityFeed(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.friendsService.getActivityFeed(req.user.id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Post('feed/:activityId/celebrate')
  @ApiOperation({ summary: 'Celebrate an activity (clap, fire, heart, star)' })
  @ApiBody({ schema: { properties: { type: { type: 'string', enum: ['clap', 'fire', 'heart', 'star'], default: 'clap' } } } })
  @ApiResponse({ status: 200, description: 'Celebration added/toggled' })
  async celebrate(@Request() req: any, @Param('activityId') activityId: string, @Body('type') type?: string) {
    return this.friendsService.celebrate(req.user.id, activityId, type || 'clap');
  }

  // ─── COMPARISONS ──────────────────────────────────
  @Get('compare/streaks')
  @ApiOperation({ summary: 'Compare streaks with friends' })
  @ApiResponse({ status: 200, description: 'Returns ranked streak comparison' })
  async compareStreaks(@Request() req: any) {
    return this.friendsService.compareStreaks(req.user.id);
  }

  @Get('compare/levels')
  @ApiOperation({ summary: 'Compare levels and XP with friends' })
  @ApiResponse({ status: 200, description: 'Returns ranked level comparison' })
  async compareLevels(@Request() req: any) {
    return this.friendsService.compareLevels(req.user.id);
  }

  @Get('compare/missions')
  @ApiOperation({ summary: 'Compare completed missions with friends' })
  @ApiResponse({ status: 200, description: 'Returns ranked mission comparison' })
  async compareMissions(@Request() req: any) {
    return this.friendsService.compareMissions(req.user.id);
  }

  // ─── SHARE DIARY ──────────────────────────────────
  @Post('share/diary/:entryId')
  @ApiOperation({ summary: 'Share a diary entry with friends' })
  @ApiBody({ schema: { properties: { visibility: { type: 'string', enum: ['friends', 'public'], default: 'friends' } } } })
  @ApiResponse({ status: 200, description: 'Diary entry shared' })
  async shareDiary(@Request() req: any, @Param('entryId') entryId: string, @Body('visibility') visibility?: string) {
    return this.friendsService.shareDiaryEntry(req.user.id, entryId, visibility || 'friends');
  }

  // ─── QUEST CHALLENGES ─────────────────────────────
  @Post('challenge/:userId/:questId')
  @ApiOperation({ summary: 'Send a quest challenge to a friend' })
  @ApiBody({ schema: { properties: { message: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Challenge sent' })
  async sendChallenge(
    @Request() req: any,
    @Param('userId') userId: string,
    @Param('questId') questId: string,
    @Body('message') message?: string,
  ) {
    return this.friendsService.sendQuestChallenge(req.user.id, userId, questId, message);
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Get your challenges (received + sent)' })
  @ApiResponse({ status: 200, description: 'Returns challenges with status' })
  async getChallenges(@Request() req: any) {
    return this.friendsService.getChallenges(req.user.id);
  }

  @Patch('challenge/:id/accept')
  @ApiOperation({ summary: 'Accept a quest challenge' })
  @ApiResponse({ status: 200, description: 'Challenge accepted' })
  async acceptChallenge(@Request() req: any, @Param('id') id: string) {
    return this.friendsService.acceptChallenge(req.user.id, id);
  }

  @Patch('challenge/:id/decline')
  @ApiOperation({ summary: 'Decline a quest challenge' })
  @ApiResponse({ status: 200, description: 'Challenge declined' })
  async declineChallenge(@Request() req: any, @Param('id') id: string) {
    return this.friendsService.declineChallenge(req.user.id, id);
  }

  // ─── FRIEND PROFILE ───────────────────────────────
  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get a friend\'s public profile' })
  @ApiResponse({ status: 200, description: 'Returns friend profile with stats and badges' })
  async getFriendProfile(@Request() req: any, @Param('userId') userId: string) {
    return this.friendsService.getFriendProfile(req.user.id, userId);
  }
}
