# 01 — Brand & Foundations

## 1. Brand personality

ShopCity should feel **dependable, fast, clear and established**. The loyalty product is operational retail software, not a marketing microsite. The interface may be energetic at entry points, login and loyalty-card surfaces, but transaction screens should be calm and legible.

Use the supplied ShopCity artwork as the visual anchor:

- white SC mark and SHOPCITY SUPERMARKET lockup;
- saturated red family;
- layered diagonal red bands;
- rounded branded card/container language;
- high contrast white-on-red lockup.

Do not reproduce the logo with text or substitute fonts.

## 2. Brand assets

Runtime location:

```text
apps/web/public/brand/
├── shopcity-mark-white.svg
├── shopcity-lockup-white.svg
├── shopcity-lockup-on-red.svg
├── shopcity-brand-pattern.svg
└── README.md
```

The white mark and lockup are traced from the supplied raster artwork. They are application-ready vector derivatives, not an official source vector master. If ShopCity supplies AI/EPS/PDF/SVG artwork later, replace the traced geometry without changing public asset paths unless necessary.

### Usage

- `shopcity-lockup-white.svg`: login hero, red navigation/brand surfaces, splash/empty states.
- `shopcity-mark-white.svg`: compact navigation, app chrome, small red tiles.
- `shopcity-lockup-on-red.svg`: contexts where a self-contained logo tile is needed.
- `shopcity-brand-pattern.svg`: low-emphasis decorative red motif on login, loyalty-card and empty-state surfaces only.

Never use the diagonal pattern behind dense forms, tables or transaction confirmations.

## 3. Color philosophy

Brand red is **not** the default canvas and is **not** the only danger color. High-frequency work surfaces use white and neutrals; ShopCity red identifies the product, primary actions and navigation. Success, warning, information and danger use semantic palettes plus icon/text labels.

### Brand palette

| Token | Hex | Intended use |
|---|---:|---|
| `brand.50` | `#FFF1F1` | subtle selected/background tint |
| `brand.100` | `#FFE0E0` | soft brand surface |
| `brand.200` | `#FFC2C2` | borders/illustrative tint |
| `brand.300` | `#FF9999` | decorative only |
| `brand.400` | `#F45D5D` | decorative/secondary emphasis |
| `brand.500` | `#B10000` | primary ShopCity red sampled from artwork |
| `brand.600` | `#9F0001` | primary pressed/hover |
| `brand.700` | `#8E0101` | strong branded surface |
| `brand.800` | `#6F0101` | sidebar/header dark red |
| `brand.900` | `#530001` | deepest branded surface |
| `brand.950` | `#310000` | exceptional dark accent |
| `brand.bright` | `#D00607` | artwork highlight/accent |

White on `brand.500` has approximately 7.3:1 contrast; white on `brand.600` about 8.5:1. These combinations are suitable for normal text. Avoid dark text on core brand red.

### Neutral palette

| Token | Hex |
|---|---:|
| `neutral.0` | `#FFFFFF` |
| `neutral.50` | `#F8F9FA` |
| `neutral.100` | `#F1F3F5` |
| `neutral.200` | `#E4E7EB` |
| `neutral.300` | `#CDD2D8` |
| `neutral.400` | `#9AA2AC` |
| `neutral.500` | `#6B7280` |
| `neutral.600` | `#4B5563` |
| `neutral.700` | `#374151` |
| `neutral.800` | `#1F2937` |
| `neutral.900` | `#111827` |
| `neutral.950` | `#090C12` |

### Semantic palettes

| Meaning | Strong | Surface | Border |
|---|---:|---:|---:|
| Success | `#147D3F` | `#EAF7EF` | `#A9DAB9` |
| Warning | `#8A5A00` | `#FFF7E2` | `#E8C56A` |
| Danger | `#B42318` | `#FFF1F1` | `#F2B8B5` |
| Info | `#1D4ED8` | `#EFF6FF` | `#B6CEFA` |

Never communicate a state by color alone. Pair semantic color with icon and explicit language.

## 4. Token architecture

Use three layers:

```text
primitive value
    ↓
semantic token
    ↓
component token
```

Example:

```text
brand.500 = #B10000
color.action.primary = {brand.500}
button.primary.background = {color.action.primary}
```

Feature code should usually consume semantic/component tokens rather than raw primitives.

### Required token groups

- color;
- typography;
- spacing;
- sizing;
- radii;
- border width;
- shadow/elevation;
- opacity;
- z-index;
- breakpoints;
- motion duration/easing;
- focus rings;
- icons;
- container widths.

`tokens.json` is the v1 seed. It should eventually generate CSS variables and Tailwind theme values.

## 5. Semantic surface tokens

Recommended light-mode defaults:

