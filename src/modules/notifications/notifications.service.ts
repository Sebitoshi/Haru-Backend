import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS — Centro de avisos del usuario
// ═══════════════════════════════════════════════════════════
// No existe un modelo Notification: las notificaciones se derivan
// del ActivityLog del usuario. La marca de "leída" se persiste en
// details.read (campo Json), evitando migraciones.

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async getNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<{ notifications: NotificationView[]; unreadCount: number; total: number }> {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const notifications = logs.map((log) => this.toNotification(log));
    const unreadCount = notifications.filter((n) => !n.read).length;

    return { notifications, unreadCount, total: notifications.length };
  }

  async markAllRead(userId: string): Promise<{ message: string }> {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      select: { id: true, details: true },
    });

    await this.prisma.$transaction(
      logs.map((log) =>
        this.prisma.activityLog.update({
          where: { id: log.id },
          data: { details: { ...((log.details as any) || {}), read: true } },
        }),
      ),
    );

    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  async markOneRead(userId: string, notificationId: string): Promise<{ message: string }> {
    const log = await this.prisma.activityLog.findFirst({
      where: { id: notificationId, userId },
    });
    if (!log) {
      return { message: 'Notificación no encontrada' };
    }

    await this.prisma.activityLog.update({
      where: { id: log.id },
      data: { details: { ...((log.details as any) || {}), read: true } },
    });

    return { message: 'Notificación marcada como leída' };
  }

  // ─── HELPERS ──────────────────────────────────────

  private toNotification(log: any): NotificationView {
    const details: any = log.details || {};
    const action = log.action;

    let type = 'system';
    let title = 'Actividad reciente';
    let body = '';

    switch (action) {
      case 'cosmetic_equipped': {
        type = 'shop';
        title = 'Item equipado';
        body = `${details.itemName || 'Item'} aplicado a tu perfil.`;
        break;
      }
      case 'boost_activated': {
        type = 'shop';
        title = 'Potenciador activo';
        body = `${details.itemName || 'Boost'} activado${details.expiresAt ? ' (expira pronto)' : ''}.`;
        break;
      }
      case 'mystery_box_unlocked': {
        type = 'collection';
        title = 'Coleccionable desbloqueado';
        body = `Obtuviste ${details.collectible || 'un objeto'} de la caja misteriosa.`;
        break;
      }
      case 'verification': {
        type = 'quest';
        title = 'Evidencia revisada';
        body = details.status === 'verified'
          ? '¡Tu evidencia fue verificada!'
          : 'Tu evidencia está en revisión.';
        break;
      }
      case 'rank_change': {
        type = 'rankings';
        title = 'Nuevo ranking';
        body = `Subiste al puesto #${details.rank || '—'}${details.level ? ` (${details.level})` : ''}.`;
        break;
      }
      default: {
        type = 'system';
        title = action?.replace(/_/g, ' ') ?? 'Actividad reciente';
        title = title.charAt(0).toUpperCase() + title.slice(1);
        body = details.message || details.itemName || '';
      }
    }

    return {
      id: log.id,
      type,
      title,
      body,
      read: details.read === true,
      createdAt: log.createdAt.toISOString(),
    };
  }
}