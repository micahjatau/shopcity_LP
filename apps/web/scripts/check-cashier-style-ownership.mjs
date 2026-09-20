import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webRoot, '..', '..');

const routeFiles = [
  'app/(shell)/cashier/page.tsx',
  'app/(shell)/cashier/lookup/page.tsx',
  'app/(shell)/cashier/earn/page.tsx',
  'app/(shell)/cashier/redeem/page.tsx',
  'app/(shell)/cashier/transactions/page.tsx',
  'app/(shell)/cashier/sync/page.tsx',
];
const workflowFiles = [
  'components/workflows/cashier-transaction-route.tsx',
  'components/workflows/cashier-overview-lookup.tsx',
  'components/workflows/verified-card-lookup-step.tsx',
  'components/workflows/earn-transaction-form.tsx',
  'components/workflows/redeem-transaction-form.tsx',
];
const files = [...routeFiles, ...workflowFiles];
const failures = [];

for (const relative of files) {
  const file = path.join(webRoot, relative);
  const source = await readFile(file, 'utf8');
  if (/<style\b/i.test(source)) {
    failures.push(`${relative}: embedded <style> block remains`);
  }
  if (/\bCSSProperties\b/.test(source)) {
    failures.push(`${relative}: CSSProperties remains in the Cashier migration scope`);
  }
  if (/\bstyle\s*=/.test(source)) {
    failures.push(`${relative}: static inline style remains in the Cashier migration scope`);
  }
}

const cssFiles = [
  path.join(webRoot, 'styles', 'globals.css'),
  path.join(webRoot, 'styles', 'primitives.css'),
  path.join(webRoot, 'styles', 'cashier-design-system.css'),
  path.join(webRoot, 'styles', 'cashier-routes.css'),
];
const css = (await Promise.all(cssFiles.map((file) => readFile(file, 'utf8')))).join('\n');
for (const match of css.matchAll(/var\(--sc-color-(success|warning)-\d+\)/g)) {
  failures.push(`CSS: undefined numbered semantic state token ${match[0]}`);
}

if (failures.length) {
  console.error('Cashier style ownership check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Cashier style ownership checks passed for ${files.length} source files.`);
