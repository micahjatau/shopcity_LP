export const conformanceViewports = [
  { name: 'desktop', width: 1440, height: 923 },
  { name: 'wide-tablet', width: 1024, height: 1366 },
  { name: 'tablet-rail', width: 920, height: 1024 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-mobile-edge', width: 767, height: 1024 },
  { name: 'workflow-edge', width: 701, height: 844 },
  { name: 'workflow-mobile', width: 700, height: 844 },
  { name: 'mobile-shell', width: 620, height: 844 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-mobile', width: 375, height: 812 },
] as const;

export const cashierConformanceRoutes = [
  { path: '/cashier', role: 'CASHIER' },
  { path: '/cashier/lookup', role: 'CASHIER' },
  { path: '/cashier/earn', role: 'CASHIER' },
  { path: '/cashier/redeem', role: 'CASHIER' },
  { path: '/cashier/transactions', role: 'CASHIER' },
  { path: '/cashier/sync', role: 'CASHIER' },
] as const;

export const shellConformanceRoutes = [
  { path: '/supervisor', role: 'SUPERVISOR' },
  { path: '/supervisor/customers', role: 'SUPERVISOR' },
  { path: '/supervisor/customers/new', role: 'SUPERVISOR' },
  { path: '/supervisor/transactions', role: 'SUPERVISOR' },
  { path: '/admin', role: 'ADMIN' },
  { path: '/admin/customers/new', role: 'ADMIN' },
  { path: '/admin/transactions', role: 'ADMIN' },
] as const;

export const publicConformanceRoutes = [{ path: '/login' }] as const;

export const conformanceRoles = ['CASHIER', 'SUPERVISOR', 'ADMIN'] as const;
