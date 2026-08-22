import type { SVGProps } from 'react';

export type ShellNavigationIconName =
  | 'home'
  | 'search'
  | 'spark'
  | 'wallet'
  | 'users'
  | 'refresh'
  | 'list'
  | 'credit-card'
  | 'check'
  | 'shield'
  | 'chart'
  | 'settings'
  | 'clipboard'
  | 'device'
  | 'branch'
  | 'sliders'
  | 'user-settings'
  | 'operations'
  | 'chevron-left'
  | 'chevron-right';

export function ShellNavigationIcon({
  name,
  ...props
}: Readonly<SVGProps<SVGSVGElement> & { name: ShellNavigationIconName }>) {
  const { jsx: _jsx, ...svgProps } = props as SVGProps<SVGSVGElement> & {
    jsx?: boolean;
  };
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M4 10.5 12 4l8 6.5" />
          <path {...common} d="M6.5 9.5V20h11V9.5" />
          <path {...common} d="M10 20v-5h4v5" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <circle {...common} cx="11" cy="11" r="5.5" />
          <path {...common} d="m15.2 15.2 4 4" />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3Z" />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M4.5 7.5h14A2.5 2.5 0 0 1 21 10v6.5A2.5 2.5 0 0 1 18.5 19h-11A3.5 3.5 0 0 1 4 15.5v-5A3 3 0 0 1 7 7.5Z" />
          <path {...common} d="M15.5 12h4" />
          <circle {...common} cx="16.5" cy="12" r="0.6" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <circle {...common} cx="9" cy="8" r="3" />
          <path {...common} d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle {...common} cx="17" cy="9" r="2.3" />
          <path {...common} d="M14.8 19a4.5 4.5 0 0 1 6.2 0" />
        </svg>
      );
    case 'refresh':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M4.5 12a7.5 7.5 0 0 1 12.7-5.3L19 9" />
          <path {...common} d="M19.5 5.5V9h-3.5" />
          <path {...common} d="M19.5 12a7.5 7.5 0 0 1-12.7 5.3L5 15" />
          <path {...common} d="M4.5 18.5V15h3.5" />
        </svg>
      );
    case 'list':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M8 6h12" />
          <path {...common} d="M8 12h12" />
          <path {...common} d="M8 18h12" />
          <circle {...common} cx="4" cy="6" r="0.7" />
          <circle {...common} cx="4" cy="12" r="0.7" />
          <circle {...common} cx="4" cy="18" r="0.7" />
        </svg>
      );
    case 'credit-card':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <rect {...common} x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path {...common} d="M3.5 10h17" />
          <path {...common} d="M7 14h4" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <circle {...common} cx="12" cy="12" r="8.5" />
          <path {...common} d="m8.5 12 2.6 2.6L15.5 9.5" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M12 3.5 19 6v5.5c0 4.7-3.2 8.6-7 9.5-3.8-.9-7-4.8-7-9.5V6l7-2.5Z" />
          <path {...common} d="M9.5 9.5 14.5 14.5" />
          <path {...common} d="M14.5 9.5 9.5 14.5" />
        </svg>
      );
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M4 19.5h16" />
          <path {...common} d="M7 17V11" />
          <path {...common} d="M12 17V7" />
          <path {...common} d="M17 17v-4" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <circle {...common} cx="12" cy="12" r="3.2" />
          <path {...common} d="M12 4.5v2" />
          <path {...common} d="M12 17.5v2" />
          <path {...common} d="M4.5 12h2" />
          <path {...common} d="M17.5 12h2" />
          <path {...common} d="m6.2 6.2 1.4 1.4" />
          <path {...common} d="m16.4 16.4 1.4 1.4" />
          <path {...common} d="m17.8 6.2-1.4 1.4" />
          <path {...common} d="m7.6 16.4-1.4 1.4" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M9 5.5h6" />
          <rect {...common} x="6.5" y="4.5" width="11" height="16" rx="2" />
          <path {...common} d="M9 9h6" />
          <path {...common} d="M9 12h6" />
          <path {...common} d="M9 15h4" />
        </svg>
      );
    case 'device':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <rect {...common} x="7" y="4.5" width="10" height="15" rx="2" />
          <path {...common} d="M10 7h4" />
          <path {...common} d="M11.5 17h1" />
        </svg>
      );
    case 'branch':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <circle {...common} cx="7" cy="6.5" r="2" />
          <circle {...common} cx="17" cy="6.5" r="2" />
          <circle {...common} cx="7" cy="17.5" r="2" />
          <path {...common} d="M9 6.5h5a3 3 0 0 1 3 3V15" />
          <path {...common} d="M7 8.5v7" />
        </svg>
      );
    case 'sliders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M5 6h14" />
          <path {...common} d="M5 12h14" />
          <path {...common} d="M5 18h14" />
          <circle {...common} cx="9" cy="6" r="1.8" />
          <circle {...common} cx="15" cy="12" r="1.8" />
          <circle {...common} cx="11" cy="18" r="1.8" />
        </svg>
      );
    case 'user-settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <circle {...common} cx="9" cy="8" r="3" />
          <path {...common} d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle {...common} cx="17.5" cy="14.5" r="1.5" />
          <path {...common} d="M17.5 11.5v-1" />
          <path {...common} d="M17.5 18.5v-1" />
          <path {...common} d="m14.8 12.8.7.4" />
          <path {...common} d="m19.5 15.2.7.4" />
          <path {...common} d="m14.8 16.2.7-.4" />
          <path {...common} d="m19.5 13.8.7-.4" />
        </svg>
      );
    case 'operations':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M8 6h8" />
          <path {...common} d="M8 12h8" />
          <path {...common} d="M8 18h8" />
          <path {...common} d="M4.5 6h1" />
          <path {...common} d="M4.5 12h1" />
          <path {...common} d="M4.5 18h1" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="m14.5 6.5-6 5.5 6 5.5" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="m9.5 6.5 6 5.5-6 5.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...svgProps}>
          <path {...common} d="M4 12h16" />
          <path {...common} d="M12 4v16" />
        </svg>
      );
  }
}
