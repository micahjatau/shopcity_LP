const assert = require('node:assert/strict');
const test = require('node:test');
const {
  resolveCoverage,
  validatePackageScripts,
  validateWorkflowCommands,
} = require('./index.cjs');

test('reports release-critical coverage', () => {
  const result = resolveCoverage(['src/app.ts', 'docs/notes.md']);

  assert.equal(result.uncovered.length, 0);
  assert.ok(result.coverageByFile.get('src/app.ts').length > 0);
});

test('detects missing package scripts', () => {
  const result = validatePackageScripts({});

  assert.ok(result.missing.includes('validate:scope'));
});

test('requires mandatory CI workflow placement', () => {
  const result = validateWorkflowCommands([
    {
      workflowFile: '.github/workflows/ci.yml',
      jobId: 'static',
      continueOnError: false,
      steps: [{ run: 'npm run typecheck', continueOnError: false }],
    },
    {
      workflowFile: '.github/workflows/manual.yml',
      jobId: 'release',
      continueOnError: false,
      steps: [{ run: 'npm run verify:release-artifacts', continueOnError: false }],
    },
  ]);

  assert.ok(result.missing.includes('validate:scope'));
  assert.ok(result.optionalized.length > 0);
});

test('flags step-level continue-on-error on required commands', () => {
  const result = validateWorkflowCommands([
    {
      workflowFile: '.github/workflows/ci.yml',
      jobId: 'static',
      continueOnError: false,
      steps: [
        {
          run: 'npm run validate:scope',
          continueOnError: true,
        },
      ],
    },
  ]);

  assert.ok(result.missing.includes('validate:scope'));
  assert.equal(result.optionalized.length, 1);
});
