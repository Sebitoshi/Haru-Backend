import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { TrustModule } from '../trust/trust.module';

@Module({
  imports: [CloudinaryModule, TrustModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
