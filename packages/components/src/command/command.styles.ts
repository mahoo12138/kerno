import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-command>`:
 *
 * --k-command-width
 * --k-command-max-height
 * --k-command-bg
 * --k-command-border-color
 * --k-command-backdrop-bg
 *
 * Styled after Windows 10 Fluent 1 / PowerToys Run command palette:
 * - Sharp `0px` top-weighted Top-Layer panel with crisp `1px` frame & Acrylic support
 * - `2px` Accent search focus underline and `3px` left Accent active-item bar
 */
export const commandStyles = css`
  :host {
    display: contents;
  }

  :host([inline]) {
    display: block;
  }

  :host(:not([inline]):not([open])) .overlay:not(.closing) {
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
    border: 0;
    background: transparent;
    color: inherit;
    overflow: visible;
    z-index: ${token('zIndex.modal')};
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: clamp(48px, 14vh, 140px) ${token('spacing.lg')} ${token('spacing.xl')};
    box-sizing: border-box;
  }

  :host([inline]) .overlay {
    position: relative;
    inset: auto;
    width: auto;
    height: auto;
    padding: 0;
    display: block;
    z-index: auto;
  }

  .overlay.closing {
    pointer-events: none;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--k-command-backdrop-bg, rgba(0, 0, 0, 0.48));
  }

  :host([inline]) .backdrop {
    display: none;
  }

  .panel {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--k-command-width, 560px);
    max-width: 100%;
    max-height: var(--k-command-max-height, min(460px, 70vh));
    border-radius: 0px;
    border: 1px solid var(--k-command-border-color, ${token('color.stroke.control')});
    background: var(--k-command-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    box-shadow: ${token('elevation.5')};
    overflow: hidden;
  }

  :host([inline]) .panel {
    width: 100%;
    box-shadow: ${token('elevation.1')};
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 82%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    border-color: ${token('surface.acrylic.border')};
  }

  .panel:focus {
    outline: none;
  }

  .search-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('spacing.sm')};
    padding: 0 ${token('spacing.md')};
    min-height: 46px;
    border-bottom: 2px solid ${token('color.stroke.default')};
    transition: border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .search-row:focus-within {
    border-bottom-color: ${token('color.accent.default')};
  }

  .search-icon {
    display: inline-flex;
    width: 16px;
    height: 16px;
    color: ${token('color.fg.tertiary')};
    flex-shrink: 0;
  }

  .search-row:focus-within .search-icon {
    color: ${token('color.accent.text')};
  }

  .search-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .search-input {
    all: unset;
    flex: 1 1 auto;
    min-width: 0;
    height: 44px;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.md')};
    line-height: 1.4;
  }

  .search-input::placeholder {
    color: ${token('color.fg.tertiary')};
  }

  .esc-hint {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layerAlt')};
    color: ${token('color.fg.tertiary')};
    font-family: ${token('font.family.mono')};
    font-size: 11px;
    line-height: 1.3;
    flex-shrink: 0;
  }

  :host([inline]) .esc-hint {
    display: none;
  }

  .list {
    flex: 1 1 auto;
    overflow: auto;
    padding: 6px 0;
  }

  .empty {
    padding: ${token('spacing.xl')} ${token('spacing.lg')};
    text-align: center;
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.tertiary')};
  }

  .empty[hidden] {
    display: none;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.md')};
    padding: 8px ${token('spacing.md')};
    border-top: 1px solid ${token('color.stroke.default')};
    background: color-mix(in srgb, ${token('color.bg.layerAlt')} 60%, transparent);
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
  }

  .footer-keys {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .footer kbd {
    display: inline-block;
    padding: 1px 5px;
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layer')};
    font-family: ${token('font.family.mono')};
    font-size: 11px;
    color: ${token('color.fg.secondary')};
  }
`;

export const commandGroupStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }

  .heading {
    padding: 8px ${token('spacing.md')} 4px;
    font-family: ${token('font.family.sans')};
    font-size: 11px;
    font-weight: ${token('font.weight.semibold')};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${token('color.fg.tertiary')};
    user-select: none;
  }

  .heading:empty {
    display: none;
  }
`;

export const commandItemStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: ${token('spacing.sm')};
    width: 100%;
    min-height: 36px;
    padding: 6px ${token('spacing.md')};
    padding-inline-start: 16px;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.tight')};
    cursor: pointer;
    user-select: none;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    background: ${token('color.accent.default')};
    transform: scaleY(0);
    transition:
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([active]) .base {
    background: color-mix(in srgb, ${token('color.accent.default')} 16%, transparent);
  }

  :host([active]) .base::before {
    transform: scaleY(1);
  }

  :host([active]) .base:active {
    background: color-mix(in srgb, ${token('color.accent.active')} 28%, transparent);
  }

  :host([active]) .base:active::before {
    background: ${token('color.accent.active')};
  }

  :host([disabled]) .base {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
  }

  :host([disabled]) .base::before {
    transform: scaleY(0);
  }

  .prefix,
  .suffix {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${token('color.fg.secondary')};
  }

  :host([active]) .prefix {
    color: ${token('color.accent.text')};
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }

  .text {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desc {
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desc:not(.has-content) {
    display: none;
  }

  .shortcut {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .shortcut:empty {
    display: none;
  }

  .shortcut kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    padding: 1px 5px;
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layerAlt')};
    color: ${token('color.fg.secondary')};
    font-family: ${token('font.family.mono')};
    font-size: 11px;
    line-height: 1.35;
  }
`;
