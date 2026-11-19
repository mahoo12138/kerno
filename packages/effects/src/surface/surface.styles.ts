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
    display: block;
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

  .clip {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: box-shadow ${token('motion.duration.normal')} ${token('motion.easing.standard')};
  }

  :host([acrylic]) .clip {
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')})
      brightness(${token('surface.acrylic.brightness')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')})
      brightness(${token('surface.acrylic.brightness')});
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

  @media (forced-colors: active) {
    :host([acrylic]) .clip {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
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
