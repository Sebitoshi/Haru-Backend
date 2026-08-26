import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
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

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

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
