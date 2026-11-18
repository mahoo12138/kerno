import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-surface>`:
 *
 * --k-surface-bg
 * --k-surface-border-color
 * --k-surface-border-width
 * --k-surface-padding
 * --k-surface-radius
 */
export const surfaceStyles = css`
  :host {
    --_bg: var(--k-surface-bg, ${token('color.bg.layer')});
    --_border-color: var(--k-surface-border-color, ${token('color.stroke.default')});
    --_border-width: var(--k-surface-border-width, ${token('control.borderWidth')});
    --_radius: var(--k-surface-radius, ${token('radius.lg')});

    position: relative;
    display: block;
    box-sizing: border-box;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    transition: filter ${token('motion.duration.normal')} ${token('motion.easing.standard')};
  }

  :host([hidden]) {
    display: none;
  }

  .clip {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: box-shadow ${token('motion.duration.normal')} ${token('motion.easing.standard')};
  }

  :host([acrylic]) .clip {
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
  }

  @media (prefers-reduced-transparency: reduce) {
    :host([acrylic]) .clip {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  :host([reduced-transparency]) .clip {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: block;
  }

  .content {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: var(--k-surface-padding, ${token('spacing.lg')});
  }
`;
