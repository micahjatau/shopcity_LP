export const canonicalCashierLookupControl = {
  fontSize: '16px',
  minHeight: '44px',
  borderRadius: '10px',
  paddingInline: '16px|16px',
} as const;

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
