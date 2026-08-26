import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { GroqVisionService } from '../common/groq/groq-vision.service';
import { EvidenceType, VerificationStatus } from '@prisma/client';

// ─── AI ANALYSIS MOCK ───────────────────────────────
// In production, this calls a real AI model (OpenAI Vision, etc.)
interface AIAnalysisResult {
  confidence: number;      // 0-100
  isAuthentic: boolean;    // not a screenshot, not recycled
  tags: string[];          // detected objects/concepts
  notes: string;           // analysis notes
  matchesQuest: boolean;   // does it match the quest requirements?
  flags: string[];         // any warnings
}

// ─── EVIDENCE VALIDATION ────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
const MAX_ATTEMPTS = 3;
const AUTO_VERIFY_THRESHOLD = 80;
const REVIEW_THRESHOLD = 50;

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private groqVision: GroqVisionService,
  ) {}

  // ─── SUBMIT EVIDENCE ──────────────────────────────
  async submitEvidence(
    userId: string,
    questId: string,
    file?: Express.Multer.File,
    body?: { evidenceType?: string; text?: string; lat?: number; lng?: number; locationName?: string },
  ) {
    console.log(`[VerificationService] SubmitEvidence: userId=${userId}, questId=${questId}`);

    // Validate user has this quest in_progress
    const userQuest = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest) throw new NotFoundException('Quest not found in your list');
    if (userQuest.status !== 'in_progress') {
      throw new BadRequestException(`Quest is not in progress (status: ${userQuest.status})`);
    }

    // Check attempt limit
    const existingAttempts = await this.prisma.questVerification.count({
      where: { userId, questId, status: { in: ['rejected', 'needs_review'] } },
    });

    if (existingAttempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        `Maximum ${MAX_ATTEMPTS} verification attempts reached. This quest requires manual review.`,
      );
    }

    // Determine evidence type
    let evidenceType: EvidenceType;
    let evidenceUrl: string | null = null;
    let evidenceText: string | null = null;
    let location: any = null;

    if (file) {
      // Validate file
      this.validateFile(file);

      // Upload to Cloudinary
      const folder = `haru/evidence/${userId}`;
      const result = await this.cloudinary.uploadImage(file, folder);
      evidenceUrl = result.url;
      evidenceType = this.getEvidenceTypeFromMime(file.mimetype);
    } else if (body?.text) {
      evidenceType = 'text';
      evidenceText = body.text;
    } else if (body?.lat && body?.lng) {
      evidenceType = 'location';
      location = { lat: body.lat, lng: body.lng, name: body.locationName || null };
    } else {
      throw new BadRequestException('Provide a file, text description, or location');
    }

    // Check for duplicate evidence (same URL across different quests)
    if (evidenceUrl) {
      const duplicate = await this.prisma.questVerification.findFirst({
        where: {
          userId,
          evidenceUrl,
          questId: { not: questId },
          status: 'verified',
        },
      });

      if (duplicate) {
        throw new ConflictException('This evidence was already used for another quest');
      }
    }

    // Create verification record
    const verification = await this.prisma.questVerification.create({
      data: {
        userId,
        questId,
        userQuestId: userQuest.id,
        evidenceType,
        evidenceUrl,
        evidenceText,
        location,
        status: 'analyzing',
        attemptNumber: existingAttempts + 1,
      },
    });

    console.log(`[VerificationService] SubmitEvidence: Created ${verification.id} (${evidenceType}), attempt ${existingAttempts + 1}/${MAX_ATTEMPTS}`);

    // Run AI analysis asynchronously (in real app, use queue)
    const analysis = await this.analyzeEvidence(verification, userQuest.quest);

    // Update with analysis results
    const updated = await this.prisma.questVerification.update({
      where: { id: verification.id },
      data: {
        status: analysis.status,
        aiAnalysis: analysis as any,
        rejectionReason: analysis.status === 'rejected' ? analysis.notes : null,
        reviewedAt: analysis.status !== 'analyzing' ? new Date() : null,
      },
    });

    console.log(`[VerificationService] Analyze: ${analysis.status} (confidence: ${analysis.confidence}%)`);

    return {
      verification: updated,
      analysis: {
        status: analysis.status,
        confidence: analysis.confidence,
        tags: analysis.tags,
        notes: analysis.notes,
        matchesQuest: analysis.matchesQuest,
        flags: analysis.flags,
      },
      attempt: existingAttempts + 1,
      maxAttempts: MAX_ATTEMPTS,
      message: this.getStatusMessage(analysis.status, analysis.confidence),
    };
  }

  // ─── GET VERIFICATION STATUS ──────────────────────
  async getVerificationStatus(userId: string, questId: string) {
    console.log(`[VerificationService] GetStatus: userId=${userId}, questId=${questId}`);

    const verifications = await this.prisma.questVerification.findMany({
      where: { userId, questId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        evidenceType: true,
        status: true,
        aiAnalysis: true,
        rejectionReason: true,
        attemptNumber: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    const latest = verifications[0];
    const verifiedCount = verifications.filter((v) => v.status === 'verified').length;
    const rejectedCount = verifications.filter((v) => v.status === 'rejected').length;

    return {
      questId,
      totalAttempts: verifications.length,
      verifiedCount,
      rejectedCount,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - rejectedCount),
      latestVerification: latest || null,
      allVerifications: verifications,
    };
  }

  // ─── GET USER'S ALL VERIFICATIONS ─────────────────
  async getUserVerifications(userId: string, status?: string) {
    console.log(`[VerificationService] GetUserVerifications: userId=${userId}`);

    const where: any = { userId };
    if (status) where.status = status;

    const verifications = await this.prisma.questVerification.findMany({
      where,
      include: {
        quest: {
          select: { id: true, title: true, category: true, difficulty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return verifications.map((v) => ({
      id: v.id,
      questId: v.questId,
      questTitle: v.quest.title,
      questCategory: v.quest.category,
      evidenceType: v.evidenceType,
      status: v.status,
      confidence: (v.aiAnalysis as any)?.confidence || null,
      attemptNumber: v.attemptNumber,
      submittedAt: v.submittedAt,
      reviewedAt: v.reviewedAt,
    }));
  }

  // ─── MANUAL REVIEW (Admin) ────────────────────────
  async manualReview(
    verificationId: string,
    reviewerId: string,
    decision: 'verified' | 'rejected',
    note?: string,
  ) {
    console.log(`[VerificationService] ManualReview: ${verificationId} → ${decision}`);

    const verification = await this.prisma.questVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) throw new NotFoundException('Verification not found');
    if (verification.status === 'verified') {
      throw new BadRequestException('Already verified');
    }

    const updated = await this.prisma.questVerification.update({
      where: { id: verificationId },
      data: {
        status: decision,
        reviewerId,
        reviewNote: note || null,
        reviewedAt: new Date(),
      },
    });

    console.log(`[VerificationService] ManualReview: OK — ${decision}`);

    return {
      verification: updated,
      message: decision === 'verified'
        ? '✅ Evidence verified manually'
        : '🔴 Evidence rejected',
    };
  }

  // ─── PRIVATE: AI Analysis ─────────────────────────
  private async analyzeEvidence(
    verification: any,
    quest: any,
  ): Promise<AIAnalysisResult & { status: VerificationStatus }> {
    console.log(`[VerificationService] AnalyzeEvidence: type=${verification.evidenceType}, quest="${quest.title}"`);
    console.log(`[VerificationService] Groq available: ${this.groqVision.isAvailable}`);

    let aiResult: any;

    switch (verification.evidenceType) {
      case 'photo':
      case 'video':
        // Use Groq Vision API for real image analysis
        aiResult = await this.groqVision.analyzeImage(
          verification.evidenceUrl,
          quest.title,
          quest.category,
          quest.description,
        );
        break;

      case 'text':
        // Use Groq for text analysis
        aiResult = await this.groqVision.analyzeText(
          verification.evidenceText || '',
          quest.title,
          quest.category,
          quest.description,
        );
        break;

      case 'location':
        // Location is auto-verified (GPS data is trustworthy)
        aiResult = {
          confidence: 85,
          isAuthentic: true,
          tags: ['location', 'gps'],
          notes: `Location data provided: ${verification.location?.lat}, ${verification.location?.lng}`,
          matchesQuest: true,
          flags: [],
          rawResponse: 'location_auto_verified',
        };
        break;

      default:
        aiResult = {
          confidence: 50,
          isAuthentic: true,
          tags: ['unknown'],
          notes: 'Unknown evidence type',
          matchesQuest: false,
          flags: ['unknown_type'],
          rawResponse: 'unknown_type',
        };
    }

    // Determine status based on confidence
    let status: VerificationStatus;
    if (aiResult.confidence >= AUTO_VERIFY_THRESHOLD && aiResult.isAuthentic && aiResult.matchesQuest) {
      status = 'verified';
    } else if (aiResult.confidence >= REVIEW_THRESHOLD) {
      status = 'needs_review';
    } else {
      status = 'rejected';
    }

    // If this is attempt 3 and still uncertain, force review
    if (verification.attemptNumber >= MAX_ATTEMPTS && status !== 'verified') {
      status = 'needs_review';
    }

    console.log(`[VerificationService] AI Result: confidence=${aiResult.confidence}%, status=${status}, tags=[${aiResult.tags.join(', ')}]`);

    return { ...aiResult, status };
  }

  // ─── PRIVATE: Generate Tags ───────────────────────
  private generateTags(category: string): string[] {
    const tagsByCategory: Record<string, string[]> = {
      nature: ['outdoor', 'nature', 'plants', 'sky', 'environment'],
      creativity: ['creative', 'art', 'drawing', 'writing'],
      kindness: ['social', 'kindness', 'helping'],
      learning: ['education', 'knowledge', 'books'],
      movement: ['exercise', '运动', 'fitness', 'outdoor'],
      social: ['people', 'conversation', 'social'],
      photography: ['photo', 'camera', 'composition'],
      relaxation: ['calm', 'peaceful', 'meditation'],
      adventure: ['exploration', 'new_place', 'discovery'],
    };
    const available = tagsByCategory[category] || ['general'];
    // Return 2-3 random tags
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  // ─── PRIVATE: Validate File ───────────────────────
  private validateFile(file: Express.Multer.File) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES];
    if (!allAllowed.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: images, videos, audio`,
      );
    }
  }

  // ─── PRIVATE: Get Evidence Type from MIME ──────────
  private getEvidenceTypeFromMime(mimetype: string): EvidenceType {
    if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'photo';
    if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'video';
    if (ALLOWED_AUDIO_TYPES.includes(mimetype)) return 'audio';
    return 'text';
  }

  // ─── PRIVATE: Status Message ──────────────────────
  private getStatusMessage(status: VerificationStatus, confidence: number): string {
    switch (status) {
      case 'verified':
        return `✅ Evidence verified! (${confidence}% confidence) Quest can be completed.`;
      case 'rejected':
        return `🔴 Evidence rejected. (${confidence}% confidence) Try again with different evidence.`;
      case 'needs_review':
        return `⚠️ Evidence needs review. (${confidence}% confidence) An admin will review it.`;
      case 'analyzing':
        return `🤖 Analyzing evidence...`;
      default:
        return `⏳ Verification pending`;
    }
  }
}
