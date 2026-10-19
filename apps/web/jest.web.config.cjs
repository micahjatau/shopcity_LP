const baseConfig = require('./jest.a11y.config.cjs');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/{root-layout-metadata,api-proxy-device-cookie,api-proxy-security,customer-registration-review-dialog,a11y,admin-financial-units,app-shell,cashier-lookup,combobox,customer-registration-flow,customer-workspace,draft-persistence,global-shell-search,login-form,money,offline-earn-queue,offline-queue,report-errors,reports-workspace,supervisor-operational-reports,supervisor-report-metrics,fraud-flags-panel,session-bootstrap,shell-navigation,approvals-panel,device-management,supervisor-card-management,supervisor-customer-table-profile,supervisor-customer-workflows,supervisor-transactions-dashboard,transaction-dashboard,transaction-forms,transaction-workspace,supervisor-overview}.spec.ts?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
};
