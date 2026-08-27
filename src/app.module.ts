import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from './modules/auth/guards/admin.guard';
import { AdminThrottlerGuard } from './modules/auth/guards/admin-throttler.guard';
import { CloudinaryModule } from './modules/common/cloudinary/cloudinary.module';
import { MongoModule } from './modules/common/mongo/mongo.module';
import { GroqModule } from './modules/common/groq/groq.module';
import { GeofenceModule } from './modules/common/geofence/geofence.module';
import { EmailModule } from './modules/common/email/email.module';
import { AdminModule } from './modules/admin/admin.module';

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

    // Groq Vision AI (global)
    GroqModule,

    // Geofence (OpenStreetMap - free)
    GeofenceModule,

    // Email (Resend — free tier: 100 emails/day)
    EmailModule,

    // Auth + all modules
    AuthModule,

    // Admin panel (separate endpoints for admin access)
    AdminModule,
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
    // Admin role guard — checks @Admin() / @Roles() decorators
    {
      provide: APP_GUARD,
      useClass: AdminGuard,
    },
    // Global rate limiting guard (admins get unlimited)
    {
      provide: APP_GUARD,
      useClass: AdminThrottlerGuard,
    },
  ],
})
export class AppModule {}
