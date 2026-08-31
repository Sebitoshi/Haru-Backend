import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotiController } from './boti.controller';
import { BotiService } from './boti.service';
import { BotiMemoryService } from './boti-memory.service';
import { BotiMoodService } from './boti-mood.service';
import { BotiAI } from './boti-ai.service';
import { BotiProfileService } from './boti-profile.service';
import {
  BotiMemory,
  BotiMemorySchema,
} from './schemas/boti-memory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotiMemory.name, schema: BotiMemorySchema },
    ]),
  ],
  controllers: [BotiController],
  providers: [
    BotiService,
    BotiMemoryService,
    BotiMoodService,
    BotiAI,
    BotiProfileService,
  ],
  exports: [BotiService, BotiMemoryService, BotiMoodService, BotiAI, BotiProfileService],
})
export class BotiModule {}
