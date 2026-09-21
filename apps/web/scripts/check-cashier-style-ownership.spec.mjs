import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findOwnershipFailures,
  findRegistryExceptionFailures,
  findRegistryCoverageFailures,
} from './check-cashier-style-ownership.mjs';
import { selectorDefinitions } from './style-ownership-registry.mjs';

const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'check-cashier-style-ownership.mjs',
);

test('Cashier style ownership check passes on migrated surfaces', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /16 source files/);
});

test('ownership registry requires every family owner to define its selector', () => {
  const failures = findRegistryCoverageFailures(
    [['primitives.css', '.sc-button { color: red; }']],
    selectorDefinitions,
  );
  assert.ok(failures.some((failure) => failure.includes('primitive-input')));
});

test('ownership registry rejects an undeclared competing owner', () => {
  const failures = findOwnershipFailures(
    [
      ['primitives.css', '.sc-button { color: red; }'],
      ['unexpected.css', '.sc-button { color: blue; }'],
    ],
    selectorDefinitions,
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0], /unexpected\.css/);
});

test('ownership registry covers the shared component families', () => {
  const families = new Set(
    [...selectorDefinitions.values()].map((family) => family.family),
  );
  for (const family of [
    'primitive-button',
    'primitive-input',
    'primitive-status',
    'primitive-card',
    'primitive-table-card',
    'cashier-form-actions',
    'cashier-route-header',
    'transaction-toolbar',
    'transaction-dialog',
    'flow-panel',
    'shell-search',
    'shell-chrome',
  ]) {
    assert.ok(families.has(family), `missing registry family: ${family}`);
  }
});

test('ownership registry permits a documented exception', () => {
  const failures = findOwnershipFailures(
    [
      ['primitives.css', '.sc-input { color: red; }'],
      ['cashier-design-system.css', '.sc-card { color: red; }'],
      ['cashier-routes.css', '.find-customer-query .sc-input { width: 100%; }'],
    ],
    selectorDefinitions,
  );
  assert.deepEqual(failures, []);
});

test('ownership registry rejects appearance properties in a layout exception', () => {
  const failures = findOwnershipFailures(
    [
      ['primitives.css', '.sc-input { color: red; }'],
      ['cashier-routes.css', '.find-customer-query .sc-input { color: blue; }'],
    ],
    selectorDefinitions,
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0], /property color/);
  assert.match(failures[0], /allowed exception properties/);
});

test('ownership registry rejects unknown selectors and properties', () => {
  const definitions = new Map([
    [
      '.unknown-selector',
      {
        family: 'test-button',
        owner: 'primitives.css',
        exceptions: [
          {
            file: 'cashier-routes.css',
            reason: 'unknown fixture',
            properties: ['not-a-css-property'],
          },
        ],
      },
    ],
  ]);
  const failures = findRegistryExceptionFailures(definitions);
  assert.equal(failures.length, 2);
  assert.match(failures[0], /unknown selector/);
  assert.match(failures[1], /unknown property/);
});

test('ownership registry rejects exception definitions without property allowlists', () => {
  const definitions = new Map([
    [
      '.sc-button',
      {
        family: 'test-button',
        owner: 'primitives.css',
        exceptions: [
          { file: 'cashier-routes.css', reason: 'missing allowlist' },
        ],
      },
    ],
  ]);
  const failures = findRegistryExceptionFailures(definitions);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no property allowlist/);
});
