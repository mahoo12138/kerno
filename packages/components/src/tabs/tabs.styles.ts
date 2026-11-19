import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const tabStyles = css`
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
    align-items: center;
    justify-content: center;
    gap: ${token('spacing.xs')};
    min-height: ${token('control.height.md')};
    padding: 0 ${token('spacing.md')};
    border-radius: ${token('radius.md')};
    color: ${token('color.fg.secondary')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.medium')};
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .base:active:not(:disabled) {
    background: ${token('color.subtle.active')};
  }

  :host([active]) .base {
    color: ${token('color.fg.default')};
    font-weight: ${token('font.weight.semibold')};
  }

  :host([active]) .base:hover:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.default')} 10%, transparent);
  }

  :host([active]) .base:active:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.active')} 16%, transparent);
  }

  .base::after {
    content: '';
    position: absolute;
    left: ${token('spacing.sm')};
    right: ${token('spacing.sm')};
    bottom: 0;
    height: 3px;
    border-radius: ${token('radius.full')};
    background: ${token('color.accent.default')};
    transform: scaleX(0);
    transition:
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([active]) .base::after {
    transform: scaleX(1);
  }

  :host([active]) .base:hover:not(:disabled)::after {
    background: ${token('color.accent.hover')};
  }

  :host([active]) .base:active:not(:disabled)::after {
    background: ${token('color.accent.active')};
  }

  .base:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .base:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }
`;

export const tabPanelStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.default')};
  }

  :host(:not([active])),
  :host([hidden]) {
    display: none;
  }

  .base {
    padding: ${token('spacing.md')} 0;
  }
`;

export const tabsStyles = css`
  :host {
    display: flex;
    flex-direction: column;
  }

  :host([orientation='vertical']) {
    flex-direction: row;
    gap: ${token('spacing.lg')};
  }

  .tablist {
    display: flex;
    align-items: center;
    gap: ${token('spacing.xs')};
    border-bottom: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
  }

  :host([orientation='vertical']) .tablist {
    flex-direction: column;
    align-items: stretch;
    border-bottom: none;
    border-right: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    padding-right: ${token('spacing.xs')};
  }

  .panels {
    flex: 1 1 auto;
  }
`;
