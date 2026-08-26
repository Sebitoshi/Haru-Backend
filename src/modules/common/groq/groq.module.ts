import { Module, Global } from '@nestjs/common';
import { GroqVisionService } from './groq-vision.service';

@Global()
@Module({
  providers: [GroqVisionService],
  exports: [GroqVisionService],
})
export class GroqModule {}
