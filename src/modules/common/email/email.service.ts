import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
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

interface AuthEmailData {
  username: string;
  emoji: string;
  title: string;
  color: string;
  body: string;
  code?: string;
  codeNote?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;
}

function buildAuthEmail(data: AuthEmailData): { subject: string; html: string } {
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
    <div style="background:${data.color};padding:32px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">${data.emoji}</div>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:600;">${data.title}</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
        Hola <strong>${data.username}</strong>,
      </p>

      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
        ${data.body}
      </p>

      ${data.code ? `
      <!-- Verification Code -->
      <div style="text-align:center;margin:0 0 24px;padding:20px 16px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;">
        <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px;">Tu código de verificación</p>
        <p style="color:#1e293b;font-size:36px;font-weight:700;letter-spacing:10px;margin:0;font-family:monospace;">${data.code}</p>
        ${data.codeNote ? `<p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">${data.codeNote}</p>` : ''}
      </div>
      ` : ''}

      ${data.ctaLabel && data.ctaUrl ? `
      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${data.ctaUrl}" style="display:inline-block;background:${data.color};color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
          ${data.ctaLabel}
        </a>
      </div>
      ` : ''}

      ${data.note ? `
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
        ${data.note}
      </p>
      ` : ''}
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

  return { subject: `${data.emoji} ${data.title} — Haru`, html };
}

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
// Transporte elegido automáticamente en el constructor:
//   1) SMTP (nodemailer)   → si SMTP_HOST está configurado
//   2) Resend (API)        → si RESEND_API_KEY está configurada
//   3) Dry-run             → si no hay nada (solo logs en consola)
// ═══════════════════════════════════════════════════════════

type EmailMode = 'smtp' | 'resend' | 'dry-run';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private smtp: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private readonly fromAddress: string;
  private readonly mode: EmailMode;

  constructor(private configService: ConfigService) {
    this.fromAddress = this.configService.get('EMAIL_FROM', FROM_ADDRESS);

    const smtpHost = this.configService.get('SMTP_HOST');
    const resendKey = this.configService.get('RESEND_API_KEY');

    if (smtpHost) {
      const smtpUser = this.configService.get('SMTP_USER');
      this.smtp = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get('SMTP_PORT', '587'), 10),
        secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
        auth: smtpUser
          ? { user: smtpUser, pass: this.configService.get('SMTP_PASS', '') }
          : undefined,
      });
      this.mode = 'smtp';
      this.logger.log(
        `📧 SMTP email service initialized → ${smtpHost}:${this.configService.get('SMTP_PORT', '587')}`,
      );
    } else if (resendKey && resendKey !== 're_your_key_here') {
      this.resend = new Resend(resendKey);
      this.mode = 'resend';
      this.logger.log('📧 Resend email service initialized');
    } else {
      this.mode = 'dry-run';
      this.logger.warn(
        '📧 No SMTP_HOST nor RESEND_API_KEY — emails will be logged to console (dry-run)',
      );
    }
  }

  get isAvailable(): boolean {
    return this.mode !== 'dry-run';
  }

  // ─── DELIVER (transporte unificado) ──────────────────
  private async deliver(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ sent: boolean; messageId?: string }> {
    // 1) SMTP
    if (this.mode === 'smtp' && this.smtp) {
      try {
        const info = await this.smtp.sendMail({
          from: this.fromAddress,
          to,
          subject,
          html,
        });
        this.logger.log(
          `📧 Email sent via SMTP → ${to} (id: ${info.messageId})`,
        );
        return { sent: true, messageId: info.messageId };
      } catch (error) {
        this.logger.error(`📧 SMTP failed to send to ${to}: ${error.message}`);
        return { sent: false, messageId: undefined };
      }
    }

    // 2) Resend
    if (this.mode === 'resend' && this.resend) {
      try {
        const result = await this.resend.emails.send({
          from: this.fromAddress,
          to: [to],
          subject,
          html,
        });
        this.logger.log(
          `📧 Email sent via Resend → ${to} (id: ${result.data?.id})`,
        );
        return { sent: true, messageId: result.data?.id };
      } catch (error) {
        this.logger.error(`📧 Resend failed to send to ${to}: ${error.message}`);
        return { sent: false, messageId: undefined };
      }
    }

    // 3) Dry-run
    this.logger.log(`📧 [DRY RUN] Would send email to ${to}: ${subject}`);
    return { sent: false, messageId: 'dry-run' };
  }

  // ─── SEND ADMIN ACTION EMAIL ───────────────────────
  async sendAdminActionEmail(
    to: string,
    data: AdminEmailData,
  ): Promise<{ sent: boolean; messageId?: string }> {
    const { subject, html } = buildAdminActionEmail(data);

    this.logger.log(`📧 Admin action email → ${to} (${data.action})`);

    if (this.mode === 'dry-run') {
      this.logger.log(`   Subject: ${subject}`);
      this.logger.log(`   Action: ${data.action} | User: ${data.username}`);
    }

    return this.deliver(to, subject, html);
  }

  // ─── SEND VERIFICATION EMAIL (6-digit code) ──────────
  async sendVerificationEmail(
    to: string,
    username: string,
    code: string,
  ): Promise<{ sent: boolean; messageId?: string }> {
    const { subject, html } = buildAuthEmail({
      username,
      emoji: '✉️',
      title: 'Verifica tu correo',
      color: '#8B5CF6',
      body: '¡Bienvenido a Haru! 🌸 Solo falta un paso: confirma tu correo para empezar a vivir experiencias y conocer a tu compañero Boti.',
      code,
      codeNote: 'El código expira en 30 minutos.',
      note: 'Si no creaste una cuenta en Haru, puedes ignorar este correo.',
    });

    if (this.mode === 'dry-run') {
      this.logger.log(`📧 [DRY RUN] Verification code for ${to}: ${code}`);
    }

    return this.deliver(to, subject, html);
  }

  // ─── SEND PASSWORD RESET EMAIL ──────────────────────
  async sendPasswordResetEmail(
    to: string,
    username: string,
    token: string,
  ): Promise<{ sent: boolean; messageId?: string }> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const link = `${frontendUrl}/reset-password?token=${token}`;

    const { subject, html } = buildAuthEmail({
      username,
      emoji: '🔑',
      title: 'Restablece tu contraseña',
      color: '#F59E0B',
      body: 'Recibimos una solicitud para restablecer tu contraseña de Haru. El enlace es válido por 1 hora.',
      ctaLabel: 'Restablecer contraseña',
      ctaUrl: link,
      note: 'Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.',
    });

    if (this.mode === 'dry-run') {
      this.logger.log(`📧 [DRY RUN] Reset link for ${to}: ${link}`);
    }

    return this.deliver(to, subject, html);
  }

  // ─── SEND GENERIC EMAIL ────────────────────────────
  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ sent: boolean; messageId?: string }> {
    this.logger.log(`📧 Sending email → ${to}: ${subject}`);
    return this.deliver(to, subject, html);
  }

  // ─── BATCH EMAIL (multiple recipients) ─────────────
  async sendBatchEmails(
    emails: Array<{ to: string; subject: string; html: string }>,
  ): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    if (this.mode === 'dry-run') {
      this.logger.log(`📧 [DRY RUN] Would send ${emails.length} emails`);
      return { total: emails.length, sent: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      emails.map((email) => this.deliver(email.to, email.subject, email.html)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.sent) sent++;
      else failed++;
    }

    this.logger.log(`📧 Batch: ${sent}/${emails.length} sent, ${failed} failed`);
    return { total: emails.length, sent, failed };
  }
}
