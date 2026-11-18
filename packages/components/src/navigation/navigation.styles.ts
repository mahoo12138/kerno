import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const navItemStyles = css`
  :host {
    display: inline-flex;
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    gap: ${token('spacing.sm')};
    min-height: ${token('control.height.md')};
    padding: 4px ${token('spacing.md')};
    border-radius: ${token('radius.md')};
    color: ${token('color.fg.secondary')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.regular')};
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  :host([active]) .base {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
    font-weight: ${token('font.weight.semibold')};
  }

  .base::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 25%;
    bottom: 25%;
    width: 3px;
    border-radius: ${token('radius.full')};
    background: ${token('color.accent.default')};
    transform: scaleY(0);
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  :host([active]) .base::before {
    transform: scaleY(1);
  }

  .base:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .base:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .label {
    flex: 1 1 auto;
    text-align: start;
  }

  .prefix,
  .suffix {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }
`;

export const navStyles = css`
  :host {
    display: block;
  }

  .base {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('spacing.xs')};
  }

  :host([orientation='vertical']) .base {
    flex-direction: column;
    align-items: stretch;
  }
`;
