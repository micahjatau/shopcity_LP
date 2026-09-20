import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectorDefinitions } from './style-ownership-registry.mjs';

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
const shellFiles = [
  'components/app-shell.tsx',
  'components/app-sidebar.tsx',
  'components/app-topbar.tsx',
  'components/global-shell-search.tsx',
  'components/workflows/transaction-dashboard.tsx',
];
const files = [...routeFiles, ...workflowFiles, ...shellFiles];
const failures = [];

for (const relative of files) {
  const file = path.join(webRoot, relative);
  const source = await readFile(file, 'utf8');
  if (/<style\b/i.test(source)) {
    failures.push(`${relative}: embedded <style> block remains`);
  }
  if (/\bCSSProperties\b/.test(source)) {
    failures.push(
      `${relative}: CSSProperties remains in the Cashier migration scope`,
    );
  }
  if (/\bstyle\s*=/.test(source)) {
    failures.push(
      `${relative}: static inline style remains in the Cashier migration scope`,
    );
  }
}

const cssFiles = [
  path.join(webRoot, 'styles', 'globals.css'),
  path.join(webRoot, 'styles', 'primitives.css'),
  path.join(webRoot, 'styles', 'cashier-design-system.css'),
  path.join(webRoot, 'styles', 'cashier-routes.css'),
  path.join(webRoot, 'styles', 'shell-components.css'),
];
const cssContents = await Promise.all(
  cssFiles.map(async (file) => [file, await readFile(file, 'utf8')]),
);
const css = cssContents.map(([, source]) => source).join('\n');

function definesSelector(source, selector) {
  return [...source.matchAll(/([^{}]+)\{/g)].some(([, match]) => {
    const prelude = match.trim();
    return !prelude.startsWith('@') && prelude.includes(selector);
  });
}

export function findRegistryCoverageFailures(
  contents,
  definitions = selectorDefinitions,
) {
  const coverageFailures = [];
  for (const [selector, family] of definitions) {
    const ownerContents = contents.find(
      ([file]) => path.basename(file) === family.owner,
    )?.[1];
    if (!ownerContents || !definesSelector(ownerContents, selector)) {
      coverageFailures.push(
        `CSS: ${family.family} selector ${selector} has no definition in owner ${family.owner}`,
      );
    }
  }
  return coverageFailures;
}

export function findOwnershipFailures(contents, definitions = selectorDefinitions) {
  const ownershipFailures = [];
  for (const [selector, family] of definitions) {
    const files = contents
      .filter(([, source]) => definesSelector(source, selector))
      .map(([file]) => path.basename(file));
    for (const file of files) {
      if (file === family.owner) continue;
      const registeredException = family.exceptions?.find(
        (item) => item.file === file,
      );
      if (!registeredException) {
        ownershipFailures.push(
          `CSS: ${family.family} selector ${selector} is defined by ${file}; owner is ${family.owner}`,
        );
      }
    }
  }
  return ownershipFailures;
}

failures.push(...findRegistryCoverageFailures(cssContents));
failures.push(...findOwnershipFailures(cssContents));

for (const match of css.matchAll(/var\(--sc-color-(success|warning)-\d+\)/g)) {
  failures.push(`CSS: undefined numbered semantic state token ${match[0]}`);
}

if (failures.length) {
  console.error('Cashier style ownership check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Cashier style ownership checks passed for ${files.length} source files.`,
);
