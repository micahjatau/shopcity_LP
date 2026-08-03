#!/usr/bin/env node

const { execFileSync } = require('node:child_process');

const validationGroups = [
  {
    label: 'core source and tests',
    files: listGitFiles().filter((file) =>
      matchesAny(file, [/^src\/.*\.ts$/, /^test\/.*\.ts$/]),
    ),
    validatedBy: ['lint:src', 'lint:test', 'typecheck'],
  },
  {
    label: 'openapi and generated client',
    files: listGitFiles().filter((file) =>
      matchesAny(file, [/^docs\/api\/openapi\.json$/, /^client\/shopcity-client\.ts$/]),
    ),
    validatedBy: ['openapi:lint', 'openapi:diff', 'client:generate', 'client:typecheck'],
  },
  {
    label: 'release docs and runbooks',
    files: listGitFiles().filter((file) =>
      matchesAny(file, [
        /^docs\/database\/migration-tracker\.md$/,
        /^docs\/runbooks\/.*\.(md|sql)$/, 
        /^openspec\/changes\/repo-review-34\/.*\.md$/,
        /^docs\/api\/sprint-3-financial-contract-draft\.md$/,
      ]),
    ),
    validatedBy: ['format:check', 'verify:release-artifacts'],
  },
  {
    label: 'prisma migrations',
    files: listGitFiles().filter((file) => /^prisma\/migrations\/.*\.sql$/.test(file)),
    validatedBy: ['prisma:generate', 'prisma:validate', 'test:integration', 'test:financial-repair-restore.int-spec.ts'],
  },
];

const criticalFiles = validationGroups.flatMap((group) => group.files);
const uncovered = criticalFiles.filter((file) => !isCovered(file));

if (uncovered.length > 0) {
  console.error('Release-critical files outside validation:');
  for (const file of uncovered) {
    console.error(`- ${file}`);
  }
  process.exitCode = 1;
} else {
  console.log('All tracked release-critical files are covered by validation.');
  for (const group of validationGroups) {
    console.log(`- ${group.label}: ${group.files.length} files via ${group.validatedBy.join(', ')}`);
  }
}

function isCovered(file) {
  return validationGroups.some((group) => group.files.includes(file));
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => pattern.test(file));
}

function listGitFiles() {
  const files = execFileSync('git', ['ls-files'], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return files;
}
