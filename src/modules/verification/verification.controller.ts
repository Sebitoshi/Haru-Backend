import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  Res,
  Request,
  UseInterceptors,
  UploadedFile,
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
import { VerificationService } from './verification.service';
import { GroqVisionService, BatchAnalysisItem } from '../common/groq/groq-vision.service';

type StreamResponse = {
  setHeader(name: string, value: string): void;
  flushHeaders(): void;
  write(chunk: string): void;
  end(): void;
};

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly groqVision: GroqVisionService,
  ) {}

  // ─── SUBMIT EVIDENCE (Photo/Video/Audio) ──────────
  @Post('submit/:questId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '📸 Submit evidence for quest verification',
    description: 'Upload photo, video, audio, or text evidence. AI analyzes and verifies.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Photo, video, or audio file' },
        text: { type: 'string', description: 'Text description (if no file)' },
        lat: { type: 'number', description: 'GPS latitude' },
        lng: { type: 'number', description: 'GPS longitude' },
        locationName: { type: 'string', description: 'Location name' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Evidence submitted and analyzed' })
  @ApiResponse({ status: 400, description: 'Invalid file or quest not in progress' })
  @ApiResponse({ status: 409, description: 'Duplicate evidence or max attempts reached' })
  async submitEvidence(
    @Request() req: any,
    @Param('questId') questId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { evidenceType?: string; text?: string; lat?: number; lng?: number; locationName?: string },
  ) {
    return this.verificationService.submitEvidence(req.user.id, questId, file, body);
  }

  // ─── SUBMIT TEXT EVIDENCE ─────────────────────────
  @Post('submit-text/:questId')
  @ApiOperation({
    summary: '📝 Submit text evidence for quest verification',
    description: 'Submit a text description as evidence.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Encontré una flor amarilla en el parque. Medía unos 5cm.' },
      },
      required: ['text'],
    },
  })
  @ApiResponse({ status: 201, description: 'Text evidence submitted and analyzed' })
  async submitTextEvidence(
    @Request() req: any,
    @Param('questId') questId: string,
    @Body() body: { text: string },
  ) {
    return this.verificationService.submitEvidence(req.user.id, questId, undefined, { text: body.text });
  }

  // ─── SUBMIT LOCATION EVIDENCE ─────────────────────
  @Post('submit-location/:questId')
  @ApiOperation({
    summary: '📍 Submit location evidence for quest verification',
    description: 'Submit GPS coordinates as evidence.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        lat: { type: 'number', example: 4.711 },
        lng: { type: 'number', example: -74.072 },
        locationName: { type: 'string', example: 'Parque del Chicó' },
      },
      required: ['lat', 'lng'],
    },
  })
  @ApiResponse({ status: 201, description: 'Location evidence submitted' })
  async submitLocationEvidence(
    @Request() req: any,
    @Param('questId') questId: string,
    @Body() body: { lat: number; lng: number; locationName?: string },
  ) {
    return this.verificationService.submitEvidence(req.user.id, questId, undefined, body);
  }

  // ─── GET VERIFICATION STATUS ──────────────────────
  @Get('status/:questId')
  @ApiOperation({ summary: 'Get verification status for a quest' })
  @ApiResponse({ status: 200, description: 'Returns verification attempts and status' })
  async getVerificationStatus(
    @Request() req: any,
    @Param('questId') questId: string,
  ) {
    return this.verificationService.getVerificationStatus(req.user.id, questId);
  }

  // ─── GET MY VERIFICATIONS ─────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get all my verification attempts' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'analyzing', 'verified', 'rejected', 'needs_review'] })
  @ApiResponse({ status: 200, description: 'Returns user verification history' })
  async getMyVerifications(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.verificationService.getUserVerifications(req.user.id, status);
  }

  // ─── BATCH ANALYSIS ──────────────────────────────
  @Post('batch')
  @ApiOperation({
    summary: '🤖 Batch analyze multiple evidence items in parallel',
    description: 'Analyze up to 10 evidence items simultaneously for faster processing.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          maxItems: 10,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['image', 'text', 'audio'] },
              imageUrl: { type: 'string' },
              text: { type: 'string' },
              questTitle: { type: 'string' },
              questCategory: { type: 'string' },
              questDescription: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns analysis for each item' })
  async batchAnalyze(@Body() body: { items: BatchAnalysisItem[] }) {
    const items = (body.items || []).slice(0, 10); // Max 10
    return this.groqVision.analyzeBatch(items);
  }

  // ─── STREAMING BATCH ANALYSIS (SSE) ──────────────
  @Post('batch-stream')
  @ApiOperation({
    summary: '⚡ Streaming batch — results sent as they complete (SSE)',
    description: 'For 10+ items. Each result is pushed as it finishes, not waiting for all.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['image', 'text', 'audio'] },
              imageUrl: { type: 'string' },
              text: { type: 'string' },
              questTitle: { type: 'string' },
              questCategory: { type: 'string' },
              questDescription: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async batchAnalyzeStream(
    @Req() req: any,
    @Res() res: StreamResponse,
    @Body() body: { items: BatchAnalysisItem[] },
  ) {
    const items = (body.items || []).slice(0, 50);
    const total = items.length;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send total count first
    res.write(`data: ${JSON.stringify({ type: 'start', total })}\n\n`);

    let completed = 0;
    const startTime = Date.now();

    // Process items concurrently but emit results as they finish
    const promises = items.map(async (item) => {
      const itemStart = Date.now();
      try {
        let analysis;
        switch (item.type) {
          case 'image':
            analysis = await this.groqVision.analyzeImage(
              item.imageUrl!, item.questTitle, item.questCategory, item.questDescription,
            );
            break;
          case 'text':
            analysis = await this.groqVision.analyzeText(
              item.text!, item.questTitle, item.questCategory, item.questDescription,
            );
            break;
          case 'audio':
            const audioResult = await this.groqVision.analyzeAudio(
              item.audioBuffer!, item.audioMimeType || 'audio/mpeg',
              item.questTitle, item.questCategory, item.questDescription,
            );
            analysis = audioResult;
            break;
          default:
            analysis = { confidence: 0, tags: [], notes: 'Unknown type', matchesQuest: false, flags: ['unknown_type'] };
        }
        completed++;
        const event = {
          type: 'result',
          id: item.id,
          index: completed,
          total,
          analysis,
          duration: Date.now() - itemStart,
        };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        completed++;
        const event = {
          type: 'error',
          id: item.id,
          index: completed,
          total,
          error: error.message,
          duration: Date.now() - itemStart,
        };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    });

    await Promise.allSettled(promises);

    // Send completion event
    const finalEvent = {
      type: 'done',
      total,
      completed,
      totalDuration: Date.now() - startTime,
    };
    res.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
    res.end();
  }

  // ─── MANUAL REVIEW (Admin) ────────────────────────
  @Patch('review/:id')
  @ApiOperation({
    summary: '🔍 Admin: manually review evidence',
    description: 'Approve or reject evidence that needs manual review.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        decision: { type: 'string', enum: ['verified', 'rejected'] },
        note: { type: 'string', example: 'Evidence looks good' },
      },
      required: ['decision'],
    },
  })
  @ApiResponse({ status: 200, description: 'Review completed' })
  async manualReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { decision: 'verified' | 'rejected'; note?: string },
  ) {
    return this.verificationService.manualReview(id, req.user.id, body.decision, body.note);
  }
}
