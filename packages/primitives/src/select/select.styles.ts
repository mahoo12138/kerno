import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Windows 10 UWP ComboBox option item:
 * - Edge-to-edge full-width row (0 horizontal margin, 0 border-radius)
 * - Normal font weight (no checkmark icon, no bold weight shift)
 * - Deep accent tint background when `[selected]`
 */
export const optionStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    align-items: center;
    min-height: 32px;
    padding: 4px ${token('control.paddingX.md')};
    border-radius: 0px;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.regular')};
    cursor: pointer;
    user-select: none;
    transition: background-color 80ms ${token('motion.easing.standard')};
  }

  .base:hover:not(:disabled),
  .base:focus-visible:not(:disabled) {
    background: ${token('color.subtle.hover')};
    outline: none;
  }

  .base:active:not(:disabled) {
    background: ${token('color.control.default')};
  }

  :host([selected]) .base {
    background: color-mix(in srgb, ${token('color.accent.default')} 38%, transparent);
    color: ${token('color.fg.default')};
  }

  :host([selected]) .base:hover:not(:disabled),
  :host([selected]) .base:focus-visible:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.hover')} 48%, transparent);
  }

  :host([selected]) .base:active:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.active')} 60%, transparent);
  }

  .base:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }
`;

/**
 * Windows 10 UWP ComboBox:
 * - Closed trigger: transparent/inset background with a crisp 2px border
 * - Opened listbox: overlays directly on top of the trigger with a 1px border,
 *   4px top/bottom padding, and 0 left/right padding so selected rows span edge-to-edge
 */
export const selectStyles = css`
  :host {
    --_height: 32px;
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;

    display: inline-flex;
    vertical-align: middle;
    min-width: 180px;
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: 6px;
  }

  :host([size='sm']) {
    --_height: ${token('control.height.sm')};
    --_padding-x: ${token('control.paddingX.sm')};
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_height: ${token('control.height.lg')};
    --_padding-x: ${token('control.paddingX.lg')};
    --_font-size: ${token('font.size.md')};
  }

  .combobox {
    all: unset;
    --_border: ${token('color.stroke.strong')};
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: var(--_height);
    padding-inline: var(--_padding-x);
    border-radius: var(--_radius);
    border: 2px solid var(--_border);
    background: transparent;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--_border);
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .combobox:hover:not(:disabled) {
    --_border: color-mix(in srgb, ${token('color.fg.default')} 72%, transparent);
  }

  .combobox:active:not(:disabled) {
    background: ${token('color.subtle.hover')};
  }

  :host([open]) .combobox,
  .combobox:focus-visible {
    --_border: ${token('color.accent.default')};
    outline: none;
  }

  :host([data-user-invalid]) .combobox {
    --_border: ${token('color.status.danger.solid')};
  }

  .combobox:disabled {
    cursor: default;
    background: transparent;
    color: ${token('color.fg.disabled')};
    --_border: ${token('color.stroke.default')};
  }

  :host([shape='chamfer']) .combobox,
  :host([shape='scallop']) .combobox,
  :host([shape='notch']) .combobox {
    border-color: transparent;
  }

  .display {
    position: relative;
    z-index: 2;
  }

  .display.placeholder {
    color: ${token('color.fg.tertiary')};
  }

  .arrow {
    position: relative;
    z-index: 2;
    display: inline-flex;
    width: 12px;
    height: 12px;
    color: ${token('color.fg.secondary')};
  }

  .combobox:hover:not(:disabled) .arrow {
    color: ${token('color.fg.default')};
  }

  .arrow svg {
    width: 100%;
    height: 100%;
  }

  :host(:not([open])) .listbox:not(.closing) {
    display: none;
  }

  .listbox {
    position: fixed;
    inset: auto;
    margin: 0;
    box-sizing: border-box;
    z-index: ${token('zIndex.dropdown')};
    min-width: 180px;
    max-height: 260px;
    overflow: auto;
    padding: 4px 0;
    border-radius: 0px;
    border: 1px solid
      color-mix(in srgb, ${token('color.stroke.strong')} 35%, ${token('color.stroke.default')});
    background: ${token('color.bg.layerAlt')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
  }

  .listbox.closing {
    pointer-events: none;
  }
`;
