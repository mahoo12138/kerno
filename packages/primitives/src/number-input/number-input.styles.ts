import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-number-input>`:
 *
 * --k-number-input-height
 * --k-number-input-radius
 * --k-number-input-bg
 * --k-number-input-fg
 * --k-number-input-border-color
 * --k-number-input-border-color-focus
 */
export const numberInputStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;
    --_border: var(--k-number-input-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: 140px;
    font-family: ${token('font.family.sans')};
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

  .base {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: stretch;
    min-height: var(--k-number-input-height, var(--_height));
    border: 2px solid var(--_border);
    border-radius: var(--k-number-input-radius, var(--_radius));
    background: var(--k-number-input-bg, ${token('color.bg.layer')});
    color: var(--k-number-input-fg, ${token('color.fg.default')});
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) {
    --_border: var(
      --k-number-input-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 68%, transparent)
    );
  }

  .base:focus-within:not(.disabled) {
    --_border: var(--k-number-input-border-color-focus, ${token('color.accent.default')});
  }

  :host([data-user-invalid]) .base {
    --_border: ${token('color.status.danger.solid')};
  }

  .base.disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    --_border: ${token('color.stroke.default')};
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

  :host([shape='chamfer']) .base,
  :host([shape='scallop']) .base,
  :host([shape='notch']) .base {
    border-color: transparent;
  }

  .prefix,
  .suffix {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    padding-inline: 8px 0;
    color: ${token('color.fg.secondary')};
    font-size: var(--_font-size);
    flex-shrink: 0;
  }

  .suffix {
    padding-inline: 0 8px;
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }

  .input {
    all: unset;
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    padding-inline: var(--_padding-x);
    color: inherit;
    font-family: ${token('font.family.mono')};
    font-size: var(--_font-size);
    font-variant-numeric: tabular-nums;
    line-height: ${token('font.lineHeight.tight')};
  }

  .input::placeholder {
    color: ${token('color.fg.tertiary')};
    font-family: ${token('font.family.sans')};
    opacity: 1;
  }

  .steppers {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: stretch;
    border-inline-start: 1px solid ${token('color.stroke.default')};
    flex-shrink: 0;
  }

  :host([hide-steppers]) .steppers {
    display: none;
  }

  .step-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .step-btn + .step-btn {
    border-inline-start: 1px solid ${token('color.stroke.default')};
  }

  .step-btn:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .step-btn:active:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.default')} 20%, transparent);
    color: ${token('color.accent.text')};
  }

  .step-btn:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .step-btn svg {
    width: 12px;
    height: 12px;
    display: block;
  }
`;
