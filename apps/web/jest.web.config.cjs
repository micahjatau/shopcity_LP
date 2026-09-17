const baseConfig = require('./jest.a11y.config.cjs');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/{a11y,app-shell,cashier-lookup,combobox,customer-workspace,draft-persistence,login-form,money,offline-earn-queue,offline-queue,reports-workspace,session-bootstrap,shell-navigation,transaction-forms,transaction-workspace}.spec.ts?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
