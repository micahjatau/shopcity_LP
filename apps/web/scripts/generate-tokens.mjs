import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const cssVars = new Map();

function toVarName(parts) {
  return `--sc-${parts.join('-')}`;
}

function resolveToken(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const aliasMatch = value.match(/^\{(.+)\}$/);
  if (!aliasMatch) {
    return value;
  }

  const alias = aliasMatch[1].split('.');
  return `var(${toVarName(alias)})`;
}

function walk(node, parts = []) {
  for (const [key, value] of Object.entries(node)) {
    const nextParts = [...parts, key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walk(value, nextParts);
      continue;
    }

    cssVars.set(toVarName(nextParts), resolveToken(value));
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

for (const [name, value] of cssVars) {
  lines.push(`  ${name}: ${value};`);
}

lines.push('}');
lines.push('');
lines.push('html {');
lines.push('  color-scheme: light;');
lines.push('  font-family: var(--sc-font-family-sans);');
lines.push('  background: var(--sc-color-semantic-canvas);');
lines.push('  color: var(--sc-color-semantic-textPrimary);');
lines.push('}');
lines.push('');
lines.push('* {');
lines.push('  box-sizing: border-box;');
lines.push('}');
lines.push('');
lines.push('body {');
lines.push('  margin: 0;');
lines.push('  min-height: 100vh;');
lines.push('  background: var(--sc-color-semantic-canvas);');
lines.push('  color: var(--sc-color-semantic-textPrimary);');
lines.push('}');
lines.push('');
lines.push('a {');
lines.push('  color: inherit;');
lines.push('  text-decoration: none;');
lines.push('}');
lines.push('');
lines.push('button, input, textarea, select {');
lines.push('  font: inherit;');
lines.push('}');

await writeFile(outputPath, `${lines.join('\n')}\n`);
console.log(`Generated ${path.relative(rootDir, outputPath)}`);
