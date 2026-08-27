import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/admin',
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private connectedAdmins = new Map<string, string>(); // socketId → adminId

  constructor(private prisma: PrismaService) {}

  // ─── CONNECTION ──────────────────────────────────────
  handleConnection(client: Socket) {
    this.logger.log(`Admin connected: ${client.id}`);

    // Start broadcasting stats every 30s when first admin connects
    if (this.connectedAdmins.size === 0) {
      this.startStatsBroadcast();
    }
    this.connectedAdmins.set(client.id, 'pending-auth');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Admin disconnected: ${client.id}`);
    this.connectedAdmins.delete(client.id);

    // Stop broadcasting when no admins connected
    if (this.connectedAdmins.size === 0 && this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // ─── AUTH ────────────────────────────────────────────
  @SubscribeMessage('authenticate')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { adminId: string },
  ) {
    this.connectedAdmins.set(client.id, data.adminId);
    this.logger.log(`Admin authenticated: ${data.adminId}`);

    // Send initial stats immediately
    const stats = await this.getDashboardStats();
    client.emit('dashboard-stats', stats);

    return { event: 'authenticated', data: { ok: true } };
  }

  // ─── REQUEST REFRESH ────────────────────────────────
  @SubscribeMessage('request-stats')
  async handleRequestStats(@ConnectedSocket() client: Socket) {
    const stats = await this.getDashboardStats();
    client.emit('dashboard-stats', stats);
    return { event: 'stats-sent', data: { ok: true } };
  }

  // ─── AUTO-BROADCAST ─────────────────────────────────
  private startStatsBroadcast() {
    this.statsInterval = setInterval(async () => {
      if (this.connectedAdmins.size === 0) return;
      const stats = await this.getDashboardStats();
      this.server.emit('dashboard-stats', stats);
    }, 30_000); // every 30s
  }

  // ─── PUSH EVENT TO ALL ADMINS ───────────────────────
  pushEvent(event: string, data: any) {
    this.server.emit(event, data);
  }

  // ─── STATS CALCULATION ──────────────────────────────
  private async getDashboardStats() {
    const now = new Date();
    const [
      totalUsers,
      activeUsers,
      completedQuests,
      pendingReviews,
      totalXp,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.userQuest.count({ where: { status: 'completed' } }),
      this.prisma.questVerification.count({ where: { status: 'needs_review' } }),
      this.prisma.userQuest.findMany({
        where: { status: 'completed' },
        select: { quest: { select: { xpReward: true } } },
      }).then((uqs) => uqs.reduce((s, u) => s + u.quest.xpReward, 0)),
    ]);

    return {
      timestamp: now.toISOString(),
      connectedAdmins: this.connectedAdmins.size,
      stats: {
        totalUsers,
        activeUsers,
        completedQuests,
        pendingReviews,
        totalXp,
      },
    };
  }
}
