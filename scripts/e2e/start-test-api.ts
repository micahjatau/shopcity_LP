import { createApp } from '../../src/bootstrap';

async function main(): Promise<void> {
  const app = await createApp({ enableDocs: false, enableShutdownHooks: true });
  await app.listen({
    host: '127.0.0.1',
    port: Number(process.env.PORT ?? 3000),
  });
}

void main().catch(() => {
  process.stderr.write(
    'Test API startup failed; no environment values or request details were logged.\n',
  );
  process.exitCode = 1;
});
