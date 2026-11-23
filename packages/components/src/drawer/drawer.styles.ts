import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

const enter = `${token('motion.duration.slow')} ${token('motion.easing.decelerate')}`;
const fade = `${token('motion.duration.normal')} ${token('motion.easing.decelerate')}`;
const exitDuration = token('motion.duration.normal');
const exitEasing = token('motion.easing.accelerate');
const border = `1px solid var(--k-drawer-border-color, ${token('color.stroke.control')})`;

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
 *
 * The slide is a CSS transition on the native `<dialog>` (`@starting-style` +
 * `transition-behavior: allow-discrete`); browsers without discrete
 * transitions skip the exit slide.
 */
export const drawerStyles = css`
  :host {
    --_size: 440px;
    --_from: translate3d(100%, 0, 0);

    display: contents;
  }

  :host(:dir(rtl)) {
    --_from: translate3d(-100%, 0, 0);
  }

  :host([placement='left']) {
    --_from: translate3d(-100%, 0, 0);
  }

  :host([placement='left']:dir(rtl)) {
    --_from: translate3d(100%, 0, 0);
  }

  :host([placement='top']) {
    --_from: translate3d(0, -100%, 0);
  }

  :host([placement='bottom']) {
    --_from: translate3d(0, 100%, 0);
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

  .panel {
    position: fixed;
    inset-block: 0;
    inset-inline: auto 0;
    z-index: ${token('zIndex.modal')};
    box-sizing: border-box;
    flex-direction: column;
    width: var(--k-drawer-size, var(--_size));
    max-width: 100vw;
    height: 100%;
    max-height: 100vh;
    margin: 0;
    padding: 0;
    border: none;
    border-inline-start: ${border};
    border-radius: 0px;
    background: var(--k-drawer-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    box-shadow: ${token('elevation.5')};
    overflow: hidden;
    transform: none;
    transition:
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
    transform: var(--_from);
    transition-duration: ${exitDuration};
    transition-timing-function: ${exitEasing};
  }

  @starting-style {
    .panel[open] {
      transform: var(--_from);
    }
  }

  .panel::backdrop {
    background: var(--k-drawer-backdrop-bg, ${token('color.backdrop')});
    opacity: 1;
    transition:
      opacity ${fade},
      overlay ${fade} allow-discrete,
      display ${fade} allow-discrete;
  }

  .panel:not([open])::backdrop {
    opacity: 0;
    transition-duration: ${token('motion.duration.fast')};
    transition-timing-function: ${exitEasing};
  }

  @starting-style {
    .panel[open]::backdrop {
      opacity: 0;
    }
  }

  :host([placement='left']) .panel {
    inset-inline: 0 auto;
    border-inline-start: none;
    border-inline-end: ${border};
  }

  :host([placement='top']) .panel,
  :host([placement='bottom']) .panel {
    inset-inline: 0;
    width: 100%;
    height: var(--k-drawer-size, var(--_size));
    border-inline-start: none;
  }

  :host([placement='top']) .panel {
    inset-block: 0 auto;
    border-block-end: ${border};
  }

  :host([placement='bottom']) .panel {
    inset-block: auto 0;
    border-block-start: ${border};
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
    border-radius: ${token('shape.radius.control')};
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

  @media (forced-colors: active) {
    .panel {
      border-color: CanvasText;
    }
  }
`;
