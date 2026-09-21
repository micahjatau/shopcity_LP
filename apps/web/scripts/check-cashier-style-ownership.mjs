import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  knownStyleProperties,
  selectorDefinitions,
} from './style-ownership-registry.mjs';

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

function isCssIdentifierCharacter(character) {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return (
    character === '-' ||
    character === '_' ||
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
}

function containsSelectorToken(prelude, selector) {
  let offset = prelude.indexOf(selector);
  while (offset !== -1) {
    const nextCharacter = prelude[offset + selector.length];
    if (!isCssIdentifierCharacter(nextCharacter)) return true;
    offset = prelude.indexOf(selector, offset + 1);
  }
  return false;
}

function definesSelector(source, selector) {
  return [...source.matchAll(/([^{}]+)\{/g)].some(([, match]) => {
    const prelude = match.trim();
    return !prelude.startsWith('@') && containsSelectorToken(prelude, selector);
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

function declaredProperties(source, selector) {
  const properties = new Set();
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!containsSelectorToken(match[1], selector)) continue;
    for (const declaration of match[2].matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)) {
      properties.add(declaration[1]);
    }
  }
  return properties;
}

export function findOwnershipFailures(
  contents,
  definitions = selectorDefinitions,
) {
  const ownershipFailures = [];
  for (const [selector, family] of definitions) {
    for (const [filePath, source] of contents) {
      const file = path.basename(filePath);
      if (file === family.owner) continue;
      const properties = declaredProperties(source, selector);
      if (!properties.size) continue;
      const registeredException = family.exceptions?.find(
        (item) => item.file === file,
      );
      if (!registeredException) {
        ownershipFailures.push(
          `CSS: ${family.family} selector ${selector} is defined by ${file}; owner is ${family.owner}`,
        );
        continue;
      }
      const allowed = new Set(registeredException.properties ?? []);
      for (const property of properties) {
        if (!allowed.has(property)) {
          ownershipFailures.push(
            `CSS: ${family.family} selector ${selector} property ${property} is defined by ${file}; allowed exception properties are ${[...allowed].join(', ') || 'none'}`,
          );
        }
      }
    }
  }
  return ownershipFailures;
}

export function findRegistryExceptionFailures(
  definitions = selectorDefinitions,
  knownDefinitions = selectorDefinitions,
) {
  const failures = [];
  for (const [selector, family] of definitions) {
    if (!knownDefinitions.has(selector)) {
      failures.push(`Registry: unknown selector ${selector}`);
    }
    for (const exception of family.exceptions ?? []) {
      if (!Array.isArray(exception.properties)) {
        failures.push(
          `Registry: ${family.family} selector ${selector} exception ${exception.file} has no property allowlist`,
        );
        continue;
      }
      for (const property of exception.properties) {
        if (
          typeof property !== 'string' ||
          !property.trim() ||
          !knownStyleProperties.has(property)
        ) {
          failures.push(
            `Registry: ${family.family} selector ${selector} exception ${exception.file} contains unknown property ${String(property)}`,
          );
        }
      }
    }
  }
  return failures;
}

failures.push(...findRegistryCoverageFailures(cssContents));
failures.push(...findRegistryExceptionFailures());
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
