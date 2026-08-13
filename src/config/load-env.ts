import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const localEnvPath = resolve(process.cwd(), '.env.local');
if (
  (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
  existsSync(localEnvPath)
) {
  loadDotenv({ path: localEnvPath });
}
