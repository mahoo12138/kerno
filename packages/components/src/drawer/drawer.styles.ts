import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-drawer>`:
 *
 * --k-drawer-size
 * --k-drawer-bg
 * --k-drawer-backdrop-bg
 * --k-drawer-padding
 * --k-drawer-border-color
 *
 * Styled after Windows 10 Fluent 1 SplitView / Flyout Panel:
 * - Edge-flush sharp `0px` geometry with `1px` crisp inner border
 * - Supports `right | left | top | bottom` placements & Acrylic glass
 */
export const drawerStyles = css`
  :host {
    --_size: 440px;

    display: contents;
  }

  :host([size='sm']) {
    --_size: 320px;
  }

  :host([size='lg']) {
    --_size: 640px;
  }

  :host([size='full']) {
    --_size: 100%;
  }

  :host(:not([open])) .overlay:not(.closing) {
    display: none;
  }

  .overlay {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    overflow: hidden;
    z-index: ${token('zIndex.modal')};
    display: flex;
    box-sizing: border-box;
  }

  .overlay.closing {
    pointer-events: none;
  }

  :host([placement='right']) .overlay,
  :host(:not([placement])) .overlay {
    justify-content: flex-end;
    align-items: stretch;
  }

  :host([placement='left']) .overlay {
    justify-content: flex-start;
    align-items: stretch;
  }

  :host([placement='top']) .overlay {
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }

  :host([placement='bottom']) .overlay {
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--k-drawer-backdrop-bg, rgba(0, 0, 0, 0.45));
  }

  :host(:not([modal])) .backdrop {
    display: none;
  }

  .panel {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--k-drawer-size, var(--_size));
    max-width: 100vw;
    height: 100%;
    border-radius: 0px;
    border-inline-start: 1px solid var(--k-drawer-border-color, ${token('color.stroke.control')});
    background: var(--k-drawer-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    box-shadow: ${token('elevation.5')};
    overflow: hidden;
  }

  :host([placement='left']) .panel {
    border-inline-start: none;
    border-inline-end: 1px solid var(--k-drawer-border-color, ${token('color.stroke.control')});
  }

  :host([placement='top']) .panel,
  :host([placement='bottom']) .panel {
    width: 100%;
    height: var(--k-drawer-size, var(--_size));
    max-height: 100vh;
    border-inline-start: none;
  }

  :host([placement='top']) .panel {
    border-block-end: 1px solid var(--k-drawer-border-color, ${token('color.stroke.control')});
  }

  :host([placement='bottom']) .panel {
    border-block-start: 1px solid var(--k-drawer-border-color, ${token('color.stroke.control')});
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 80%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    border-color: ${token('surface.acrylic.border')};
  }

  .panel:focus {
    outline: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.md')};
    padding: var(--k-drawer-padding, ${token('spacing.lg')});
    border-bottom: 1px solid ${token('color.stroke.default')};
    flex-shrink: 0;
  }

  .title {
    margin: 0;
    font-size: ${token('font.size.lg')};
    font-weight: ${token('font.weight.semibold')};
    line-height: ${token('font.lineHeight.tight')};
  }

  .close-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .close-btn:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .close-btn:active {
    background: ${token('color.subtle.active')};
  }

  .close-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .close-btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .body {
    flex: 1 1 auto;
    overflow: auto;
    padding: var(--k-drawer-padding, ${token('spacing.lg')});
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.normal')};
    color: ${token('color.fg.secondary')};
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${token('spacing.sm')};
    padding: ${token('spacing.md')} var(--k-drawer-padding, ${token('spacing.lg')});
    border-top: 1px solid ${token('color.stroke.default')};
    flex-shrink: 0;
  }

  .footer:not(.has-content) {
    display: none;
  }
`;
