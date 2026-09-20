export const conformanceViewports = [
  { name: 'desktop', width: 1440, height: 923 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
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
  { path: '/admin', role: 'ADMIN' },
] as const;

export const conformanceRoles = ['CASHIER', 'SUPERVISOR', 'ADMIN'] as const;
