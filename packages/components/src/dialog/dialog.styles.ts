import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

const enter = `${token('motion.duration.normal')} ${token('motion.easing.decelerate')}`;
const exitDuration = token('motion.duration.fast');
const exitEasing = token('motion.easing.accelerate');

/**
 * Public customization surface for `<k-dialog>`:
 *
 * --k-dialog-width
 * --k-dialog-max-width
 * --k-dialog-radius
 * --k-dialog-bg
 * --k-dialog-backdrop-bg
 * --k-dialog-padding
 *
 * Entry/exit motion uses CSS transitions on the native `<dialog>` and its
 * `::backdrop` (`@starting-style` + `transition-behavior: allow-discrete`).
 * Durations come from motion tokens, which `prefers-reduced-motion` collapses
 * to 0. Browsers without discrete transitions simply skip the exit animation.
 */
export const dialogStyles = css`
  :host {
    display: contents;
  }

  .panel {
    position: fixed;
    inset: 0;
    z-index: ${token('zIndex.modal')};
    box-sizing: border-box;
    flex-direction: column;
    width: var(--k-dialog-width, 480px);
    max-width: var(--k-dialog-max-width, calc(100vw - 32px));
    height: fit-content;
    max-height: calc(100vh - 48px);
    margin: auto;
    padding: 0;
    border-radius: var(--k-dialog-radius, ${token('shape.radius.overlay')});
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: var(--k-dialog-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    box-shadow: ${token('elevation.5')};
    overflow: hidden;
    opacity: 1;
    transform: none;
    transition:
      opacity ${enter},
      transform ${enter},
      overlay ${enter} allow-discrete,
      display ${enter} allow-discrete;
  }

  /* Author rules beat the UA rule dialog:not([open]), so state both states explicitly. */
  .panel[open] {
    display: flex;
  }

  .panel:not([open]) {
    display: none;
    opacity: 0;
    transform: scale(0.95);
    transition-duration: ${exitDuration};
    transition-timing-function: ${exitEasing};
  }

  @starting-style {
    .panel[open] {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  .panel::backdrop {
    background: var(--k-dialog-backdrop-bg, ${token('color.backdrop')});
    opacity: 1;
    transition:
      opacity ${enter},
      overlay ${enter} allow-discrete,
      display ${enter} allow-discrete;
  }

  .panel:not([open])::backdrop {
    opacity: 0;
    transition-duration: ${exitDuration};
    transition-timing-function: ${exitEasing};
  }

  @starting-style {
    .panel[open]::backdrop {
      opacity: 0;
    }
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
    border-radius: ${token('shape.radius.control')};
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

  @media (forced-colors: active) {
    .panel {
      border-color: CanvasText;
    }
  }
`;
