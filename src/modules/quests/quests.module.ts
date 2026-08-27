import { Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { StreaksModule } from '../streaks/streaks.module';
import { ProgressionModule } from '../progression/progression.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [StreaksModule, ProgressionModule, AchievementsModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
