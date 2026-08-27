import { Module } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';

@Module({
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
