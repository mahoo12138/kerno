import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-switch>`:
 *
 * --k-switch-width
 * --k-switch-height
 * --k-switch-thumb-size
 * --k-switch-track-bg
 * --k-switch-track-checked-bg
 * --k-switch-thumb-bg
 */
export const switchStyles = css`
  :host {
    --_width: 40px;
    --_height: 20px;
    --_thumb: 14px;
    --_font-size: ${token('font.size.sm')};

    display: inline-flex;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_width: 32px;
    --_height: 16px;
    --_thumb: 10px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_width: 48px;
    --_height: 24px;
    --_thumb: 18px;
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

  .track {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    width: var(--k-switch-width, var(--_width));
    height: var(--k-switch-height, var(--_height));
    padding: 2px;
    border-radius: ${token('radius.full')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.strong')};
    background: var(--k-switch-track-bg, ${token('color.control.default')});
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) .track {
    background: ${token('color.control.hover')};
  }

  :host([checked]) .track {
    background: var(--k-switch-track-checked-bg, ${token('color.accent.default')});
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .track {
    background: ${token('color.accent.hover')};
  }

  :host([data-user-invalid]) .track {
    border-color: ${token('color.status.danger.solid')};
  }

  .track:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
    box-shadow: 0 0 0 1px ${token('color.stroke.focusInner')};
  }

  .track:disabled {
    background: ${token('color.control.disabled')};
    border-color: ${token('color.stroke.default')};
  }

  :host([checked]) .track:disabled {
    background: ${token('color.accent.disabled')};
    border-color: transparent;
  }

  .thumb {
    width: var(--k-switch-thumb-size, var(--_thumb));
    height: var(--k-switch-thumb-size, var(--_thumb));
    border-radius: ${token('radius.full')};
    background: var(--k-switch-thumb-bg, ${token('color.fg.secondary')});
    transform: translateX(0);
    transition:
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([checked]) .thumb {
    background: var(--k-switch-thumb-bg, ${token('color.accent.fg')});
    transform: translateX(
      calc(var(--k-switch-width, var(--_width)) - var(--k-switch-thumb-size, var(--_thumb)) - 6px)
    );
  }

  .track:disabled .thumb {
    background: ${token('color.fg.disabled')};
  }

  :host([checked]) .track:disabled .thumb {
    background: ${token('color.accent.fgDisabled')};
  }

  .label:not(.has-content) {
    display: none;
  }
`;
