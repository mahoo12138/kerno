import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-dialog>`:
 *
 * --k-dialog-width
 * --k-dialog-max-width
 * --k-dialog-radius
 * --k-dialog-bg
 * --k-dialog-backdrop-bg
 * --k-dialog-padding
 */
export const dialogStyles = css`
  :host {
    display: contents;
  }

  :host(:not([open])) .overlay {
    display: none;
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: ${token('zIndex.modal')};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${token('spacing.xl')};
    box-sizing: border-box;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--k-dialog-backdrop-bg, rgba(0, 0, 0, 0.45));
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
    width: var(--k-dialog-width, 480px);
    max-width: var(--k-dialog-max-width, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    border-radius: var(--k-dialog-radius, ${token('radius.lg')});
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: var(--k-dialog-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    box-shadow: ${token('elevation.5')};
    overflow: hidden;
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 82%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
  }

  .panel:focus {
    outline: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.md')};
    padding: var(--k-dialog-padding, ${token('spacing.lg')});
    padding-bottom: ${token('spacing.sm')};
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
    border-radius: ${token('radius.md')};
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .close-btn:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .close-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .close-btn svg {
    width: 14px;
    height: 14px;
  }

  .body {
    flex: 1 1 auto;
    overflow: auto;
    padding: ${token('spacing.sm')} var(--k-dialog-padding, ${token('spacing.lg')});
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.normal')};
    color: ${token('color.fg.secondary')};
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${token('spacing.sm')};
    padding: ${token('spacing.md')} var(--k-dialog-padding, ${token('spacing.lg')});
    padding-top: ${token('spacing.sm')};
  }

  .footer:not(.has-content) {
    display: none;
  }
`;
