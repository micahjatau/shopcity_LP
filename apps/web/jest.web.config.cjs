const baseConfig = require('./jest.a11y.config.cjs');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/{a11y,app-shell,cashier-lookup,combobox,customer-registration-flow,customer-workspace,draft-persistence,global-shell-search,login-form,money,offline-earn-queue,offline-queue,reports-workspace,session-bootstrap,shell-navigation,supervisor-card-management,supervisor-customer-workflows,transaction-dashboard,transaction-forms,transaction-workspace}.spec.ts?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
