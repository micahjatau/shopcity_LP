module.exports = {
  'src/**/*.ts': ['eslint --fix'],
  'test/**/*.ts': ['eslint --fix'],
  '*.{md,json,yml,yaml}': ['prettier --write'],
  '.github/workflows/*.yml': ['prettier --write'],
};
