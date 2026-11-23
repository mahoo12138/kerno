import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-rating>`:
 *
 * --k-rating-size
 * --k-rating-gap
 * --k-rating-color
 * --k-rating-empty-color
 */
export const ratingStyles = css`
  :host {
    --_size: var(--k-rating-size, 22px);
    --_gap: var(--k-rating-gap, 4px);
    --_active-color: var(--k-rating-color, ${token('color.status.warning.solid')});
    --_empty-color: var(
      --k-rating-empty-color,
      color-mix(in srgb, ${token('color.fg.default')} 20%, transparent)
    );

    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_size: var(--k-rating-size, 16px);
    --_gap: var(--k-rating-gap, 2px);
  }

  :host([size='lg']) {
    --_size: var(--k-rating-size, 28px);
    --_gap: var(--k-rating-gap, 6px);
  }

  .track {
    display: inline-flex;
    align-items: center;
    gap: var(--_gap);
    padding: 2px;
    border-radius: ${token('radius.sm')};
    outline: none;
    user-select: none;
  }

  .track:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .star {
    position: relative;
    display: inline-flex;
    width: var(--_size);
    height: var(--_size);
    cursor: pointer;
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([readonly]) .star,
  :host([disabled]) .star {
    cursor: default;
  }

  :host(:not([readonly]):not([disabled])) .star:hover {
    transform: scale(1.12);
  }

  :host([disabled]) .track {
    opacity: 0.45;
  }

  .star svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  .star-empty {
    color: var(--_empty-color);
  }

  .star-fill {
    color: var(--_active-color);
  }

  :host([data-user-invalid]) .track {
    outline: 1px solid ${token('color.status.danger.solid')};
    outline-offset: 2px;
  }
`;
