import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-alert>`:
 *
 * --k-alert-radius
 * --k-alert-padding
 * --k-alert-bg
 * --k-alert-fg
 * --k-alert-border-color
 * --k-alert-accent-color
 *
 * Styled after Windows 10 Fluent 1 InfoBar:
 * - Sharp `0px` geometry (or chamfer/scallop/notch via `shape`)
 * - Bold `3px` left chromatic status strip + subtle tinted background
 */
export const alertStyles = css`
  :host {
    --_bg: ${token('color.status.info.bg')};
    --_fg: ${token('color.fg.default')};
    --_accent: ${token('color.status.info.solid')};
    --_icon: ${token('color.status.info.fg')};
    --_border: color-mix(in srgb, var(--_accent) 28%, ${token('color.stroke.default')});
    --_radius: ${token('shape.radius.control')};

    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]),
  :host(:not([open])) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: ${token('shape.radius.parametric')};
  }

  :host([variant='neutral']) {
    --_bg: ${token('color.bg.layerAlt')};
    --_accent: ${token('color.stroke.strong')};
    --_icon: ${token('color.fg.secondary')};
    --_border: ${token('color.stroke.default')};
  }

  :host([variant='success']) {
    --_bg: ${token('color.status.success.bg')};
    --_accent: ${token('color.status.success.solid')};
    --_icon: ${token('color.status.success.fg')};
  }

  :host([variant='warning']) {
    --_bg: ${token('color.status.warning.bg')};
    --_accent: ${token('color.status.warning.solid')};
    --_icon: ${token('color.status.warning.fg')};
  }

  :host([variant='danger']) {
    --_bg: ${token('color.status.danger.bg')};
    --_accent: ${token('color.status.danger.solid')};
    --_icon: ${token('color.status.danger.fg')};
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: ${token('spacing.md')};
    padding: var(--k-alert-padding, 12px 14px);
    padding-inline-start: 16px;
    border-radius: var(--k-alert-radius, var(--_radius));
    border: 1px solid var(--k-alert-border-color, var(--_border));
    background: var(--k-alert-bg, var(--_bg));
    color: var(--k-alert-fg, var(--_fg));
  }

  .base::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--k-alert-accent-color, var(--_accent));
  }

  :host([shape='chamfer']) .base,
  :host([shape='scallop']) .base,
  :host([shape='notch']) .base {
    border-color: transparent;
  }

  .shape-stroke {
    position: absolute;
    inset: -1px;
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--k-alert-border-color, var(--_border));
    stroke-width: 1.5px;
  }

  .icon {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    color: var(--_icon);
  }

  .icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .content {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.semibold')};
    line-height: ${token('font.lineHeight.tight')};
    color: ${token('color.fg.default')};
  }

  .title:not(.has-content) {
    display: none;
  }

  .description {
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.normal')};
    color: ${token('color.fg.secondary')};
  }

  .description:not(.has-content) {
    display: none;
  }

  .action {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: ${token('spacing.xs')};
    flex-shrink: 0;
    align-self: center;
  }

  .action:not(.has-content) {
    display: none;
  }

  .close-btn {
    all: unset;
    position: relative;
    z-index: 1;
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
`;
