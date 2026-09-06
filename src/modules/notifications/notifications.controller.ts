import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('🔔 Notificaciones')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '🔔 Lista de notificaciones del usuario' })
  async getNotifications(@Req() req: any) {
    return this.notificationsService.getNotifications(req.user.id);
  }

  @Post('read')
  @ApiOperation({ summary: '✅ Marcar todas como leídas' })
  async markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '✅ Marcar una notificación como leída' })
  async markOneRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markOneRead(req.user.id, id);
  }
}