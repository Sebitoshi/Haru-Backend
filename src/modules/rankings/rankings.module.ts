import { Module } from '@nestjs/common';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';
import { RankingNotificationService } from './ranking-notification.service';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [AchievementsModule],
  controllers: [RankingsController],
  providers: [RankingsService, RankingNotificationService],
  exports: [RankingsService, RankingNotificationService],
})
export class RankingsModule {}
