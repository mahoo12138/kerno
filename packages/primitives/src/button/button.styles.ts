import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface (all optional):
 *
 * --k-button-height, --k-button-padding-x, --k-button-gap, --k-button-radius,
 * --k-button-font-size, --k-button-font-weight,
 * --k-button-bg, --k-button-bg-hover, --k-button-bg-active,
 * --k-button-fg, --k-button-border-color, --k-button-border-hover
 *
 * Styled after authentic Windows 10 (MDL2 / Fluent 1) buttons:
 * - Solid fill with NO visible border at rest (`2px solid transparent`)
 * - Crisp `2px` high-contrast border frame on `:hover`
 * - Decisive fill compression on `:active` with no water ripple
 */
export const buttonStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;
    --_bg: ${token('color.control.default')};
    --_bg-hover: ${token('color.control.hover')};
    --_bg-active: ${token('color.control.active')};
    --_fg: ${token('color.fg.default')};
    --_fg-active: ${token('color.fg.default')};
    --_border-color: transparent;
    --_border-hover: ${token('color.stroke.strong')};

    display: inline-flex;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
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

  :host([variant='accent']) {
    --_bg: ${token('color.accent.default')};
    --_bg-hover: ${token('color.accent.hover')};
    --_bg-active: ${token('color.accent.active')};
    --_fg: ${token('color.accent.fg')};
    --_fg-active: ${token('color.accent.fg')};
    --_border-color: transparent;
    --_border-hover: ${token('color.accent.borderHover')};
  }

  :host([variant='subtle']) {
    --_bg: ${token('color.subtle.default')};
    --_bg-hover: ${token('color.subtle.hover')};
    --_bg-active: ${token('color.subtle.active')};
    --_border-color: transparent;
    --_border-hover: transparent;
  }

  .base {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    gap: var(--k-button-gap, ${token('spacing.sm')});
    min-height: var(--k-button-height, var(--_height));
    padding-inline: var(--k-button-padding-x, var(--_padding-x));
    border: 2px solid var(--k-button-border-color, var(--_border-color));
    border-radius: var(--k-button-radius, var(--_radius));
    background: var(--k-button-bg, var(--_bg));
    color: var(--k-button-fg, var(--_fg));
    font-family: ${token('font.family.sans')};
    font-size: var(--k-button-font-size, var(--_font-size));
    font-weight: var(--k-button-font-weight, ${token('font.weight.regular')});
    line-height: ${token('font.lineHeight.tight')};
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      transform 80ms ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([shape='chamfer']) .base,
  :host([shape='scallop']) .base,
  :host([shape='notch']) .base {
    border-color: transparent;
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--k-button-border-color, var(--_border-color));
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(:disabled) {
    background: var(--k-button-bg-hover, var(--_bg-hover));
    border-color: var(--k-button-border-hover, var(--k-button-border-color, var(--_border-hover)));
  }

  :host([shape='chamfer']) .base:hover:not(:disabled),
  :host([shape='scallop']) .base:hover:not(:disabled),
  :host([shape='notch']) .base:hover:not(:disabled) {
    border-color: transparent;
  }

  .base:hover:not(:disabled) .shape-stroke {
    stroke: var(--k-button-border-hover, var(--k-button-border-color, var(--_border-hover)));
  }

  .base:active:not(:disabled) {
    background: var(--k-button-bg-active, var(--_bg-active));
    border-color: transparent;
    color: var(--k-button-fg, var(--_fg-active));
    transform: scale(0.985);
  }

  .base:active:not(:disabled) .shape-stroke {
    stroke: transparent;
  }

  .base:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
    box-shadow: 0 0 0 1px ${token('color.stroke.focusInner')};
  }

  .base:disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    border-color: transparent;
  }

  .base:disabled .shape-stroke {
    stroke: transparent;
  }

  :host([variant='accent']) .base:disabled {
    background: ${token('color.accent.disabled')};
    color: ${token('color.accent.fgDisabled')};
    border-color: transparent;
  }

  :host([variant='subtle']) .base:disabled {
    background: ${token('color.subtle.disabled')};
    border-color: transparent;
  }

  .label,
  .prefix,
  .suffix,
  .spinner {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
  }

  .spinner svg {
    width: 1em;
    height: 1em;
    animation: k-button-spin 0.85s linear infinite;
  }

  :host([loading]) .base {
    cursor: wait;
    opacity: 0.85;
  }

  @keyframes k-button-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }

  ::slotted(svg),
  ::slotted(img) {
    width: 1em;
    height: 1em;
  }

  @media (forced-colors: active) {
    .base {
      border-color: ButtonText;
    }
    .base:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
