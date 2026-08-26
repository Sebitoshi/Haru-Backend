import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotiController } from './boti.controller';
import { BotiService } from './boti.service';
import { BotiMemoryService } from './boti-memory.service';
import { BotiMoodService } from './boti-mood.service';
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
  providers: [BotiService, BotiMemoryService, BotiMoodService],
  exports: [BotiService, BotiMemoryService, BotiMoodService],
})
export class BotiModule {}
