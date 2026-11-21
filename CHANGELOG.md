# Changelog

All notable changes to Kerno are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and all `@kerno/*` packages follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-21

### Features

- **Design Tokens & Theme Engine (`@kerno/tokens`)**: Built-in Light, Dark, and custom theme composition (`createTheme`, `applyTheme`) with Windows 10 Fluent 1 chromatic Accent ramps (`default`, `hover`, `active`, `borderHover`, `disabled`).
- **Core Runtime (`@kerno/core`)**: `KernoElement`, `FormAssociatedElement` (`ElementInternals`), native Popover API Top-Layer overlay stack (`overlayManager`, `autoPosition`, focus trap, scroll lock), and TC39 standard decorators (`@prop`, `@state`).
- **Graphics & Material Effects (`@kerno/effects`)**: Parametric corner & edge-feature solver (`rounded`, `chamfer`, `scallop`, `notch`), HiDPI Canvas `<k-surface>`, multi-layer Acrylic glass, pointer-aware Reveal Highlight with press ripples, 3D Pressure tilt, and WAAPI Motion helpers.
- **Primitives (`@kerno/primitives` — 19 modules)**: `button`, `icon`, `input`, `checkbox`, `radio`, `switch`, `badge`, `separator`, `select`, `slider`, `avatar`, `textarea`, `number-input`, `pin-input`, `rating`, `kbd`, `indicator`, `chip`, `range-slider`.
- **Composite & Business Components (`@kerno/components` — 41 modules)**: `dialog`, `popover`, `tooltip`, `dropdown`, `tabs`, `navigation`, `card`, `progress`, `skeleton`, `empty-state`, `table`, `form-field`, `scrollbar`, `tile`, `alert`, `toast`, `drawer`, `command`, `accordion`, `breadcrumb`, `pagination`, `autocomplete`, `date-picker`, `upload`, `tree`, `list`, `time-picker`, `cascader`, `form`, `data-grid`, `segmented-control`, `tags-input`, `multi-select`, `stepper`, `timeline`, `ring-progress`, `color-picker`, `hover-card`, `loading-overlay`, `spoiler`, `copy-button`.
- **Quality, Bundle Size & Release Tooling**: Playwright Chromium browser test suite covering all 60 modules, automated Rolldown/Vite gzip & brotli bundle-size analyzer with CI budgets (`pnpm size:check`), tarball integrity verification (`pnpm release:verify`), and GitHub Actions CI + OIDC provenance release workflows.
