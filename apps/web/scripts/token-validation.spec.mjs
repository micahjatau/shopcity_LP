import test from 'node:test';
import assert from 'node:assert/strict';
import { createTokenResolver } from './token-validation.mjs';

test('resolves direct and chained aliases to CSS variables', () => {
  const resolve = createTokenResolver(
    new Map([
      ['--sc-color-brand-700', '#a00'],
      ['--sc-color-semantic-action', '{color.brand.700}'],
      ['--sc-color-semantic-focus', '{color.semantic.action}'],
    ]),
  );

  assert.equal(resolve('{color.brand.700}'), 'var(--sc-color-brand-700)');
  assert.equal(resolve('{color.semantic.focus}'), 'var(--sc-color-brand-700)');
  assert.equal(resolve('12px'), '12px');
});

test('rejects aliases that point to missing tokens', () => {
  const resolve = createTokenResolver(
    new Map([['--sc-color-semantic-action', '{color.brand.missing}']]),
  );

  assert.throws(
    () => resolve('{color.semantic.action}'),
    /Unknown design token alias: \{color\.brand\.missing\}/,
  );
});

test('rejects cyclic aliases with the complete cycle path', () => {
  const resolve = createTokenResolver(
    new Map([
      ['--sc-color-a', '{color.b}'],
      ['--sc-color-b', '{color.c}'],
      ['--sc-color-c', '{color.a}'],
    ]),
  );

  assert.throws(
    () => resolve('{color.a}'),
    /Cyclic design token alias: --sc-color-a -> --sc-color-b -> --sc-color-c -> --sc-color-a/,
  );
});
