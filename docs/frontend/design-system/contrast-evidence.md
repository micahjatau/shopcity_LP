# Semantic contrast evidence

Computed from `docs/frontend/design-system/tokens.json` using WCAG relative luminance:

| Pair                                                               |   Ratio | Result              |
| ------------------------------------------------------------------ | ------: | ------------------- |
| `textPrimary` (`neutral.900`) on `surface` (`neutral.0`)           | 17.74:1 | Pass AA normal text |
| `textSecondary` (`neutral.600`) on `surface` (`neutral.0`)         |  7.56:1 | Pass AA normal text |
| `actionPrimaryText` (`neutral.0`) on `actionPrimary` (`brand.500`) |  7.32:1 | Pass AA normal text |
| `actionPrimaryText` on `actionPrimaryHover` (`brand.600`)          |  8.49:1 | Pass AA normal text |
| `focus` (`info.strong`) on `surface`                               |  6.70:1 | Pass AA normal text |

Semantic mappings remain one-way aliases to canonical palette tokens; no floating-point financial logic or runtime token mutation is involved.
