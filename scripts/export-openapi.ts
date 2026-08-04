import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import prettier from 'prettier';
async function main(): Promise<void> {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://shopcity:shopcity@127.0.0.1:5432/shopcity_test?schema=public';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ?? 'test-session-secret-test-session-secret';
  process.env.CSRF_SECRET =
    process.env.CSRF_SECRET ?? 'test-csrf-secret-test-csrf-secret';
  process.env.CORS_ORIGIN_ALLOWLIST =
    process.env.CORS_ORIGIN_ALLOWLIST ??
    'http://localhost:3000,http://127.0.0.1:3000';
  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
  process.env.SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ?? 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';

  // ts-node runs this script in CommonJS mode.
  const { createApp, buildOpenApiDocument } = require('../src/bootstrap');
  const app = await createApp({ enableDocs: false });
  const document = buildOpenApiDocument(app);
  const outputPath = resolve(process.cwd(), 'docs', 'api', 'openapi.json');

  const formatted = await prettier.format(JSON.stringify(document, null, 2), {
    parser: 'json',
  });

  await writeFile(outputPath, formatted, 'utf8');
  await app.close();
}

void main();
