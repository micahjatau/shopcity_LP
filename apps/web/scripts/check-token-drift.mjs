import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const generatedPath = path.resolve(rootDir, 'styles', 'tokens.css');

const generated = await readFile(generatedPath, 'utf8');
const result = spawnSync(
  process.execPath,
  [path.resolve(__dirname, 'generate-tokens.mjs')],
  {
    cwd: rootDir,
    encoding: 'utf8',
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || 'Token generation failed.\n');
  process.exit(result.status ?? 1);
}

const regenerated = await readFile(generatedPath, 'utf8');
if (generated !== regenerated) {
  console.error(
    'Token drift detected. Run `npm run tokens:generate` in apps/web and commit the updated file.',
  );
  process.exit(1);
}

console.log('Token outputs are in sync.');
