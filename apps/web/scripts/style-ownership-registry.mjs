const exception = (file, reason) => ({ file, reason });

export const canonicalSelectorFamilies = [
  {
    family: 'cashier-actions',
    selectors: ['.cashier-primary-action', '.cashier-secondary-action'],
    owner: 'cashier-design-system.css',
  },
  {
    family: 'primitive-button',
    selectors: ['.sc-button'],
    owner: 'primitives.css',
    exceptions: [
      exception('globals.css', 'Login/document compatibility selectors.'),
      exception('cashier-routes.css', 'Route action density/layout selectors pending normalization.'),
    ],
  },
  {
    family: 'primitive-input',
    selectors: ['.sc-input', '.sc-select'],
    owner: 'primitives.css',
    exceptions: [
      exception('globals.css', 'Login and document compatibility selectors.'),
      exception('cashier-routes.css', 'Scoped focus and density selectors pending normalization.'),
    ],
  },
  {
    family: 'primitive-status',
    selectors: ['.sc-status', '.sc-badge'],
    owner: 'primitives.css',
    exceptions: [
      exception('cashier-design-system.css', 'Cashier semantic status variants.'),
      exception('cashier-routes.css', 'Route status composition selectors pending normalization.'),
    ],
  },
  {
    family: 'primitive-page-header',
    selectors: ['.sc-page-head'],
    owner: 'cashier-design-system.css',
    exceptions: [
      exception('primitives.css', 'Shared heading typography baseline.'),
    ],
  },
  {
    family: 'primitive-card',
    selectors: ['.sc-card'],
    owner: 'cashier-design-system.css',
  },
  {
    family: 'primitive-table-card',
    selectors: ['.sc-table-card'],
    owner: 'primitives.css',
  },
  {
    family: 'cashier-form-actions',
    selectors: ['.sc-form-actions'],
    owner: 'cashier-design-system.css',
  },
  {
    family: 'cashier-route-header',
    selectors: ['.cashier-route-header'],
    owner: 'cashier-design-system.css',
    exceptions: [
      exception(
        'cashier-routes.css',
        'Legacy route composition selectors pending header normalization.',
      ),
    ],
  },
  {
    family: 'transaction-toolbar',
    selectors: ['.transaction-toolbar'],
    owner: 'cashier-routes.css',
  },
  {
    family: 'transaction-dialog',
    selectors: ['.transaction-detail-modal'],
    owner: 'cashier-routes.css',
  },
  {
    family: 'flow-panel',
    selectors: ['.sc-flow-panel'],
    owner: 'cashier-design-system.css',
  },
  {
    family: 'shell-search',
    selectors: ['.global-shell-search'],
    owner: 'shell-components.css',
  },
  {
    family: 'shell-chrome',
    selectors: ['.shell-topbar', '.shell-sidebar'],
    owner: 'shell-components.css',
    exceptions: [
      exception('globals.css', 'Legacy global shell reset retained until shell cleanup.'),
    ],
  },
];

export const selectorDefinitions = new Map(
  canonicalSelectorFamilies.flatMap((family) =>
    family.selectors.map((selector) => [selector, family]),
  ),
);
