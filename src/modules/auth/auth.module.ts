import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Sibling modules in src/modules/
import { UsersModule } from '../users/users.module';
import { BotiModule } from '../boti/boti.module';
import { QuestsModule } from '../quests/quests.module';
import { VerificationModule } from '../verification/verification.module';
import { ProgressionModule } from '../progression/progression.module';
import { EconomyModule } from '../economy/economy.module';
import { ShopModule } from '../shop/shop.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomizationModule } from '../customization/customization.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { StreaksModule } from '../streaks/streaks.module';
import { FriendsModule } from '../friends/friends.module';
import { RankingsModule } from '../rankings/rankings.module';
import { CollectionModule } from '../collection/collection.module';
import { AiModule } from '../ai/ai.module';
import { TrustModule } from '../trust/trust.module';
import { DiaryModule } from '../diary/diary.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // Core modules
    UsersModule,
    BotiModule,

    // Game modules
    QuestsModule,
    VerificationModule,
    ProgressionModule,
    EconomyModule,
    ShopModule,
    InventoryModule,
    CustomizationModule,
    AchievementsModule,
    StreaksModule,

    // Social modules
    FriendsModule,
    RankingsModule,
    CollectionModule,

    // Intelligence modules
    AiModule,
    TrustModule,
    DiaryModule,

    // Communication
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
