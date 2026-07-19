module.exports = {
  'src/**/*.ts': ['eslint --fix'],
  'test/**/*.ts': ['eslint --fix'],
  '*.{md,json,yml,yaml,prisma}': ['prettier --write'],
  'prisma/**/*.prisma': ['prettier --write'],
  '.github/workflows/*.yml': ['prettier --write'],
  '.husky/*': ['prettier --write'],
};
