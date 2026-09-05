import { ConfigService } from '@nestjs/config';
import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);

  const configuredPort = configService.get<string>('PORT');
  const port = configuredPort && configuredPort !== '0' && configuredPort !== ''
    ? parseInt(configuredPort, 10)
    : 3000;
  await app.listen(port);

  console.log(`\n  🌸 HARU API is running!\n  📡 Server:    http://localhost:${port}\n  📚 Swagger:   http://localhost:${port}/docs\n  🔑 API Base:  http://localhost:${port}/api\n`);
}
bootstrap();
