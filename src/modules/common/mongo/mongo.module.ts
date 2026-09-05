import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

const DATABASE_CONNECTION_TOKEN = 'DatabaseConnection';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION_TOKEN,
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URI',
          'mongodb://boti:boti_mongo_secret_2024@localhost:27017/boti_memory?authSource=admin',
        );

        // Conexión en background: si MongoDB no está disponible, la API sigue
        // funcionando y solo la memoria de Boti se degrada (no derrumba el boot).
        let connection: mongoose.Connection;
        try {
          connection = mongoose.createConnection(uri, {
            serverSelectionTimeoutMS: 3000,
            bufferCommands: false,
          });
        } catch (error) {
          console.warn(
            `[Mongo] failed to create connection: ${error?.message ?? error}`,
          );
          connection = mongoose.createConnection();
        }

        connection.on('error', (error) => {
          console.warn(`[Mongo] connection error: ${error?.message ?? error}`);
        });

        return connection;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION_TOKEN],
})
export class MongoModule {}