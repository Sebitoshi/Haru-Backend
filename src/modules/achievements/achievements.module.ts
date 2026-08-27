import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { ProgressionModule } from '../progression/progression.module';

@Module({
  imports: [ProgressionModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
