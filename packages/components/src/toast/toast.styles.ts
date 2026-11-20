import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-toast>`:
 *
 * --k-toast-width
 * --k-toast-radius
 * --k-toast-bg
 * --k-toast-border-color
 * --k-toast-accent-color
 */
export const toastStyles = css`
  :host {
    --_accent: ${token('color.status.info.solid')};
    --_icon: ${token('color.status.info.fg')};

    display: block;
    width: var(--k-toast-width, 340px);
    max-width: calc(100vw - 32px);
    pointer-events: auto;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]),
  :host(:not([open])) {
    display: none;
  }

  :host([variant='neutral']) {
    --_accent: ${token('color.stroke.strong')};
    --_icon: ${token('color.fg.secondary')};
  }

  :host([variant='success']) {
    --_accent: ${token('color.status.success.solid')};
    --_icon: ${token('color.status.success.fg')};
  }

  :host([variant='warning']) {
    --_accent: ${token('color.status.warning.solid')};
    --_icon: ${token('color.status.warning.fg')};
  }

  :host([variant='danger']) {
    --_accent: ${token('color.status.danger.solid')};
    --_icon: ${token('color.status.danger.fg')};
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: ${token('spacing.md')};
    padding: 12px 12px 12px 16px;
    border-radius: var(--k-toast-radius, 0px);
    border: 1px solid var(--k-toast-border-color, ${token('color.stroke.control')});
    background: var(--k-toast-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
    overflow: hidden;
  }

  :host([acrylic]) .base {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 82%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    border-color: ${token('surface.acrylic.border')};
  }

  .base::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--k-toast-accent-color, var(--_accent));
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    flex-shrink: 0;
    color: var(--_icon);
  }

  .icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .title {
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.semibold')};
    line-height: ${token('font.lineHeight.tight')};
    color: ${token('color.fg.default')};
  }

  .title:empty {
    display: none;
  }

  .description {
    font-size: ${token('font.size.xs')};
    line-height: ${token('font.lineHeight.normal')};
    color: ${token('color.fg.secondary')};
  }

  .description:not(.has-content) {
    display: none;
  }

  .actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  }

  .actions:not(.has-content) {
    display: none;
  }

  .action-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border: 1px solid color-mix(in srgb, ${token('color.accent.default')} 45%, transparent);
    background: color-mix(in srgb, ${token('color.accent.default')} 14%, transparent);
    color: ${token('color.accent.text')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.medium')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .action-btn[hidden] {
    display: none;
  }

  .action-btn:hover {
    background: color-mix(in srgb, ${token('color.accent.hover')} 22%, transparent);
    border-color: ${token('color.accent.borderHover')};
  }

  .action-btn:active {
    background: color-mix(in srgb, ${token('color.accent.active')} 30%, transparent);
  }

  .action-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 1px;
  }

  .close-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .close-btn[hidden] {
    display: none;
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

  .progress {
    position: absolute;
    left: 3px;
    right: 0;
    bottom: 0;
    height: 2px;
    background: color-mix(in srgb, var(--k-toast-accent-color, var(--_accent)) 65%, transparent);
    transform-origin: left center;
    animation: k-toast-countdown var(--_duration, 4000ms) linear forwards;
  }

  .progress[hidden] {
    display: none;
  }

  :host([data-paused]) .progress {
    animation-play-state: paused;
  }

  @keyframes k-toast-countdown {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress {
      animation: none;
    }
  }
`;

export const toastContainerStyles = css`
  :host {
    display: contents;
  }

  .viewport {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 16px;
    border: 0;
    background: transparent;
    overflow: visible;
    pointer-events: none;
    z-index: ${token('zIndex.toast')};
    display: flex;
    flex-direction: column;
    gap: ${token('spacing.sm')};
    box-sizing: border-box;
    max-height: 100vh;
  }

  .viewport:not(.active) {
    display: none;
  }

  :host([placement='bottom-end']) .viewport,
  :host(:not([placement])) .viewport {
    right: 0;
    bottom: 0;
    align-items: flex-end;
  }

  :host([placement='bottom-start']) .viewport {
    left: 0;
    bottom: 0;
    align-items: flex-start;
  }

  :host([placement='bottom']) .viewport {
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    align-items: center;
  }

  :host([placement='top-end']) .viewport {
    right: 0;
    top: 0;
    align-items: flex-end;
  }

  :host([placement='top-start']) .viewport {
    left: 0;
    top: 0;
    align-items: flex-start;
  }

  :host([placement='top']) .viewport {
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    align-items: center;
  }
`;
