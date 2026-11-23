# Changelog

All notable changes to Kerno are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and all `@kerno/*` packages follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **`AriaForwardingController` (`@kerno/core`)**: forwards a host's `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description` and associated `<label for>` elements to the focusable element inside its shadow root (ARIA element reflection, with a copied-text fallback).
- **`isComposing(event)` (`@kerno/core`)**: detects key events that belong to an IME composition.
- **`FormAssociatedElement#submitImplicitly()` (`@kerno/core`)**: HTML implicit submission (default button, else at most one blocking field) for controls whose text field lives in a shadow root; `static blocksImplicitSubmission` marks such controls.
- **Design tokens (`@kerno/tokens`)**:
  - `shape.radius.control` / `overlay` / `parametric` set the corner radius of every control, floating panel, and the parametric corner families. Defaults keep the square Fluent 1 look; `createTheme({ tokens: { shape: { radius: { control: '4px' } } } })` rounds all controls.
  - `motion.loop.spin` / `pulse` / `indeterminate` time looping animations; under `prefers-reduced-motion` pulses stop and spinners slow down.
  - `font.size['2xs']` (11px) and `font.size['3xs']` (10px), `color.backdrop`, and `color.status.*.onSolid`.
- **Internationalization (`@kerno/core`)**: every built-in string comes from a message table and follows the nearest `lang` attribute (crossing shadow roots; English by default). `registerLocale()` adds or overrides locales; `@kerno/core/locales/zh-CN` ships Simplified Chinese. `LocalizeController` (`term`, `date`, `number`) and `setLabels()` let custom components do the same. Month/weekday names and data-grid counts use `Intl`. See `docs/i18n.md`.
- **`--k-scrollbar-width`**: set on `<html>` while an overlay locks page scrolling, so fixed-position UI can offset itself by the hidden scrollbar.
- **`LazyShapeOutlineController` / `loadShapeOutline()` (`@kerno/effects/shape/lazy`)**: loads the shape-outline renderer on demand. Call `loadShapeOutline()` at startup when the first paint already uses non-rounded shapes.

### Fixed

