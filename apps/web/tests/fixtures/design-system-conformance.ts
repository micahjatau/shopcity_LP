export const canonicalCashierLookupControl = {
  fontSize: '16px',
  minHeight: '44px',
  borderRadius: '10px',
  paddingInline: '16px|16px',
} as const;

export const canonicalCashierLayout = {
  contentMaxWidth: '1120px',
  searchMaxWidth: '300px',
  mobileSearchWidth: 'remaining row width (flex: 1 1 0)',
  mobileSearchComposition:
    'adjacent category pill; category may scroll internally without row overflow',
  cardRadius: '16px',
} as const;

export const canonicalCashierContractSelectors = [
  {
    selector: '.shell-topbar',
    property: 'min-height',
    expected: '64px',
    scope: 'all shell route states',
  },
  {
    selector: '.shell-nav-link',
    property: 'min-height',
    expected: '44px',
    scope: 'all rendered navigation links',
  },
  {
    selector: '.sc-page-head h1',
    property: 'margin-top',
    expected: '0px',
    scope: 'all rendered page titles',
  },
  {
    selector: '.sc-card',
    property: 'border-radius',
    expected: '16px',
    scope: 'all rendered canonical cards',
  },
  {
    selector: '.sc-flow-panel',
    property: 'border-radius',
    expected: '16px',
    scope: 'all rendered Capture Purchase and Redeem flow panels',
  },
  {
    selector: '.sc-control:not(.sc-textarea):not(.sc-input--compact)',
    property: 'min-height',
    expected: '44px',
    scope:
      'all rendered standard single-line controls; compact lookup controls use the documented compact variant',
  },
  {
    selector: '.sc-control:not(.sc-textarea)',
    property: 'border-radius',
    expected: '10px',
    scope: 'all rendered single-line controls',
  },
  {
    selector: '.sc-control.sc-input--compact',
    property: 'min-height',
    expected: '36px',
    scope: 'documented compact lookup controls',
  },
  {
    selector: '.sc-button:not(.sc-button--link)',
    property: 'border-radius',
    expected: '9999px',
    scope:
      'all rendered pill button variants; link buttons are intentionally excluded',
  },
  {
    selector: '.sc-status',
    property: 'margin-bottom',
    expected: '20px',
    scope: 'all rendered status messages',
  },
  {
    selector: '.global-shell-search__control',
    property: 'height',
    expected: '36px',
    scope: 'all rendered global search controls',
  },
  {
    selector: '.visual-table-wrap',
    property: 'border-radius',
    expected: '16px',
    scope: 'all rendered bounded table surfaces',
  },
  {
    selector: '.visual-dialog__panel',
    property: 'border-radius',
    expected: '24px',
    scope: 'all rendered dialog panels',
  },
] as const;

export const nonApplicableCashierCombinations = [
  {
    component: 'CashierPageHeader',
    variant: 'loading',
    reason: 'Headers do not own async control state.',
  },
  {
    component: 'ShopCityStatusMessage',
    variant: 'compact-control',
    reason: 'Status messages are not interactive controls.',
  },
  {
    component: 'CashierFlowPanel',
    variant: 'danger-button',
    reason: 'Action tone belongs to child controls, not the panel surface.',
  },
] as const;

export type ComputedStyleSnapshot = {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  minHeight: string;
  borderRadius: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  backgroundColor: string;
  color: string;
  paddingInline: string;
  paddingBlock: string;
};
