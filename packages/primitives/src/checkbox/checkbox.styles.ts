import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-checkbox>`:
 *
 * --k-checkbox-size
 * --k-checkbox-radius
 * --k-checkbox-bg
 * --k-checkbox-checked-bg
 * --k-checkbox-fg
 * --k-checkbox-border-color
 */
export const checkboxStyles = css`
  :host {
    --_size: 18px;
    --_font-size: ${token('font.size.sm')};
    --_radius: ${token('radius.md')};

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
    --_radius: ${token('radius.sm')};
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
    width: var(--k-checkbox-size, var(--_size));
    height: var(--k-checkbox-size, var(--_size));
    border-radius: var(--k-checkbox-radius, var(--_radius));
    border: ${token('control.borderWidth')} solid
      var(--k-checkbox-border-color, ${token('color.stroke.strong')});
    background: var(--k-checkbox-bg, ${token('color.control.default')});
    color: var(--k-checkbox-fg, ${token('color.accent.fg')});
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) .control {
    background: ${token('color.control.hover')};
  }

  :host([checked]) .control,
  :host([indeterminate]) .control {
    background: var(--k-checkbox-checked-bg, ${token('color.accent.default')});
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .control,
  :host([indeterminate]) .base:hover:not(.disabled) .control {
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
    color: ${token('color.fg.disabled')};
  }

  :host([checked]) .control:disabled,
  :host([indeterminate]) .control:disabled {
    background: ${token('color.accent.disabled')};
    color: ${token('color.accent.fgDisabled')};
    border-color: transparent;
  }

  .indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 75%;
    height: 75%;
    opacity: 0;
    transform: scale(0.75);
    transition:
      opacity ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  :host([checked]) .indicator,
  :host([indeterminate]) .indicator {
    opacity: 1;
    transform: scale(1);
  }

  .indicator svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .label:not(.has-content) {
    display: none;
  }
`;
