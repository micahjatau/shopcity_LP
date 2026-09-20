import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findOwnershipFailures,
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
  const failures = findRegistryCoverageFailures([
    ['primitives.css', '.sc-button { color: red; }'],
  ], selectorDefinitions);
  assert.ok(failures.some((failure) => failure.includes('primitive-input')));
});

test('ownership registry rejects an undeclared competing owner', () => {
  const failures = findOwnershipFailures([
    ['primitives.css', '.sc-button { color: red; }'],
    ['unexpected.css', '.sc-button { color: blue; }'],
  ], selectorDefinitions);
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
  const failures = findOwnershipFailures([
    ['primitives.css', '.sc-input { color: red; }'],
    ['cashier-routes.css', '.cashier-card .sc-input:focus-visible { color: blue; }'],
  ], selectorDefinitions);
  assert.deepEqual(failures, []);
});
