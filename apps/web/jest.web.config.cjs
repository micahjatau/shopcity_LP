const baseConfig = require('./jest.a11y.config.cjs');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/{a11y,app-shell,cashier-lookup,combobox,customer-registration-flow,customer-workspace,draft-persistence,global-shell-search,login-form,money,offline-earn-queue,offline-queue,reports-workspace,supervisor-operational-reports,supervisor-report-metrics,fraud-flags-panel,session-bootstrap,shell-navigation,approvals-panel,supervisor-card-management,supervisor-customer-workflows,supervisor-transactions-dashboard,transaction-dashboard,transaction-forms,transaction-workspace}.spec.ts?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
