import { createApp } from './bootstrap';
import { resolveApiListenHost } from './config/local-cashier-test-session';

async function bootstrap() {
  const app = await createApp({ enableShutdownHooks: true });

  await app.listen({
    host: resolveApiListenHost(process.env.DEV_CASHIER_TEST_SESSION_ENABLED),
    port: Number(process.env.PORT ?? 3000),
  });
}

void bootstrap();
