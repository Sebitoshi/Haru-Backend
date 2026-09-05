import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGateway } from '../admin/admin.gateway';
import { TrustLevel } from '../../generated/prisma/client';

// ═══════════════════════════════════════════════════════════
// TRUST LEVELS
// ═══════════════════════════════════════════════════════════

export const TRUST_LEVELS: Record<TrustLevel, {
  name: string;
  emoji: string;
  description: string;
  minScore: number;
  benefits: string[];
}> = {
  new_user: {
    name: 'Nuevo',
    emoji: '👤',
    description: 'Recién registrado en Haru',
    minScore: 0,
    benefits: ['Acceso básico a misiones'],
  },
  trustworthy: {
    name: 'Confiable',
    emoji: '🌱',
    description: 'Comportamiento positivo en la plataforma',
    minScore: 30,
    benefits: ['Acceso a rankings', 'Puede enviar 5 evidencias/día'],
  },
  very_trustworthy: {
    name: 'Muy Confiable',
    emoji: '🌿',
    description: 'Usuario comprometido y confiable',
    minScore: 60,
    benefits: ['Ranking destacado', 'Evidencias prioritarias', '10 evidencias/día'],
  },
  excellent: {
    name: 'Excelente',
    emoji: '⭐',
    description: 'Reputación impecable',
    minScore: 80,
    benefits: ['Top del ranking', 'Verificación instantánea', 'Evidencias ilimitadas', 'Badge exclusivo'],
  },
};

// ═══════════════════════════════════════════════════════════
// SCORE IMPACTS
// ═══════════════════════════════════════════════════════════

const SCORE_IMPACTS = {
  verification_accepted: +5,
  verification_rejected: -3,
  verification_needs_review: -1,
  report_received: -10,
  fraud_detected: -25,
  quest_completed: +2,
  streak_milestone: +3,
  badge_unlocked: +1,
  account_warning: -5,
  admin_pardon: +10,
  rehabilitation: +15, // Rehabilitation bonus
};

// ═══════════════════════════════════════════════════════════
// FRAUD PATTERNS
// ═══════════════════════════════════════════════════════════

const FRAUD_THRESHOLDS = {
  maxRejectionsInDay: 3,
  maxRejectionsInWeek: 5,
  duplicateEvidenceWindow: 24,
  suspiciousPatternWindow: 7,
};

// ═══════════════════════════════════════════════════════════
// COOLDOWN & REHABILITATION
// ═══════════════════════════════════════════════════════════