- **Accessibility**: `k-checkbox`, `k-switch` and `k-radio` are now named by their slotted label; `k-button`, `k-chip`, `k-input`, `k-textarea`, `k-number-input`, `k-select`, `k-slider`, `k-range-slider`, `k-rating`, `k-pin-input`, `k-radio-group`, `k-autocomplete`, `k-tags-input`, `k-multi-select`, `k-date-picker`, `k-time-picker`, `k-cascader`, `k-color-input`, `k-segmented-control`, `k-upload` and `k-copy-button` honor host `aria-label` / `aria-labelledby` / `<label for>`, and `k-chip-group` no longer overwrites an explicit host `aria-label` or `aria-labelledby`. Previously these controls were announced without a name.
- **IME input**: Enter/Escape that confirm or cancel an IME candidate no longer add a tag (`k-tags-input`), submit `k-form`, pick an option (`k-autocomplete`, `k-multi-select`, `k-command`), commit `k-number-input`, or close overlays (`overlayManager`). `k-tags-input` no longer splits text mid-composition.
- **Forms**: pressing Enter in `k-input` or `k-number-input` now submits a native `<form>` (activating its default submit button, including `k-button`), matching native text fields. `k-form` no longer handles an Enter a control already handled.
- **Bundle size**: primitives and components no longer statically import the shape engine, Reveal and Pressure; rounded controls never load them. The size report now counts only eagerly loaded chunks and lists on-demand code as _Lazy Gzip_.
- **`k-dialog` accessibility**: modal dialogs now open with the native `showModal()`, so the rest of the page is inert for assistive technology too (screen-reader virtual cursors can no longer leave the dialog). Host `aria-label` / `aria-labelledby` override the visible title.
- **Token consolidation**: component styles no longer hardcode transition durations, corner radii, small font sizes or backdrop colors. All transitions now honor `prefers-reduced-motion` (previously ~30 fixed durations ignored it). `@kerno/effects/motion` derives its fallback durations from the tokens.
- **Contrast (WCAG AA)**: light `color.fg.tertiary` (placeholders, hints) went from 3.3:1 to 4.8:1 (`rgba(0,0,0,0.56)`); light `status.success.fg` from 4.25:1 to 6.3:1 (green-700). In dark mode, `k-indicator` success/danger/warning badges use dark text on their solid fills (white was 3.3–3.9:1). A test now guards text and status contrast in both themes.
- **Core rendering**: where constructable stylesheets are unsupported, elements no longer render an empty shadow root (the fallback `<style>` elements were mistaken for server-rendered markup). Declarative shadow DOM hydration is detected explicitly.
- **Overlay manager**:
  - Shared through `globalThis`, together with the `uniqueId()` counter, so two copies of `@kerno/core` on a page no longer keep separate stacks (one Escape closing two layers, duplicate ids).
  - Escape is no longer swallowed when the top overlay does not close on it.
  - Locking page scroll pads the body by the hidden scrollbar's width, so the page no longer shifts sideways (skipped with `scrollbar-gutter: stable`).
  - `autoPosition` (and `k-select`'s popup) coalesce scroll/resize updates into one animation frame, batching all overlays' layout reads before their writes.
- **Core update scheduling**: `requestUpdate()` called from `update()`, `updated()` or a controller's `hostUpdated()` is no longer silently dropped, and `updateComplete` now waits for such follow-up cycles.

### Changed

- **`k-dialog` is built on the native `<dialog>` element** (breaking for custom styles):
  - The `backdrop` CSS part was removed; style the backdrop with `--k-dialog-backdrop-bg`. The `panel` part is now the `<dialog>` element.
  - Entry/exit motion uses CSS transitions (`@starting-style`, `allow-discrete`) instead of WAAPI; browsers without discrete transitions skip the exit animation.
  - Non-modal dialogs no longer close on outside clicks (they have no backdrop); `close-on-backdrop` applies to modal dialogs.
  - The panel radius follows `shape.radius.overlay` like `k-drawer` and `k-command` (square by default, previously `radius.lg` / 8px); the close button follows `shape.radius.control`. `--k-dialog-radius` still overrides it.
  - Moving an open dialog within the document keeps it open.
- **Text props default to `''`** and fall back to the localized message (e.g. `k-select` `placeholder`, `k-pagination` labels, `k-copy-button` `label` / `copied-label`, `k-spoiler` `show-label` / `hide-label`, `k-table` / `k-data-grid` `empty-text`, `k-empty-state` `title`). Reading these properties now returns `''` unless set.
- **`k-date-picker`** shows localized short weekday names (`Mon` instead of `Mo` in English) and announces day cells as full dates instead of ISO strings.
- **`k-drawer` and `k-command` are built on the native `<dialog>` element** too, sharing one controller with `k-dialog` (same benefits; breaking for custom styles):
  - The `backdrop` CSS part was removed; use `--k-drawer-backdrop-bg` / `--k-command-backdrop-bg`. `k-drawer`'s `panel` part is now the `<dialog>`; `k-command` gains a `dialog` part around its `panel`.
  - The slide (drawer) and scale (command) motion are CSS transitions.
  - Non-modal drawers no longer close on outside clicks.

## [0.1.0] - 2026-11-21

### Features

- **Design Tokens & Theme Engine (`@kerno/tokens`)**: Built-in Light, Dark, and custom theme composition (`createTheme`, `applyTheme`) with Windows 10 Fluent 1 chromatic Accent ramps (`default`, `hover`, `active`, `borderHover`, `disabled`).
- **Core Runtime (`@kerno/core`)**: `KernoElement`, `FormAssociatedElement` (`ElementInternals`), native Popover API Top-Layer overlay stack (`overlayManager`, `autoPosition`, focus trap, scroll lock), and TC39 standard decorators (`@prop`, `@state`).
- **Graphics & Material Effects (`@kerno/effects`)**: Parametric corner & edge-feature solver (`rounded`, `chamfer`, `scallop`, `notch`), HiDPI Canvas `<k-surface>`, multi-layer Acrylic glass, pointer-aware Reveal Highlight with press ripples, 3D Pressure tilt, and WAAPI Motion helpers.
- **Primitives (`@kerno/primitives` — 19 modules)**: `button`, `icon`, `input`, `checkbox`, `radio`, `switch`, `badge`, `separator`, `select`, `slider`, `avatar`, `textarea`, `number-input`, `pin-input`, `rating`, `kbd`, `indicator`, `chip`, `range-slider`.
- **Composite & Business Components (`@kerno/components` — 41 modules)**: `dialog`, `popover`, `tooltip`, `dropdown`, `tabs`, `navigation`, `card`, `progress`, `skeleton`, `empty-state`, `table`, `form-field`, `scrollbar`, `tile`, `alert`, `toast`, `drawer`, `command`, `accordion`, `breadcrumb`, `pagination`, `autocomplete`, `date-picker`, `upload`, `tree`, `list`, `time-picker`, `cascader`, `form`, `data-grid`, `segmented-control`, `tags-input`, `multi-select`, `stepper`, `timeline`, `ring-progress`, `color-picker`, `hover-card`, `loading-overlay`, `spoiler`, `copy-button`.
- **Quality, Bundle Size & Release Tooling**: Playwright Chromium browser test suite covering all 60 modules, automated Rolldown/Vite gzip & brotli bundle-size analyzer with CI budgets (`pnpm size:check`), tarball integrity verification (`pnpm release:verify`), and GitHub Actions CI + OIDC provenance release workflows.
