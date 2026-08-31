import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGateway } from './admin.gateway';
import { UsersModule } from '../users/users.module';
import { QuestsModule } from '../quests/quests.module';
import { VerificationModule } from '../verification/verification.module';
import { StreaksModule } from '../streaks/streaks.module';
import { EconomyModule } from '../economy/economy.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { ShopModule } from '../shop/shop.module';
import { TrustModule } from '../trust/trust.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '60s' }, // confirmation tokens expire in 60s
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    QuestsModule,
    VerificationModule,
    StreaksModule,
    EconomyModule,
    AchievementsModule,
    ShopModule,
    forwardRef(() => TrustModule),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGateway],
  exports: [AdminService, AdminGateway],
})
export class AdminModule {}
