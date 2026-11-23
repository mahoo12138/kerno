import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-pagination>`:
 *
 * --k-pagination-size
 * --k-pagination-gap
 * --k-pagination-radius
 *
 * Styled after Windows 10 Fluent 1 controls:
 * - Sharp `0px` square cells with crisp `2px` hover border framing
 * - Active page follows the full chromatic Accent ramp (`default` -> `hover` + `borderHover` -> `active`)
 */
export const paginationStyles = css`
  :host {
    --_item-size: 32px;
    --_font-size: ${token('font.size.sm')};

    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_item-size: 26px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_item-size: 38px;
    --_font-size: ${token('font.size.md')};
  }

  .nav {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('spacing.md')};
  }

  .list {
    display: inline-flex;
    align-items: center;
    gap: var(--k-pagination-gap, 4px);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--k-pagination-size, var(--_item-size));
    height: var(--k-pagination-size, var(--_item-size));
    padding-inline: 6px;
    border-radius: var(--k-pagination-radius, ${token('shape.radius.control')});
    border: 2px solid transparent;
    background: transparent;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .btn:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    border-color: ${token('color.stroke.strong')};
  }

  .btn:active:not(:disabled) {
    background: ${token('color.control.active')};
    border-color: transparent;
  }

  .btn[aria-current='page'] {
    background: ${token('color.accent.default')};
    color: ${token('color.accent.fg')};
    border-color: transparent;
    font-weight: ${token('font.weight.semibold')};
  }

  .btn[aria-current='page']:hover:not(:disabled) {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  .btn[aria-current='page']:active:not(:disabled) {
    background: ${token('color.accent.active')};
    border-color: transparent;
  }

  .btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
    box-shadow: 0 0 0 1px ${token('color.stroke.focusInner')};
  }

  .btn:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
    border-color: transparent;
  }

  .btn[aria-current='page']:disabled {
    background: ${token('color.accent.disabled')};
    color: ${token('color.accent.fgDisabled')};
    border-color: transparent;
  }

  .btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--k-pagination-size, var(--_item-size));
    height: var(--k-pagination-size, var(--_item-size));
    color: ${token('color.fg.tertiary')};
    user-select: none;
  }

  .ellipsis svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .summary {
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.secondary')};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .summary[hidden] {
    display: none;
  }
`;
