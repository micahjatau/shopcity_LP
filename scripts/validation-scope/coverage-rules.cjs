const COVERAGE_RULES = [
  {
    pattern: /^src\/.*\.ts$/,
    validators: ['lint:src', 'typecheck', 'test', 'build'],
  },
  {
    pattern: /^test\/.*\.ts$/,
    validators: ['lint:test', 'test'],
  },
  {
    pattern: /^prisma\/schema\.prisma$/,
    validators: ['prisma:generate', 'prisma:validate'],
  },
  {
    pattern: /^prisma\/migrations\/.*\.sql$/,
    validators: ['prisma:generate', 'prisma:validate', 'test:integration'],
  },
  {
    pattern: /^\.github\/workflows\/.*\.ya?ml$/,
    validators: ['format:check', 'validate:scope'],
  },
  {
    pattern: /^scripts\/.*$/,
    validators: ['format:check', 'validate:scope'],
  },
  {
    pattern: /^docs\/(api|database|runbooks|release-evidence)\/.*$/,
    validators: ['format:check', 'verify:release-artifacts'],
  },
  {
    pattern: /^openspec\/changes\/.*$/,
    validators: ['format:check', 'openspec:validate'],
  },
  {
    pattern: /^package\.json$/,
    validators: ['format:check', 'validate:scope'],
  },
  {
    pattern: /^tsconfig\.json$/,
    validators: ['format:check', 'typecheck'],
  },
  {
    pattern: /^tsconfig\.client\.json$/,
    validators: ['format:check', 'client:typecheck'],
  },
  {
    pattern: /^nest-cli\.json$/,
    validators: ['format:check', 'build'],
  },
  {
    pattern: /^eslint\.config\.(js|cjs)$/,
    validators: ['format:check', 'lint:src', 'lint:test'],
  },
  {
    pattern: /^dependency-cruiser\.config\.cjs$/,
    validators: ['format:check', 'architecture:check'],
  },
];

module.exports = {
  COVERAGE_RULES,
};
