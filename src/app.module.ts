import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CloudinaryModule } from './modules/common/cloudinary/cloudinary.module';
import { MongoModule } from './modules/common/mongo/mongo.module';

@Module({
  imports: [
    // Environment variables available globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 60 requests per 60 seconds by default
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Prisma (global)
    PrismaModule,

    // MongoDB (global)
    MongoModule,

    // Cloudinary (global)
    CloudinaryModule,

    // Auth + all modules
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard - all routes protected by default
    // Use @Public() decorator to make routes public
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
