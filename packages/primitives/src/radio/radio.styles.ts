import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-radio>`:
 *
 * --k-radio-size
 * --k-radio-bg
 * --k-radio-checked-bg
 * --k-radio-checked-border-color
 * --k-radio-checked-border-hover
 * --k-radio-dot-color
 * --k-radio-border-color
 *
 * Styled after authentic Windows 10 (MDL2 / Fluent 1) RadioButton:
 * - Unchecked: transparent circle, 2px high-contrast border
 * - Checked: 2px solid Accent outer ring + matching chromatic Accent center dot
 */
export const radioStyles = css`
  :host {
    --_size: 20px;
    --_font-size: ${token('font.size.sm')};

    display: inline-flex;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_size: 16px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_size: 24px;
    --_font-size: ${token('font.size.md')};
  }

  .base {
    display: inline-flex;
    align-items: center;
    gap: ${token('spacing.sm')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    line-height: ${token('font.lineHeight.tight')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    user-select: none;
  }

  .base.disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .control {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--k-radio-size, var(--_size));
    height: var(--k-radio-size, var(--_size));
    border-radius: ${token('radius.full')};
    border: 2px solid var(--k-radio-border-color, ${token('color.fg.secondary')});
    background: var(--k-radio-bg, transparent);
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) .control {
    border-color: var(--k-radio-border-color, ${token('color.fg.default')});
  }

  .base:active:not(.disabled) .control {
    border-color: ${token('color.fg.tertiary')};
  }

  :host([checked]) .control {
    background: var(--k-radio-checked-bg, transparent);
    border-color: var(--k-radio-checked-border-color, ${token('color.accent.default')});
  }

  :host([checked]) .base:hover:not(.disabled) .control {
    border-color: var(--k-radio-checked-border-hover, ${token('color.accent.borderHover')});
  }

  :host([checked]) .base:active:not(.disabled) .control {
    border-color: ${token('color.accent.active')};
  }

  :host([data-user-invalid]) .control {
    border-color: ${token('color.status.danger.solid')};
  }

  .control:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
    box-shadow: 0 0 0 1px ${token('color.stroke.focusInner')};
  }

  .control:disabled {
    background: transparent;
    border-color: ${token('color.fg.disabled')};
  }

  :host([checked]) .control:disabled {
    border-color: color-mix(in srgb, ${token('color.accent.default')} 40%, transparent);
  }

  .indicator {
    width: 50%;
    height: 50%;
    border-radius: ${token('radius.full')};
    background: var(--k-radio-dot-color, ${token('color.accent.default')});
    transform: scale(0);
    transition:
      transform 140ms cubic-bezier(0.1, 0.9, 0.2, 1),
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([checked]) .indicator {
    transform: scale(1);
  }

  :host([checked]) .base:hover:not(.disabled) .indicator {
    background: var(--k-radio-dot-color, ${token('color.accent.hover')});
    transform: scale(1.08);
  }

  :host([checked]) .base:active:not(.disabled) .indicator {
    background: var(--k-radio-dot-color, ${token('color.accent.active')});
    transform: scale(0.9);
  }

  :host([checked]) .control:disabled .indicator {
    background: color-mix(in srgb, ${token('color.accent.default')} 40%, transparent);
  }

  .label:not(.has-content) {
    display: none;
  }
`;

export const radioGroupStyles = css`
  :host {
    display: inline-flex;
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--k-radio-group-gap, ${token('spacing.md')});
  }

  :host([orientation='vertical']) .base {
    flex-direction: column;
    align-items: flex-start;
  }
`;
