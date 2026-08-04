const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveCoverage, validatePackageScripts } = require('./index.cjs');

test('flags uncovered release-critical files', () => {
  const result = resolveCoverage(['src/app.ts', 'docs/notes.md']);

  assert.equal(result.uncovered.length, 0);
  assert.ok(result.coverageByFile.get('src/app.ts').length > 0);
});

test('detects missing package scripts', () => {
  const result = validatePackageScripts({});

  assert.ok(result.missing.includes('validate:scope'));
});
