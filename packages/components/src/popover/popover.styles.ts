import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-popover>`:
 *
 * --k-popover-width
 * --k-popover-max-width
 * --k-popover-padding
 * --k-popover-radius
 * --k-popover-bg
 */
export const popoverStyles = css`
  :host {
    display: inline-block;
  }

  .trigger {
    display: inline-flex;
  }

  :host(:not([open])) .panel {
    display: none;
  }

  .panel {
    position: fixed;
    z-index: ${token('zIndex.popover')};
    box-sizing: border-box;
    width: var(--k-popover-width, auto);
    max-width: var(--k-popover-max-width, 320px);
    padding: var(--k-popover-padding, ${token('spacing.md')});
    border-radius: var(--k-popover-radius, ${token('radius.lg')});
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: var(--k-popover-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.normal')};
    box-shadow: ${token('elevation.4')};
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 80%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
  }
`;
