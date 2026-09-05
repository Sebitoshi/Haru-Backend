import { Module, forwardRef } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { TrustModule } from '../trust/trust.module';
import { DiaryModule } from '../diary/diary.module';

@Module({
  imports: [CloudinaryModule, forwardRef(() => TrustModule), DiaryModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
