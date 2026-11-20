import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-pin-input>`:
 *
 * --k-pin-input-size
 * --k-pin-input-gap
 * --k-pin-input-radius
 * --k-pin-input-bg
 * --k-pin-input-border-color
 * --k-pin-input-border-color-focus
 */
export const pinInputStyles = css`
  :host {
    --_cell: var(--k-pin-input-size, 40px);
    --_font-size: ${token('font.size.md')};
    --_radius: var(--k-pin-input-radius, 0px);
    --_gap: var(--k-pin-input-gap, ${token('spacing.sm')});

    display: inline-flex;
    vertical-align: middle;
    max-width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_cell: var(--k-pin-input-size, 32px);
    --_font-size: ${token('font.size.sm')};
  }

  :host([size='lg']) {
    --_cell: var(--k-pin-input-size, 48px);
    --_font-size: ${token('font.size.lg')};
  }

  .group {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--_gap);
  }

  .cell {
    box-sizing: border-box;
    width: var(--_cell);
    height: var(--_cell);
    padding: 0;
    border: 2px solid var(--k-pin-input-border-color, ${token('color.stroke.strong')});
    border-radius: var(--_radius);
    background: var(--k-pin-input-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.mono')};
    font-size: var(--_font-size);
    font-weight: ${token('font.weight.semibold')};
    font-variant-numeric: tabular-nums;
    text-align: center;
    caret-color: ${token('color.accent.default')};
    outline: none;
    transition:
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .cell::placeholder {
    color: ${token('color.fg.tertiary')};
    font-weight: ${token('font.weight.regular')};
  }

  .cell:hover:not(:disabled):not(:focus) {
    border-color: var(
      --k-pin-input-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 72%, transparent)
    );
  }

  .cell:focus {
    border-color: var(--k-pin-input-border-color-focus, ${token('color.accent.default')});
    background: color-mix(in srgb, ${token('color.accent.default')} 6%, ${token('color.bg.layer')});
  }

  .cell.filled:not(:focus) {
    border-color: color-mix(
      in srgb,
      ${token('color.accent.default')} 55%,
      ${token('color.stroke.strong')}
    );
  }

  :host([data-user-invalid]) .cell {
    border-color: ${token('color.status.danger.solid')};
  }

  .cell:disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    border-color: ${token('color.stroke.default')};
  }
`;
