import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-hover-card>`:
 *
 * --k-hover-card-width
 * --k-hover-card-padding
 * --k-hover-card-radius
 */
export const hoverCardStyles = css`
  :host {
    display: inline-flex;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .trigger {
    display: inline-flex;
    align-items: center;
  }

  .card {
    position: fixed;
    margin: 0;
    padding: var(--k-hover-card-padding, 14px);
    width: var(--k-hover-card-width, 280px);
    max-width: min(360px, calc(100vw - 24px));
    box-sizing: border-box;
    border: 1px solid ${token('color.stroke.control')};
    border-radius: var(--k-hover-card-radius, ${token('shape.radius.overlay')});
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
    z-index: ${token('zIndex.popover')};
    font-size: ${token('font.size.sm')};
    line-height: 1.5;
  }

  .card:not(:popover-open) {
    display: none;
  }

  .card.closing {
    pointer-events: none;
  }

  :host([acrylic]) .card {
    background: color-mix(in srgb, ${token('color.bg.layer')} 74%, transparent);
    backdrop-filter: blur(24px) saturate(170%);
    -webkit-backdrop-filter: blur(24px) saturate(170%);
  }

  @media (prefers-reduced-transparency: reduce) {
    :host([acrylic]) .card {
      background: ${token('color.bg.layer')};
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }
`;