```text
color.canvas                 neutral.50
color.surface.default        neutral.0
color.surface.subtle         neutral.100
color.text.primary           neutral.900
color.text.secondary         neutral.600
color.text.disabled          neutral.400
color.border.default         neutral.200
color.border.strong          neutral.300
color.action.primary         brand.500
color.action.primaryHover    brand.600
color.focus                  info.strong
```

A dark mode is **not** a v1 requirement for POS/admin. Do not create an incomplete dark theme just because the component library supports it. Add it only after all operational/semantic states are tested.

## 6. Typography

### Typeface

Primary UI: **Inter** where bundled/available; fall back to a modern system sans stack.

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

The logo is artwork and is never recreated using Inter.

### Type scale

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Display | 40/48 | 700 | rare brand/marketing surfaces |
| H1 | 32/40 | 700 | primary page title |
| H2 | 24/32 | 700 | major section |
| H3 | 20/28 | 600 | card/section title |
| Body LG | 18/28 | 400/500 | high-priority explanatory copy |
| Body | 16/24 | 400 | normal UI |
| Body SM | 14/20 | 400 | support/metadata |
| Label | 14/20 | 600 | form/control labels |
| Caption | 12/16 | 500 | secondary metadata; not critical instructions |
| Numeric LG | 32/38 | 700 | balances/KPIs |
| Numeric | 16/24 | 600 | table/transaction amounts |

All currency and tabular report numbers should use:

```css
font-variant-numeric: tabular-nums;
```

Do not use font size below 12px.

## 7. Money design rules

Backend financial values are integer **kobo**. UI display converts only at the presentation boundary.

```text
125000 kobo → ₦1,250.00
```

Rules:

- Never perform financial arithmetic in floating-point naira.
- Preserve integer kobo in API state/business logic.
- Format via a single `Money`/money utility.
- `0` displays `₦0.00`.
- Positive/negative meaning must include sign or label, not color alone.
- Table amounts align right and use tabular numerals.
- Money inputs accept common Nigerian typing patterns but normalize to kobo safely.
- Reject malformed/ambiguous values before submission.
- Never silently round a submitted financial amount.
- Screen-reader labels should expand the currency meaning where useful.
- On confirmation screens show purchase, earned/redeemed amount and resulting balance separately.

Recommended visual treatment:

```text
+ ₦2,500.00   Credit earned
− ₦1,000.00   Redeemed
```

## 8. Spacing

Use a 4px base grid.

| Token | px |
|---|---:|
| `space.0` | 0 |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |
| `space.12` | 48 |
| `space.16` | 64 |
| `space.20` | 80 |

Prefer 16–24px internal card spacing, 24–32px section spacing, and 32–48px page rhythm.

## 9. Radius, borders and elevation

Radii:

- small `6px`: compact fields/badges;
- medium `10px`: default inputs/buttons/cards;
- large `16px`: panels;
- XL `24px`: brand/login/loyalty surfaces;
- full: avatars/pills only.

Borders are usually 1px neutral. Do not create "neon red glow" on working cards.

Elevation:

- level 0: normal content;
- level 1: floating menus;
- level 2: sticky bars/sheets;
- level 3: dialogs.

Use shadow sparingly; hierarchy should come mainly from spacing, surface and border.

## 10. Layout and containers

Desktop admin content max width: approximately 1440px where needed. Data tables may use full available content width. Forms generally use a readable 640–760px column even on large displays.

Use 12-column desktop, 8-column tablet and 4-column mobile grid concepts where useful, but workflow layout takes precedence over rigid grids.

## 11. Responsive breakpoints

Design around environments, not device names:

```text
mobile support        360–767
supervisor tablet     768–1199
POS/desktop            1200+
wide admin             1440+
```

The main cashier flow is optimized for POS first.

## 12. Iconography

Use **Lucide** as the default application icon family. Canonical meanings:

| Domain | Icon |
|---|---|
| Customer | `User` |
| Card | `CreditCard` |
| Earn | `CirclePlus` |
| Redeem | `CircleMinus` |
| Approval | `ClipboardCheck` |
| Fraud | `ShieldAlert` |
| Reports | `ChartNoAxesCombined` |
| Audit | `ScrollText` |
| Offline | `WifiOff` |
| Sync | `RefreshCw` |
| Success | `CircleCheck` |
| Warning | `TriangleAlert` |
| Error | `CircleX` |

Default icon sizes: 16 compact, 20 standard, 24 primary control. Decorative icons may be larger. Icons never replace text labels for consequential actions.

## 13. Motion

Durations:

- fast: 100–150ms;
- standard: 180–220ms;
- emphasis: 250–300ms.

Use motion for state continuity, not entertainment. Avoid long route transitions and animated financial totals. Honor `prefers-reduced-motion`.

## 14. Branded patterns

The diagonal-band pattern is permitted on:

- login/splash;
- loyalty-card visual;
- high-level empty state;
- branded onboarding.

Opacity should be low enough that text remains comfortably readable. It is prohibited as the background of tables, forms, fraud review or transaction confirmation.
