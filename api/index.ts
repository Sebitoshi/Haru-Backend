import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/bootstrap';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  appPromise ??= createApp().then(async (app) => {
    await app.init();
    return app;
  });

  const app = await appPromise;
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance(request, response);
}