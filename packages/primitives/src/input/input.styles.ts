import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-input>`:
 *
 * --k-input-height, --k-input-padding-x, --k-input-gap, --k-input-radius,
 * --k-input-font-size, --k-input-bg, --k-input-bg-hover, --k-input-bg-focus,
 * --k-input-fg, --k-input-placeholder-color,
 * --k-input-border-color, --k-input-border-color-focus
 */
export const inputStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: ${token('radius.md')};
    --_bg: ${token('color.control.default')};
    --_bg-hover: ${token('color.control.hover')};
    --_bg-focus: ${token('color.bg.layer')};
    --_fg: ${token('color.fg.default')};
    --_placeholder: ${token('color.fg.tertiary')};
    --_border-color: ${token('color.stroke.control')};
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
    border: ${token('control.borderWidth')} solid var(--k-input-border-color, var(--_border-color));
    border-radius: var(--k-input-radius, var(--_radius));
    background: var(--k-input-bg, var(--_bg));
    color: var(--k-input-fg, var(--_fg));
    font-family: ${token('font.family.sans')};
    font-size: var(--k-input-font-size, var(--_font-size));
    line-height: ${token('font.lineHeight.tight')};
    cursor: text;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      box-shadow ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) {
    background: var(--k-input-bg-hover, var(--_bg-hover));
  }

  .base:focus-within:not(.disabled) {
    background: var(--k-input-bg-focus, var(--_bg-focus));
    border-color: var(--k-input-border-color-focus, var(--_border-focus));
    outline: ${token('focus.ringWidth')} solid
      var(--k-input-border-color-focus, var(--_border-focus));
    outline-offset: -1px;
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
    inset: calc(-1 * ${token('control.borderWidth')});
    width: calc(100% + 2 * ${token('control.borderWidth')});
    height: calc(100% + 2 * ${token('control.borderWidth')});
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--k-input-border-color, var(--_border-color));
    stroke-width: ${token('control.borderWidth')};
  }

  .base:focus-within:not(.disabled) .shape-stroke {
    stroke: var(--k-input-border-color-focus, var(--_border-focus));
    stroke-width: 2px;
  }

  .input {
    all: unset;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: ${token('radius.sm')};
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
