import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-copy-button>`:
 *
 * --k-copy-button-radius
 */
export const copyButtonStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_pad-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};

    display: inline-flex;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_height: ${token('control.height.sm')};
    --_pad-x: ${token('control.paddingX.sm')};
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_height: ${token('control.height.lg')};
    --_pad-x: ${token('control.paddingX.lg')};
    --_font-size: ${token('font.size.md')};
  }

  .btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--_height);
    padding-inline: var(--_pad-x);
    border: 2px solid transparent;
    border-radius: var(--k-copy-button-radius, ${token('shape.radius.control')});
    background: ${token('color.control.default')};
    color: ${token('color.fg.default')};
    font-size: var(--_font-size);
    font-weight: ${token('font.weight.medium')};
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .btn:hover:not(:disabled) {
    background: ${token('color.control.hover')};
    border-color: color-mix(in srgb, ${token('color.fg.default')} 40%, transparent);
  }

  .btn:active:not(:disabled) {
    background: ${token('color.control.active')};
  }

  :host([variant='accent']) .btn {
    background: ${token('color.accent.default')};
    color: ${token('color.accent.fg')};
  }

  :host([variant='accent']) .btn:hover:not(:disabled) {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  :host([variant='accent']) .btn:active:not(:disabled) {
    background: ${token('color.accent.active')};
    border-color: ${token('color.accent.active')};
  }

  :host([variant='subtle']) .btn {
    background: transparent;
  }

  :host([variant='subtle']) .btn:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    border-color: transparent;
  }

  :host([copied]) .btn {
    background: ${token('color.status.success.bg')};
    border-color: ${token('color.status.success.solid')};
    color: ${token('color.status.success.fg')};
  }

  .btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .btn:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
  }

  .icon svg {
    width: 14px;
    height: 14px;
    display: block;
  }
`;