const COOLDOWN_DURATION_DAYS = 7; // After fraud, no positive gains for 7 days
const REHABILITATION_DAYS = 30;  // Maintain 🌿 for 30 days to rehabilitate
const REHABILITATION_BONUS = 15;  // Points restored after rehabilitation

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AdminGateway,
  ) {}

  // ─── GET USER TRUST PROFILE ───────────────────────
  async getTrustProfile(userId: string) {
    this.logger.log(`GetTrustProfile: userId=${userId}`);

    let trust = await this.prisma.userTrust.findUnique({
      where: { userId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!trust) {
      trust = await this.prisma.userTrust.create({
        data: { userId },
        include: { events: true },
      });
    }

    // Check cooldown status
    const now = new Date();
    const isOnCooldown = trust.cooldownUntil ? now < trust.cooldownUntil : false;
    const cooldownRemaining = isOnCooldown
      ? Math.ceil((trust.cooldownUntil!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Check rehabilitation status
    let rehabilitation: { eligible: boolean; message: string; daysRemaining: number } | null = null;
    if (trust.lastFraudAt && trust.level === 'very_trustworthy') {
      const daysSinceFraud = Math.floor((now.getTime() - trust.lastFraudAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysAtLevel = await this.getDaysAtLevel(userId, 'very_trustworthy');

      if (daysAtLevel >= REHABILITATION_DAYS && !trust.rehabilitatedAt) {
        rehabilitation = {
          eligible: true,
          message: `🎉 ¡Elegible para rehabilitación! Has mantenido nivel 🌿 por ${daysAtLevel} días.`,
          daysRemaining: 0,
        };
      } else if (daysAtLevel < REHABILITATION_DAYS) {
        rehabilitation = {
          eligible: false,
          message: `Mantén nivel 🌿 por ${REHABILITATION_DAYS - daysAtLevel} días más para rehabilitarte.`,
          daysRemaining: REHABILITATION_DAYS - daysAtLevel,
        };
      }
    }

    // Get user stats
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, level: true },
    });

    const daysSinceRegistration = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const levelInfo = TRUST_LEVELS[trust.level];

    const recentEvents = trust.events.map((e) => ({
      type: e.type,
      impact: e.impact,
      timestamp: e.createdAt,
      details: e.details,
    }));

    return {
      level: trust.level,
      levelEmoji: levelInfo.emoji,
      levelName: levelInfo.name,
      levelDescription: levelInfo.description,
      score: trust.score,
      scoreNormalized: `${trust.score}/100`,
      benefits: levelInfo.benefits,
      stats: {
        totalAccepted: trust.totalAccepted,
        totalRejected: trust.totalRejected,
        totalReports: trust.totalReports,
        fraudAttempts: trust.fraudAttempts,
        acceptanceRate: (trust.totalAccepted + trust.totalRejected) > 0
          ? `${Math.round((trust.totalAccepted / (trust.totalAccepted + trust.totalRejected)) * 100)}%`
          : 'N/A',
        daysSinceRegistration,
      },
      cooldown: {
        active: isOnCooldown,
        daysRemaining: cooldownRemaining,
        expiresAt: trust.cooldownUntil,
        message: isOnCooldown
          ? `⏳ En cooldown: ${cooldownRemaining} días restantes. Los puntos positivos no se aplican.`
          : '✅ Sin cooldown activo.',
      },
      rehabilitation,
      recentEvents,
      nextLevel: this.getNextLevel(trust.level, trust.score),
      lastEvaluated: trust.lastEvaluatedAt,
    };
  }

  // ─── RECORD TRUST EVENT (with cooldown check) ─────
  async recordEvent(
    userId: string,
    type: string,
    details?: any,
  ): Promise<{ newScore: number; newLevel: TrustLevel; levelChanged: boolean; cooldownApplied: boolean }> {
    this.logger.log(`RecordEvent: userId=${userId}, type=${type}`);

    let trust = await this.prisma.userTrust.findUnique({ where: { userId } });
    if (!trust) {
      trust = await this.prisma.userTrust.create({ data: { userId } });
    }

    // Calculate base impact
    let impact = SCORE_IMPACTS[type as keyof typeof SCORE_IMPACTS] || 0;

    // ─── COOLDOWN CHECK ──────────────────────────────
    // If user is on cooldown, block positive impacts
    const now = new Date();
    let cooldownApplied = false;

    if (impact > 0 && trust.cooldownUntil && now < trust.cooldownUntil) {
      this.logger.log(`Cooldown active for ${userId}: blocking +${impact} points`);
      impact = 0;
      cooldownApplied = true;
    }

    // ─── FRAUD DETECTION: SET COOLDOWN ───────────────
    if (type === 'fraud_detected') {
      const cooldownEnd = new Date(now.getTime() + COOLDOWN_DURATION_DAYS * 24 * 60 * 60 * 1000);

      // Only set cooldown if not already active (or extend if longer)
      if (!trust.cooldownUntil || cooldownEnd > trust.cooldownUntil) {
        await this.prisma.userTrust.update({
          where: { userId },
          data: {
            cooldownUntil: cooldownEnd,
            lastFraudAt: now,
            scoreBeforeFraud: trust.score,
          },
        });
        this.logger.log(`Cooldown set for ${userId}: ${COOLDOWN_DURATION_DAYS} days (until ${cooldownEnd.toISOString()})`);
      }
    }

    // Update score (clamped 0-100)
    const newScore = Math.max(0, Math.min(100, trust.score + impact));

    // Determine if level changed
    const oldLevel = trust.level;
    const newLevel = this.calculateLevel(newScore, trust);
    const levelChanged = oldLevel !== newLevel;

    // Update counters
    const updateData: any = {
      score: newScore,
      level: newLevel,
      lastEvaluatedAt: now,
    };

    if (type === 'verification_accepted') updateData.totalAccepted = { increment: 1 };
    if (type === 'verification_rejected') updateData.totalRejected = { increment: 1 };
    if (type === 'report_received') updateData.totalReports = { increment: 1 };
    if (type === 'fraud_detected') updateData.fraudAttempts = { increment: 1 };

    // Update trust
    trust = await this.prisma.userTrust.update({
      where: { userId },
      data: updateData,
    });

    // Record event
    await this.prisma.trustEvent.create({
      data: {
        userId,
        type,
        impact,
        details: {
          ...details,
          cooldownApplied,
          previousScore: trust.score,
          newScore,
        },
      },
    });

    if (levelChanged) {
      this.logger.log(`Trust level changed: ${oldLevel} → ${newLevel} for user ${userId}`);
    }
    if (cooldownApplied) {
      this.logger.log(`Cooldown blocked positive points for ${userId}`);
    }

    return { newScore, newLevel, levelChanged, cooldownApplied };
  }

  // ─── REHABILITATION ──────────────────────────────
  async rehabilitate(userId: string): Promise<{
    rehabilitated: boolean;
    message: string;
    previousScore?: number;
    newScore?: number;
    pointsRestored?: number;
  }> {
    this.logger.log(`Rehabilitate: userId=${userId}`);

    const trust = await this.prisma.userTrust.findUnique({ where: { userId } });
    if (!trust) throw new NotFoundException('Trust profile not found');

    // Check if already rehabilitated
    if (trust.rehabilitatedAt) {
      return {
        rehabilitated: false,
        message: '✅ Ya has sido rehabilitado anteriormente.',
      };
    }

    // Check eligibility
    if (!trust.lastFraudAt) {
      return {
        rehabilitated: false,
        message: '❌ No hay fraude registrado. No necesitas rehabilitación.',
      };
    }

    if (trust.level !== 'very_trustworthy') {
      return {
        rehabilitated: false,
        message: `❌ Necesitas estar en nivel 🌿 Muy Confiable. Nivel actual: ${TRUST_LEVELS[trust.level].emoji} ${TRUST_LEVELS[trust.level].name}.`,
      };
    }

    const daysAtLevel = await this.getDaysAtLevel(userId, 'very_trustworthy');
    if (daysAtLevel < REHABILITATION_DAYS) {
      return {
        rehabilitated: false,
        message: `❌ Necesitas ${REHABILITATION_DAYS - daysAtLevel} días más en nivel 🌿.`,
      };
    }

    // ─── REHABILITATE ───────────────────────────────
    const previousScore = trust.score;
    const newScore = Math.min(100, trust.score + REHABILITATION_BONUS);

    await this.prisma.userTrust.update({
      where: { userId },
      data: {
        score: newScore,
        rehabilitatedAt: new Date(),
        cooldownUntil: null, // Clear cooldown
      },
    });

    // Record rehabilitation event
    await this.prisma.trustEvent.create({
      data: {
        userId,
        type: 'rehabilitation',
        impact: REHABILITATION_BONUS,
        details: {
          previousScore,
          newScore,
          daysAtLevel,
          message: 'Rehabilitación completada. Puntos restaurados.',
        },
      },
    });

    this.logger.log(`Rehabilitated ${userId}: ${previousScore} → ${newScore} (+${REHABILITATION_BONUS})`);

    return {
      rehabilitated: true,
      message: `🎉 ¡Rehabilitación completada! +${REHABILITATION_BONUS} puntos restaurados.`,
      previousScore,
      newScore,
      pointsRestored: REHABILITATION_BONUS,
    };
  }

  // ─── CHECK FRAUD PATTERNS ─────────────────────────
  async checkFraudPatterns(userId: string): Promise<{
    isSuspicious: boolean;
    patterns: string[];
    recommendation: string;
  }> {
    this.logger.log(`CheckFraudPatterns: userId=${userId}`);

    const patterns: string[] = [];

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rejectionsToday = await this.prisma.trustEvent.count({
      where: { userId, type: 'verification_rejected', createdAt: { gte: dayAgo } },
    });
    if (rejectionsToday >= FRAUD_THRESHOLDS.maxRejectionsInDay) {
      patterns.push(`${rejectionsToday} rechazos en las últimas 24h`);
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rejectionsWeek = await this.prisma.trustEvent.count({
      where: { userId, type: 'verification_rejected', createdAt: { gte: weekAgo } },
    });
    if (rejectionsWeek >= FRAUD_THRESHOLDS.maxRejectionsInWeek) {
      patterns.push(`${rejectionsWeek} rechazos en los últimos 7 días`);
    }

    const duplicateCheck = await this.prisma.questVerification.groupBy({
      by: ['evidenceUrl'],
      where: { userId, evidenceUrl: { not: null }, status: 'verified' },
      having: { evidenceUrl: { _count: { gt: 1 } } },
    });
    if (duplicateCheck.length > 0) {
      patterns.push(`${duplicateCheck.length} evidencia(s) duplicada(s)`);
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rapidSubmissions = await this.prisma.questVerification.count({
      where: { userId, createdAt: { gte: hourAgo } },
    });
    if (rapidSubmissions >= 5) {
      patterns.push(`${rapidSubmissions} envíos en la última hora`);
    }

    const isSuspicious = patterns.length > 0;
    return {
      isSuspicious,
      patterns,
      recommendation: isSuspicious
        ? 'Se requiere revisión manual.'
        : 'Comportamiento normal.',
    };
  }

  // ─── FRAUD ALERTS (Real-time WebSocket) ──────────
  async emitFraudAlert(userId: string, patterns: string[], severity: 'warning' | 'critical') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, level: true },
    });

    const trust = await this.prisma.userTrust.findUnique({ where: { userId } });

    const alert = {
      type: 'fraud_alert',
      severity,
      timestamp: new Date().toISOString(),
      user: user || { id: userId, username: 'Unknown' },
      trust: trust ? {
        score: trust.score,
        level: trust.level,
        fraudAttempts: trust.fraudAttempts,
      } : null,
      patterns,
      message: severity === 'critical'
        ? `🔴 FRAUDE CRÍTICO: ${user?.username || userId} — ${patterns.length} patrón(es) detectado(s)`
        : `⚠️ Comportamiento sospechoso: ${user?.username || userId} — ${patterns.join(', ')}`,
    };

    // Push to all connected admins via WebSocket
    this.gateway.pushEvent('fraud-alert', alert);

    // Also log to activity
    this.logger.warn(`🚨 FRAUD ALERT [${severity}]: ${user?.username || userId} — ${patterns.join(', ')}`);

    return alert;
  }

  // ─── CHECK AND ALERT (called after verification) ──
  async checkAndAlert(userId: string): Promise<{ alerted: boolean; alert?: any }> {
    const result = await this.checkFraudPatterns(userId);

    if (result.isSuspicious) {
      const severity = result.patterns.length >= 3 ? 'critical' : 'warning';
      const alert = await this.emitFraudAlert(userId, result.patterns, severity);
      return { alerted: true, alert };
    }

    return { alerted: false };
  }

  // ─── ADMIN: PARDON ───────────────────────────────
  async pardonUser(userId: string, adminId: string, reason: string) {
    this.logger.log(`PardonUser: userId=${userId}, admin=${adminId}`);

    await this.recordEvent(userId, 'admin_pardon', { adminId, reason });

    return { message: '✅ User pardoned. Trust score improved.' };
  }

  // ─── ADMIN: WARN ─────────────────────────────────
  async warnUser(userId: string, adminId: string, reason: string) {
    this.logger.log(`WarnUser: userId=${userId}, admin=${adminId}`);

    await this.recordEvent(userId, 'account_warning', { adminId, reason });

    return { message: '⚠️ Warning issued to user.' };
  }

  // ─── GET TRUST LEADERBOARD ────────────────────────
  async getTrustLeaderboard(limit: number = 20) {
    const trusts = await this.prisma.userTrust.findMany({
      take: limit,
      orderBy: { score: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true, level: true } },
      },
    });

    return trusts.map((t, i) => ({
      rank: i + 1,
      ...t.user,
      trustLevel: t.level,
      trustEmoji: TRUST_LEVELS[t.level].emoji,
      score: t.score,
      totalAccepted: t.totalAccepted,
      acceptanceRate: (t.totalAccepted + t.totalRejected) > 0
        ? Math.round((t.totalAccepted / (t.totalAccepted + t.totalRejected)) * 100)
        : 0,
    }));
  }

  // ─── GET TRUST STATS (Admin) ──────────────────────
  async getTrustStats() {
    const [total, byLevel, recentEvents, suspiciousUsers, onCooldown, rehabilitated] = await Promise.all([
      this.prisma.userTrust.count(),
      this.prisma.userTrust.groupBy({ by: ['level'], _count: true }),
      this.prisma.trustEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          trust: { include: { user: { select: { id: true, username: true } } } },
        },
      }),
      this.prisma.userTrust.findMany({
        where: { fraudAttempts: { gt: 0 } },
        include: { user: { select: { id: true, username: true, email: true } } },
        orderBy: { fraudAttempts: 'desc' },
        take: 10,
      }),
      // Users currently on cooldown
      this.prisma.userTrust.findMany({
        where: { cooldownUntil: { gt: new Date() } },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { cooldownUntil: 'desc' },
      }),
      // Rehabilitated users
      this.prisma.userTrust.findMany({
        where: { rehabilitatedAt: { not: null } },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { rehabilitatedAt: 'desc' },
      }),
    ]);

    const totalScore = await this.prisma.userTrust.aggregate({ _avg: { score: true } });

    return {
      overview: {
        totalUsers: total,
        averageScore: Math.round(totalScore._avg.score || 50),
        distribution: byLevel.map((l) => ({
          level: l.level,
          emoji: TRUST_LEVELS[l.level].emoji,
          name: TRUST_LEVELS[l.level].name,
          count: l._count,
        })),
      },
      cooldowns: {
        active: onCooldown.length,
        users: onCooldown.map((c) => ({
          ...c.user,
          cooldownUntil: c.cooldownUntil,
          daysRemaining: Math.ceil((c.cooldownUntil!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        })),
      },
      rehabilitations: {
        total: rehabilitated.length,
        users: rehabilitated.map((r) => ({
          ...r.user,
          rehabilitatedAt: r.rehabilitatedAt,
          score: r.score,
        })),
      },
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        type: e.type,
        impact: e.impact,
        details: e.details,
        createdAt: e.createdAt,
        user: e.trust?.user || null,
        impactEmoji: e.impact > 0 ? '✅' : e.impact < 0 ? '⚠️' : 'ℹ️',
      })),
      suspiciousUsers: suspiciousUsers.map((s) => ({
        ...s.user,
        trustScore: s.score,
        trustLevel: s.level,
        fraudAttempts: s.fraudAttempts,
      })),
    };
  }

  // ─── PRIVATE: Calculate Level ─────────────────────
  private calculateLevel(score: number, trust: any): TrustLevel {
    const userQuests = trust.totalAccepted || 0;
    if (score >= 80 && userQuests >= 50) return 'excellent';
    if (score >= 60 && userQuests >= 20) return 'very_trustworthy';
    if (score >= 30 && userQuests >= 5) return 'trustworthy';
    return 'new_user';
  }

  // ─── PRIVATE: Get Next Level ──────────────────────
  private getNextLevel(currentLevel: TrustLevel, score: number) {
    const levels: TrustLevel[] = ['new_user', 'trustworthy', 'very_trustworthy', 'excellent'];
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex >= levels.length - 1) return null;

    const nextLevel = levels[currentIndex + 1];
    const nextInfo = TRUST_LEVELS[nextLevel];
    return {
      level: nextLevel,
      name: nextInfo.name,
      emoji: nextInfo.emoji,
      scoreNeeded: Math.max(0, nextInfo.minScore - score),
      description: nextInfo.description,
    };
  }

  // ─── PRIVATE: Get Days at Level ───────────────────
  private async getDaysAtLevel(userId: string, level: TrustLevel): Promise<number> {
    // Find the first event where the level changed TO this level
    const levelChangeEvent = await this.prisma.trustEvent.findFirst({
      where: {
        userId,
        type: { in: ['verification_accepted', 'rehabilitation', 'admin_pardon'] },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!levelChangeEvent) return 0;

    const daysSince = Math.floor(
      (Date.now() - levelChangeEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSince;
  }
}
