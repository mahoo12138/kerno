import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-radio>`:
 *
 * --k-radio-size
 * --k-radio-bg
 * --k-radio-checked-bg
 * --k-radio-dot-color
 * --k-radio-border-color
 */
export const radioStyles = css`
  :host {
    --_size: 18px;
    --_font-size: ${token('font.size.sm')};

    display: inline-flex;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_size: 15px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_size: 22px;
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
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--k-radio-size, var(--_size));
    height: var(--k-radio-size, var(--_size));
    border-radius: ${token('radius.full')};
    border: ${token('control.borderWidth')} solid
      var(--k-radio-border-color, ${token('color.stroke.strong')});
    background: var(--k-radio-bg, ${token('color.control.default')});
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) .control {
    background: ${token('color.control.hover')};
  }

  :host([checked]) .control {
    background: var(--k-radio-checked-bg, ${token('color.accent.default')});
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .control {
    background: ${token('color.accent.hover')};
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
    background: ${token('color.control.disabled')};
    border-color: ${token('color.stroke.default')};
  }

  :host([checked]) .control:disabled {
    background: ${token('color.accent.disabled')};
    border-color: transparent;
  }

  .indicator {
    width: 44%;
    height: 44%;
    border-radius: ${token('radius.full')};
    background: var(--k-radio-dot-color, ${token('color.accent.fg')});
    transform: scale(0);
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  :host([checked]) .indicator {
    transform: scale(1);
  }

  :host([checked]) .control:disabled .indicator {
    background: ${token('color.accent.fgDisabled')};
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
