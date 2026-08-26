import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://boti:boti_mongo_secret_2024@localhost:27017/boti_memory?authSource=admin',
        ),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MongoModule {}
