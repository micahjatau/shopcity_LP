import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp({ enableShutdownHooks: true });

  await app.listen({
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 3000),
  });
}

void bootstrap();
