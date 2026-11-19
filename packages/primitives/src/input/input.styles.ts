import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-input>`:
 *
 * --k-input-height, --k-input-padding-x, --k-input-gap, --k-input-radius,
 * --k-input-font-size, --k-input-bg, --k-input-bg-hover, --k-input-bg-focus,
 * --k-input-fg, --k-input-placeholder-color,
 * --k-input-border-color, --k-input-border-color-focus
 *
 * Styled after authentic Windows 10 (MDL2 / Fluent 1) TextBox:
 * - Sharp geometry (`0px` radius by default; `6px` for chamfer/scallop/notch)
 * - Crisp `2px` border that brightens on hover and turns solid Accent Blue on focus
 */
export const inputStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;
    --_bg: ${token('color.bg.layer')};
    --_bg-hover: ${token('color.bg.layer')};
    --_bg-focus: ${token('color.bg.layer')};
    --_fg: ${token('color.fg.default')};
    --_placeholder: ${token('color.fg.tertiary')};
    --_border-color: ${token('color.stroke.strong')};
    --_border-hover: color-mix(in srgb, ${token('color.fg.default')} 68%, transparent);
    --_border-focus: ${token('color.accent.default')};

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

  :host([data-user-invalid]) {
    --_border-color: ${token('color.status.danger.solid')};
    --_border-hover: ${token('color.status.danger.solid')};
    --_border-focus: ${token('color.status.danger.solid')};
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--k-input-gap, ${token('spacing.xs')});
    min-height: var(--k-input-height, var(--_height));
    padding-inline: var(--k-input-padding-x, var(--_padding-x));
    border: 2px solid var(--k-input-border-color, var(--_border-color));
    border-radius: var(--k-input-radius, var(--_radius));
    background: var(--k-input-bg, var(--_bg));
    color: var(--k-input-fg, var(--_fg));
    font-family: ${token('font.family.sans')};
    font-size: var(--k-input-font-size, var(--_font-size));
    line-height: ${token('font.lineHeight.tight')};
    cursor: text;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) {
    background: var(--k-input-bg-hover, var(--_bg-hover));
    border-color: var(--k-input-border-color, var(--_border-hover));
  }

  .base:focus-within:not(.disabled) {
    background: var(--k-input-bg-focus, var(--_bg-focus));
    border-color: var(--k-input-border-color-focus, var(--_border-focus));
  }

  .base.disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    border-color: ${token('color.stroke.default')};
  }

  :host([shape='chamfer']) .base,
  :host([shape='scallop']) .base,
  :host([shape='notch']) .base {
    border-color: transparent;
    outline: none;
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--k-input-border-color, var(--_border-color));
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) .shape-stroke {
    stroke: var(--k-input-border-color, var(--_border-hover));
  }

  .base:focus-within:not(.disabled) .shape-stroke {
    stroke: var(--k-input-border-color-focus, var(--_border-focus));
    stroke-width: 2px;
  }

  .input {
    all: unset;
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    height: 100%;
    color: inherit;
    font: inherit;
    cursor: inherit;
  }

  .input::placeholder {
    color: var(--k-input-placeholder-color, var(--_placeholder));
    opacity: 1;
  }

  .input::-webkit-search-decoration,
  .input::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  .prefix,
  .suffix {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    color: ${token('color.fg.secondary')};
    flex-shrink: 0;
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }

  .action-btn {
    all: unset;
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 0px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    flex-shrink: 0;
  }

  .action-btn[hidden] {
    display: none;
  }

  .action-btn:hover {
    color: ${token('color.fg.default')};
    background: ${token('color.subtle.hover')};
  }

  .action-btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }
`;
