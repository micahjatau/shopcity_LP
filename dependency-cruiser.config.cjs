const moduleNames = [
  'auth',
  'audit',
  'branches',
  'cards',
  'configuration',
  'customers',
  'fraud',
  'health',
  'loyalty',
  'notifications',
  'approvals',
  'receipts',
  'reports',
  'users',
];

const crossCuttingModules = ['audit', 'configuration'];
const sharedLayers = ['common', 'config', 'database', 'supabase', 'jobs'];

const moduleBoundaryRules = moduleNames.map((moduleName) => ({
  name: `${moduleName}-module-no-peer-imports`,
  comment: `Feature modules may only import their own module or approved cross-cutting modules.`,
  severity: 'error',
  from: { path: `^src/modules/${moduleName}/` },
  to: {
    path: '^src/modules/',
    pathNot: `^src/modules/(?:${[moduleName, ...crossCuttingModules].join('|')})(?:/|$)`,
  },
}));

const sharedLayerRules = sharedLayers.map((layer) => ({
  name: `${layer}-layer-no-module-imports`,
  comment: `Shared layers must not import feature modules.`,
  severity: 'error',
  from: { path: `^src/${layer}/` },
  to: { path: '^src/modules/' },
}));

module.exports = {
  forbidden: [...moduleBoundaryRules, ...sharedLayerRules],
};
