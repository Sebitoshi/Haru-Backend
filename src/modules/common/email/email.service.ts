import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// ═══════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════

interface AdminEmailData {
  username: string;
  email: string;
  action: string;
  details?: string;
  timestamp?: string;
}

const FROM_ADDRESS = 'Haru <noreply@haru.app>';

function buildAdminActionEmail(data: AdminEmailData): { subject: string; html: string } {
  const actionMap: Record<string, { emoji: string; title: string; color: string }> = {
    role_change: { emoji: '👑', title: 'Tu rol ha cambiado', color: '#8B5CF6' },
    user_deleted: { emoji: '🗑️', title: 'Tu cuenta ha sido eliminada', color: '#EF4444' },
    role_promoted: { emoji: '🎉', title: '¡Has sido promovido!', color: '#10B981' },
    role_demoted: { emoji: '📋', title: 'Tu rol ha sido actualizado', color: '#F59E0B' },
  };

  const meta = actionMap[data.action] || { emoji: '🔔', title: 'Notificación de administración', color: '#6366F1' };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:${meta.color};padding:32px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">${meta.emoji}</div>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:600;">${meta.title}</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
        Hola <strong>${data.username}</strong>,
      </p>

      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
        ${getEmailBody(data)}
      </p>

      ${data.details ? `
      <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:0 0 24px;">
        <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Detalles</p>
        <p style="color:#1e293b;font-size:14px;margin:0;font-family:monospace;">${data.details}</p>
      </div>
      ` : ''}

      <p style="color:#94a3b8;font-size:13px;margin:0;">
        ${data.timestamp ? `Fecha: ${new Date(data.timestamp).toLocaleString('es-CO')}` : ''}
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        🌸 Haru — Vive algo memorable hoy
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject: `${meta.emoji} ${meta.title} — Haru`, html };
}

function getEmailBody(data: AdminEmailData): string {
  switch (data.action) {
    case 'role_change':
      return `Tu rol en Haru ha sido actualizado por un administrador. Si tienes preguntas, contacta a soporte.`;
    case 'user_deleted':
      return `Tu cuenta ha sido eliminada por un administrador. Todos tus datos han sido borrados. Si crees que esto es un error, contacta a soporte inmediatamente.`;
    case 'role_promoted':
      return `¡Felicidades! Un administrador te ha promovido. Tienes nuevos permisos en la plataforma.`;
    case 'role_demoted':
      return `Tu rol ha sido modificado por un administrador. Si tienes preguntas, contacta a soporte.`;
    default:
      return `Un administrador realizó una acción en tu cuenta.`;
  }
}

// ═══════════════════════════════════════════════════════════
// EMAIL SERVICE
// ═══════════════════════════════════════════════════════════

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly fromAddress = FROM_ADDRESS;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('RESEND_API_KEY');
    if (apiKey && apiKey !== 're_your_key_here') {
      this.resend = new Resend(apiKey);
      this.logger.log('📧 Resend email service initialized');
    } else {
      this.logger.warn('📧 RESEND_API_KEY not set — emails will be logged to console');
    }
  }

  get isAvailable(): boolean {
    return this.resend !== null;
  }

  // ─── SEND ADMIN ACTION EMAIL ───────────────────────
  async sendAdminActionEmail(
    to: string,
    data: AdminEmailData,
  ): Promise<{ sent: boolean; messageId?: string }> {
    const { subject, html } = buildAdminActionEmail(data);

    this.logger.log(`📧 Admin action email → ${to} (${data.action})`);

    if (!this.resend) {
      // Graceful fallback — log instead of sending
      this.logger.log(`📧 [DRY RUN] Would send email to ${to}:`);
      this.logger.log(`   Subject: ${subject}`);
      this.logger.log(`   Action: ${data.action} | User: ${data.username}`);
      return { sent: false, messageId: 'dry-run' };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: [to],
        subject,
        html,
      });

      this.logger.log(`📧 Email sent successfully → ${to} (id: ${result.data?.id})`);
      return { sent: true, messageId: result.data?.id };
    } catch (error) {
      this.logger.error(`📧 Failed to send email to ${to}: ${error.message}`);
      // Don't throw — email failure should never block admin actions
      return { sent: false, messageId: undefined };
    }
  }

  // ─── SEND GENERIC EMAIL ────────────────────────────
  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ sent: boolean; messageId?: string }> {
    this.logger.log(`📧 Sending email → ${to}: ${subject}`);

    if (!this.resend) {
      this.logger.log(`📧 [DRY RUN] Would send email to ${to}: ${subject}`);
      return { sent: false, messageId: 'dry-run' };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: [to],
        subject,
        html,
      });
      return { sent: true, messageId: result.data?.id };
    } catch (error) {
      this.logger.error(`📧 Failed to send email: ${error.message}`);
      return { sent: false };
    }
  }

  // ─── BATCH EMAIL (multiple recipients) ─────────────
  async sendBatchEmails(
    emails: Array<{ to: string; subject: string; html: string }>,
  ): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    if (!this.resend) {
      this.logger.log(`📧 [DRY RUN] Would send ${emails.length} emails`);
      return { total: emails.length, sent: 0, failed: 0 };
    }

    const resend = this.resend!;
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        const result = await resend.emails.send({
          from: this.fromAddress,
          to: [email.to],
          subject: email.subject,
          html: email.html,
        });
        return result;
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') sent++;
      else failed++;
    }

    this.logger.log(`📧 Batch: ${sent}/${emails.length} sent, ${failed} failed`);
    return { total: emails.length, sent, failed };
  }
}
