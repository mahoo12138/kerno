import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-icon>`:
 *
 * --k-icon-size
 * --k-icon-color
 */
export const iconStyles = css`
  :host {
    --_size: 1em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--k-icon-size, var(--_size));
    height: var(--k-icon-size, var(--_size));
    color: var(--k-icon-color, currentColor);
    vertical-align: middle;
    flex-shrink: 0;
    line-height: 1;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_size: 14px;
  }

  :host([size='md']) {
    --_size: 16px;
  }

  :host([size='lg']) {
    --_size: 20px;
  }

  .base,
  .glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .glyph[hidden] {
    display: none;
  }

  svg,
  ::slotted(svg) {
    width: 100%;
    height: 100%;
    display: block;
    fill: currentColor;
  }

  :host([spin]) svg,
  :host([name='loader']) svg {
    animation: k-icon-spin ${token('motion.loop.spin')} linear infinite;
  }

  @keyframes k-icon-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
