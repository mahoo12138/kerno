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
 * --k-surface-acrylic-tint
 * --k-surface-acrylic-tint-opacity
 * --k-surface-acrylic-blur
 * --k-surface-acrylic-saturation
 * --k-surface-acrylic-brightness
 * --k-surface-acrylic-noise-opacity
 * --k-surface-acrylic-border
 * --k-surface-acrylic-fallback
 */
export const surfaceStyles = css`
  :host {
    --_bg: var(--k-surface-bg, ${token('color.bg.layer')});
    --_border-color: var(--k-surface-border-color, ${token('color.stroke.default')});
    --_border-width: var(--k-surface-border-width, ${token('control.borderWidth')});
    --_radius: var(--k-surface-radius, ${token('radius.lg')});

    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    box-sizing: border-box;
    isolation: isolate;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([acrylic]) {
    --_border-color: var(--k-surface-border-color, ${token('surface.acrylic.border')});
  }

  .shadow-canvas {
    position: absolute;
    inset: -48px;
    width: calc(100% + 96px);
    height: calc(100% + 96px);
    pointer-events: none;
    display: block;
    z-index: 0;
  }

  .shadow-canvas[hidden] {
    display: none;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: none;
    z-index: 1;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }

  :host([acrylic]) .backdrop {
    display: block;
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')})
      brightness(${token('surface.acrylic.brightness')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')})
      brightness(${token('surface.acrylic.brightness')});
  }

  @media (prefers-reduced-transparency: reduce) {
    :host([acrylic]) .backdrop {
      display: none;
    }
  }

  :host([reduced-transparency]) .backdrop {
    display: none;
  }

  @media (forced-colors: active) {
    :host([acrylic]) .backdrop {
      display: none;
    }
    :host([acrylic]) .clip {
      background: Canvas;
    }
  }

  .canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: block;
    z-index: 2;
    transition: box-shadow ${token('motion.duration.normal')} ${token('motion.easing.standard')};
  }

  .clip {
    position: relative;
    z-index: 3;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    box-sizing: border-box;
    width: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .content {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    padding: var(--k-surface-padding, ${token('spacing.lg')});
  }
`;
