import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadgeController } from './badge.controller';
import { BadgeService } from './badge.service';

@Module({
  controllers: [UsersController, BadgeController],
  providers: [UsersService, BadgeService],
  exports: [UsersService, BadgeService],
})
export class UsersModule {}
