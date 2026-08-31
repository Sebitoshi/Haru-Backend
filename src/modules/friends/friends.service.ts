import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const MAX_FRIENDS = 200;
const MAX_FOLLOWING = 500;

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── SEARCH USERS ──────────────────────────────────
  async searchUsers(userId: string, query: string, limit: number = 20) {
    this.logger.log(`SearchUsers: userId=${userId}, query="${query}"`);

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        deletedAt: null,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        level: true,
        totalXp: true,
        bio: true,
        createdAt: true,
      },
      take: limit,
    });

    // Enrich with friendship/follow status
    const enriched = await Promise.all(
      users.map(async (user) => {
        const friendship = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: userId, addresseeId: user.id },
              { requesterId: user.id, addresseeId: userId },
            ],
          },
        });

        const follow = await this.prisma.userFollow.findFirst({
          where: { followerId: userId, followeeId: user.id },
        });

        const friendshipCount = await this.prisma.friendship.count({
          where: {
            status: 'accepted',
            OR: [{ requesterId: user.id }, { addresseeId: user.id }],
          },
        });

        return {
          ...user,
          friendshipStatus: friendship?.status || null,
          friendshipId: friendship?.id || null,
          isFollowing: !!follow,
          friendCount: friendshipCount,
        };
      }),
    );

    return { users: enriched, count: enriched.length, query };
  }

  // ─── SEND FRIEND REQUEST ───────────────────────────
  async sendFriendRequest(requesterId: string, addresseeId: string) {
    this.logger.log(`SendFriendRequest: ${requesterId} → ${addresseeId}`);

    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check addressee exists
    const addressee = await this.prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee || addressee.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Check friendship limit
    const friendCount = await this.prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [{ requesterId: requesterId }, { addresseeId: requesterId }],
      },
    });
    if (friendCount >= MAX_FRIENDS) {
      throw new BadRequestException(`Maximum ${MAX_FRIENDS} friends reached`);
    }

    // Check if friendship already exists (either direction)
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictException('Already friends');
      }
      if (existing.status === 'blocked') {
        throw new ConflictException('Cannot send friend request');
      }
      if (existing.status === 'pending') {
        // If the OTHER person sent it, auto-accept
        if (existing.requesterId === addresseeId) {
          const updated = await this.prisma.friendship.update({
            where: { id: existing.id },
            data: { status: 'accepted', acceptedAt: new Date() },
          });
          this.logger.log(`FriendRequest auto-accepted: ${addresseeId} ← ${requesterId}`);
          return { friendship: updated, autoAccepted: true };
        }
        throw new ConflictException('Friend request already pending');
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: { requesterId, addresseeId, status: 'pending' },
    });

    this.logger.log(`FriendRequest sent: ${requesterId} → ${addresseeId}`);
    return { friendship, autoAccepted: false };
  }

  // ─── ACCEPT FRIEND REQUEST ─────────────────────────
  async acceptFriendRequest(userId: string, friendshipId: string) {
    this.logger.log(`AcceptFriendRequest: userId=${userId}, friendshipId=${friendshipId}`);

    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });

    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.addresseeId !== userId) throw new BadRequestException('Not your friend request');
    if (friendship.status !== 'pending') throw new BadRequestException('Request already handled');

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    this.logger.log(`FriendRequest accepted: ${friendship.requesterId} ↔ ${userId}`);
    return { friendship: updated };
  }

  // ─── DECLINE FRIEND REQUEST ────────────────────────
  async declineFriendRequest(userId: string, friendshipId: string) {
    this.logger.log(`DeclineFriendRequest: userId=${userId}, friendshipId=${friendshipId}`);

    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.addresseeId !== userId) throw new BadRequestException('Not your friend request');

    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    return { message: 'Friend request declined' };
  }

  // ─── REMOVE FRIEND ────────────────────────────────
  async removeFriend(userId: string, friendId: string) {
    this.logger.log(`RemoveFriend: ${userId} ↔ ${friendId}`);

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) throw new NotFoundException('Friendship not found');

    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    return { message: 'Friend removed' };
  }

  // ─── BLOCK USER ───────────────────────────────────
  async blockUser(userId: string, targetId: string) {
    this.logger.log(`BlockUser: ${userId} blocks ${targetId}`);

    if (userId === targetId) throw new BadRequestException('Cannot block yourself');

    // Upsert block
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      await this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'blocked' },
      });
    } else {
      await this.prisma.friendship.create({
        data: { requesterId: userId, addresseeId: targetId, status: 'blocked' },
      });
    }

    return { message: 'User blocked' };
  }

  // ─── FOLLOW / UNFOLLOW ────────────────────────────
  async follow(followerId: string, followeeId: string) {
    this.logger.log(`Follow: ${followerId} → ${followeeId}`);

    if (followerId === followeeId) throw new BadRequestException('Cannot follow yourself');

    // Check followee exists
    const followee = await this.prisma.user.findUnique({ where: { id: followeeId } });
    if (!followee || followee.deletedAt) throw new NotFoundException('User not found');

    // Check following limit
    const followingCount = await this.prisma.userFollow.count({
      where: { followerId },
    });
    if (followingCount >= MAX_FOLLOWING) {
      throw new BadRequestException(`Maximum ${MAX_FOLLOWING} following reached`);
    }

    // Check blocked
    const blocked = await this.prisma.friendship.findFirst({
      where: {
        status: 'blocked',
        OR: [
          { requesterId: followerId, addresseeId: followeeId },
          { requesterId: followeeId, addresseeId: followerId },
        ],
      },
    });
    if (blocked) throw new BadRequestException('Cannot follow this user');

    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });

    if (existing) throw new ConflictException('Already following');

    await this.prisma.userFollow.create({
      data: { followerId, followeeId },
    });

    return { message: 'Now following' };
  }

  async unfollow(followerId: string, followeeId: string) {
    this.logger.log(`Unfollow: ${followerId} → ${followeeId}`);

    await this.prisma.userFollow.deleteMany({
      where: { followerId, followeeId },
    });

    return { message: 'Unfollowed' };
  }

  // ─── GET FRIENDS ──────────────────────────────────
  async getFriends(userId: string, page: number = 1, limit: number = 20) {
    this.logger.log(`GetFriends: userId=${userId}`);

    const skip = (page - 1) * limit;

    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: {
          select: { id: true, username: true, avatarUrl: true, level: true, totalXp: true, bio: true },
        },
        addressee: {
          select: { id: true, username: true, avatarUrl: true, level: true, totalXp: true, bio: true },
        },
      },
      orderBy: { acceptedAt: 'desc' },
      skip,
      take: limit,
    });

    const friends = friendships.map((f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      return { ...friend, friendsSince: f.acceptedAt };
    });

    const total = await this.prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    return {
      friends,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── GET PENDING REQUESTS ─────────────────────────
  async getPendingRequests(userId: string) {
    this.logger.log(`GetPendingRequests: userId=${userId}`);

    const [received, sent] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'pending' },
        include: {
          requester: {
            select: { id: true, username: true, avatarUrl: true, level: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendship.findMany({
        where: { requesterId: userId, status: 'pending' },
        include: {
          addressee: {
            select: { id: true, username: true, avatarUrl: true, level: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      received: received.map((r) => ({
        id: r.id,
        from: r.requester,
        createdAt: r.createdAt,
      })),
      sent: sent.map((s) => ({
        id: s.id,
        to: s.addressee,
        createdAt: s.createdAt,
      })),
    };
  }

  // ─── GET FOLLOWING ────────────────────────────────
  async getFollowing(userId: string) {
    this.logger.log(`GetFollowing: userId=${userId}`);

    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      include: {
        followee: {
          select: { id: true, username: true, avatarUrl: true, level: true, bio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      following: follows.map((f) => ({ ...f.followee, since: f.createdAt })),
      count: follows.length,
    };
  }

  // ─── GET FOLLOWERS ────────────────────────────────
  async getFollowers(userId: string) {
    this.logger.log(`GetFollowers: userId=${userId}`);

    const followers = await this.prisma.userFollow.findMany({
      where: { followeeId: userId },
      include: {
        follower: {
          select: { id: true, username: true, avatarUrl: true, level: true, bio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      followers: followers.map((f) => ({ ...f.follower, since: f.createdAt })),
      count: followers.length,
    };
  }

  // ─── POST ACTIVITY ────────────────────────────────
  async postActivity(
    userId: string,
    type: string,
    details: any,
    visibility: string = 'friends',
  ) {
    this.logger.log(`PostActivity: userId=${userId}, type=${type}`);

    const activity = await this.prisma.friendActivity.create({
      data: {
        userId,
        type: type as any,
        details,
        visibility: visibility as any,
      },
    });

    return activity;
  }

  // ─── GET ACTIVITY FEED (friends' activities) ──────
  async getActivityFeed(userId: string, page: number = 1, limit: number = 20) {
    this.logger.log(`GetActivityFeed: userId=${userId}`);

    // Get friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    // Include own activities + friends' public/friends activities
    const allUserIds = [userId, ...friendIds];

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.friendActivity.findMany({
        where: {
          userId: { in: allUserIds },
          OR: [
            { userId }, // own activities always visible
            { visibility: 'public' },
            { visibility: 'friends', userId: { in: friendIds } },
          ],
        },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, level: true },
          },
          celebrations: {
            select: { type: true, userId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.friendActivity.count({
        where: {
          userId: { in: allUserIds },
          OR: [
            { userId },
            { visibility: 'public' },
            { visibility: 'friends', userId: { in: friendIds } },
          ],
        },
      }),
    ]);

    return {
      activities: activities.map((a) => ({
        ...a,
        celebrationCount: a.celebrations.length,
        celebrationTypes: [...new Set(a.celebrations.map((c) => c.type))],
        hasMyCelebration: a.celebrations.some((c) => c.userId === userId),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── CELEBRATE ACTIVITY ───────────────────────────
  async celebrate(userId: string, activityId: string, type: string = 'clap') {
    this.logger.log(`Celebrate: userId=${userId}, activityId=${activityId}, type=${type}`);

    const validTypes = ['clap', 'fire', 'heart', 'star'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Invalid celebration type. Use: ${validTypes.join(', ')}`);
    }

    const activity = await this.prisma.friendActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    // Cannot celebrate own activity
    if (activity.userId === userId) {
      throw new BadRequestException('Cannot celebrate your own activity');
    }

    // Check if already celebrated with this type
    const existing = await this.prisma.celebration.findUnique({
      where: { activityId_userId_type: { activityId, userId, type } },
    });

    if (existing) {
      // Toggle off — remove celebration
      await this.prisma.celebration.delete({ where: { id: existing.id } });
      return { celebrated: false, type };
    }

    await this.prisma.celebration.create({
      data: { activityId, userId, type },
    });

    return { celebrated: true, type };
  }

  // ─── COMPARE STREAKS ──────────────────────────────
  async compareStreaks(userId: string) {
    this.logger.log(`CompareStreaks: userId=${userId}`);

    // Get friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const allUserIds = [userId, ...friendIds];

    const streaks = await this.prisma.streak.findMany({
      where: { userId: { in: allUserIds } },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, level: true },
        },
      },
      orderBy: { currentStreak: 'desc' },
    });

    const myRank = streaks.findIndex((s) => s.userId === userId) + 1;

    return {
      myRank,
      total: streaks.length,
      streaks: streaks.map((s, i) => ({
        rank: i + 1,
        userId: s.user.id,
        username: s.user.username,
        avatarUrl: s.user.avatarUrl,
        level: s.user.level,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
        isMe: s.userId === userId,
      })),
    };
  }

  // ─── COMPARE LEVELS ──────────────────────────────
  async compareLevels(userId: string) {
    this.logger.log(`CompareLevels: userId=${userId}`);

    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const allUserIds = [userId, ...friendIds];

    const users = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: {
        id: true, username: true, avatarUrl: true,
        level: true, totalXp: true, totalCoins: true,
      },
      orderBy: { totalXp: 'desc' },
    });

    const myRank = users.findIndex((u) => u.id === userId) + 1;

    return {
      myRank,
      total: users.length,
      users: users.map((u, i) => ({
        rank: i + 1,
        ...u,
        isMe: u.id === userId,
      })),
    };
  }

  // ─── COMPARE MISSIONS ────────────────────────────
  async compareMissions(userId: string) {
    this.logger.log(`CompareMissions: userId=${userId}`);

    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const allUserIds = [userId, ...friendIds];

    const completions = await this.prisma.userQuest.groupBy({
      by: ['userId'],
      where: { userId: { in: allUserIds }, status: 'completed' },
      _count: { id: true },
    });

    // Get user info
    const users = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, username: true, avatarUrl: true, level: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const ranked = completions
      .map((c) => ({
        ...userMap.get(c.userId)!,
        completedCount: c._count.id,
        isMe: c.userId === userId,
      }))
      .sort((a, b) => b.completedCount - a.completedCount)
      .map((u, i) => ({ rank: i + 1, ...u }));

    return { total: ranked.length, users: ranked };
  }

  // ─── SHARE DIARY ENTRY ───────────────────────────
  async shareDiaryEntry(userId: string, entryId: string, visibility: string = 'friends') {
    this.logger.log(`ShareDiaryEntry: userId=${userId}, entryId=${entryId}`);

    const entry = await this.prisma.diaryEntry.findFirst({
      where: { id: entryId, userId, isHidden: false },
    });

    if (!entry) throw new NotFoundException('Diary entry not found');

    // Mark as shared
    await this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: { sharedAt: new Date() },
    });

    // Post to activity feed
    const activity = await this.postActivity(userId, 'diary_shared', {
      entryId,
      entryTitle: entry.title,
      category: entry.category,
      photoUrl: entry.photoUrl,
      xpEarned: entry.xpEarned,
    }, visibility as any);

    return { activity, message: 'Diary entry shared with friends' };
  }

  // ─── SEND QUEST CHALLENGE ─────────────────────────
  async sendQuestChallenge(senderId: string, receiverId: string, questId: string, message?: string) {
    this.logger.log(`SendQuestChallenge: ${senderId} → ${receiverId}, quest=${questId}`);

    if (senderId === receiverId) throw new BadRequestException('Cannot challenge yourself');

    // Check friendship
    const areFriends = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: senderId, addresseeId: receiverId },
          { requesterId: receiverId, addresseeId: senderId },
        ],
      },
    });
    if (!areFriends) throw new BadRequestException('You can only challenge friends');

    // Check quest exists
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    // Check for existing pending challenge
    const existing = await this.prisma.questChallenge.findFirst({
      where: { senderId, receiverId, questId, status: 'pending' },
    });
    if (existing) throw new ConflictException('Challenge already sent');

    const challenge = await this.prisma.questChallenge.create({
      data: {
        senderId,
        receiverId,
        questId,
        message: message || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        quest: { select: { id: true, title: true, description: true, category: true, difficulty: true, xpReward: true } },
      },
    });

    return { challenge };
  }

  // ─── GET CHALLENGES ───────────────────────────────
  async getChallenges(userId: string) {
    this.logger.log(`GetChallenges: userId=${userId}`);

    const [received, sent] = await Promise.all([
      this.prisma.questChallenge.findMany({
        where: { receiverId: userId, status: { in: ['pending', 'accepted'] } },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
          quest: { select: { id: true, title: true, category: true, difficulty: true, xpReward: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.questChallenge.findMany({
        where: { senderId: userId, status: { in: ['pending', 'accepted'] } },
        include: {
          receiver: { select: { id: true, username: true, avatarUrl: true } },
          quest: { select: { id: true, title: true, category: true, difficulty: true, xpReward: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      received: received.map((c) => ({
        ...c,
        expired: c.expiresAt ? new Date() > c.expiresAt : false,
      })),
      sent: sent.map((c) => ({
        ...c,
        expired: c.expiresAt ? new Date() > c.expiresAt : false,
      })),
    };
  }

  // ─── ACCEPT CHALLENGE ─────────────────────────────
  async acceptChallenge(userId: string, challengeId: string) {
    this.logger.log(`AcceptChallenge: userId=${userId}, challengeId=${challengeId}`);

    const challenge = await this.prisma.questChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.receiverId !== userId) throw new BadRequestException('Not your challenge');
    if (challenge.status !== 'pending') throw new BadRequestException('Challenge already handled');
    if (challenge.expiresAt && new Date() > challenge.expiresAt) {
      throw new BadRequestException('Challenge has expired');
    }

    const updated = await this.prisma.questChallenge.update({
      where: { id: challengeId },
      data: { status: 'accepted' },
    });

    return { challenge: updated };
  }

  // ─── DECLINE CHALLENGE ────────────────────────────
  async declineChallenge(userId: string, challengeId: string) {
    this.logger.log(`DeclineChallenge: userId=${userId}, challengeId=${challengeId}`);

    const challenge = await this.prisma.questChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.receiverId !== userId) throw new BadRequestException('Not your challenge');

    await this.prisma.questChallenge.update({
      where: { id: challengeId },
      data: { status: 'declined' },
    });

    return { message: 'Challenge declined' };
  }

  // ─── GET FRIEND PROFILE ───────────────────────────
  async getFriendProfile(userId: string, friendId: string) {
    this.logger.log(`GetFriendProfile: userId=${userId}, friendId=${friendId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true, username: true, avatarUrl: true, bio: true,
        level: true, totalXp: true, totalCoins: true, createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Get streak
    const streak = await this.prisma.streak.findUnique({
      where: { userId: friendId },
      select: { currentStreak: true, longestStreak: true },
    });

    // Get completed quests count
    const completedQuests = await this.prisma.userQuest.count({
      where: { userId: friendId, status: 'completed' },
    });

    // Get badges
    const badges = await this.prisma.userBadge.findMany({
      where: { userId: friendId },
      include: { badge: { select: { name: true, icon: true, category: true } } },
      orderBy: { unlockedAt: 'desc' },
      take: 10,
    });

    // Get friendship status
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    const follow = await this.prisma.userFollow.findFirst({
      where: { followerId: userId, followeeId: friendId },
    });

    // Get friend count
    const friendCount = await this.prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [{ requesterId: friendId }, { addresseeId: friendId }],
      },
    });

    return {
      ...user,
      streak: streak || { currentStreak: 0, longestStreak: 0 },
      completedQuests,
      badges: badges.map((b) => ({
        name: b.badge.name,
        icon: b.badge.icon,
        category: b.badge.category,
        unlockedAt: b.unlockedAt,
      })),
      friendshipStatus: friendship?.status || null,
      isFollowing: !!follow,
      friendCount,
    };
  }
}
