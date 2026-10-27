import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTokenResolver } from './token-validation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.resolve(
  rootDir,
  '..',
  '..',
  'docs',
  'frontend',
  'design-system',
  'tokens.json',
);
const outputPath = path.resolve(rootDir, 'styles', 'tokens.css');

const source = JSON.parse(await readFile(sourcePath, 'utf8'));

const lines = [];
lines.push(
  '/* This file is generated from docs/frontend/design-system/tokens.json. */',
);
lines.push(':root {');

const rawTokens = new Map();
const cssVars = new Map();

function toVarName(parts) {
  return `--sc-${parts.join('-')}`;
}

function walk(node, parts = []) {
  for (const [key, value] of Object.entries(node)) {
    const nextParts = [...parts, key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walk(value, nextParts);
      continue;
    }

    rawTokens.set(toVarName(nextParts), value);
  }
}

walk(source.color, ['color']);
walk(source.spacing, ['spacing']);
walk(source.radius, ['radius']);
walk(source.borderWidth, ['border-width']);
walk(source.font.family, ['font-family']);
walk(source.font.size, ['font-size']);
walk(source.font.lineHeight, ['line-height']);
walk(source.font.weight, ['font-weight']);
walk(source.size, ['size']);
walk(source.motion, ['motion']);
walk(source.breakpoint, ['breakpoint']);
walk(source.zIndex, ['z-index']);
walk(source.shadow, ['shadow']);
walk(source.prototype, ['prototype']);

const resolveToken = createTokenResolver(rawTokens);
for (const [name, value] of rawTokens) {
  cssVars.set(name, resolveToken(value, [name]));
}

for (const [name, value] of cssVars) {
  lines.push(`  ${name}: ${value};`);
}

lines.push('}');

await writeFile(outputPath, `${lines.join('\n')}\n`);
console.log(`Generated ${path.relative(rootDir, outputPath)}`);
