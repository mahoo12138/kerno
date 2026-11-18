import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const menuItemStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    all: unset;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    align-items: center;
    gap: ${token('spacing.sm')};
    min-height: ${token('control.height.md')};
    padding: 4px ${token('spacing.sm')};
    border-radius: ${token('radius.md')};
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.tight')};
    cursor: pointer;
    user-select: none;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(:disabled),
  .base:focus-visible:not(:disabled) {
    background: ${token('color.subtle.hover')};
    outline: none;
  }

  .base:active:not(:disabled) {
    background: ${token('color.subtle.active')};
  }

  .base:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .label {
    flex: 1 1 auto;
    text-align: start;
  }

  .prefix,
  .suffix {
    display: inline-flex;
    align-items: center;
    color: ${token('color.fg.secondary')};
    flex-shrink: 0;
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }
`;

export const menuStyles = css`
  :host {
    display: block;
    min-width: 160px;
  }

  .base {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: ${token('spacing.xs')};
    border-radius: ${token('radius.lg')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: ${token('color.bg.layer')};
    box-shadow: ${token('elevation.3')};
  }
`;

export const dropdownStyles = css`
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
    z-index: ${token('zIndex.dropdown')};
    min-width: 160px;
    border-radius: ${token('radius.lg')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: ${token('color.bg.layer')};
    box-shadow: ${token('elevation.4')};
    padding: ${token('spacing.xs')};
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 80%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
  }

  ::slotted(k-menu) {
    --_in-dropdown: 1;
  }
`;
