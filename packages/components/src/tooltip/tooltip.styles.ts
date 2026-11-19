import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-tooltip>`:
 *
 * --k-tooltip-max-width
 * --k-tooltip-padding
 * --k-tooltip-radius
 * --k-tooltip-bg
 * --k-tooltip-fg
 */
export const tooltipStyles = css`
  :host {
    display: inline-block;
  }

  .trigger {
    display: inline-flex;
  }

  :host(:not([open])) .popup:not(.closing) {
    display: none;
  }

  .popup {
    position: fixed;
    inset: auto;
    margin: 0;
    z-index: ${token('zIndex.tooltip')};
    box-sizing: border-box;
    max-width: var(--k-tooltip-max-width, 260px);
    padding: var(--k-tooltip-padding, 4px 8px);
    border-radius: var(--k-tooltip-radius, ${token('radius.md')});
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: var(--k-tooltip-bg, ${token('color.bg.layer')});
    color: var(--k-tooltip-fg, ${token('color.fg.default')});
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.xs')};
    line-height: ${token('font.lineHeight.tight')};
    box-shadow: ${token('elevation.2')};
    pointer-events: none;
    white-space: normal;
  }
`;
