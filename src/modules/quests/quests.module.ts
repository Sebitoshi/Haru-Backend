import { Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { StreaksModule } from '../streaks/streaks.module';
import { ProgressionModule } from '../progression/progression.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { RankingsModule } from '../rankings/rankings.module';
import { CollectionModule } from '../collection/collection.module';

@Module({
  imports: [StreaksModule, ProgressionModule, AchievementsModule, RankingsModule, CollectionModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
