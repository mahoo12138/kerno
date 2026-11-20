import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-time-picker>`:
 *
 * --k-time-picker-height
 * --k-time-picker-radius
 * --k-time-picker-bg
 * --k-time-picker-border-color
 * --k-time-picker-border-color-focus
 */
export const timePickerStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;
    --_border: var(--k-time-picker-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: min(170px, 100%);
    max-width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: 6px;
  }

  :host([size='sm']) {
    --_height: ${token('control.height.sm')};
    --_padding-x: ${token('control.paddingX.sm')};
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_height: ${token('control.height.lg')};
    --_padding-x: ${token('control.paddingX.lg')};
    --_font-size: ${token('font.size.md')};
  }

  .trigger {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: var(--k-time-picker-height, var(--_height));
    padding-inline: var(--_padding-x);
    border: 2px solid var(--_border);
    border-radius: var(--k-time-picker-radius, var(--_radius));
    background: var(--k-time-picker-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-size: var(--_font-size);
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .trigger:hover:not(:disabled) {
    --_border: var(
      --k-time-picker-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 72%, transparent)
    );
  }

  :host([open]) .trigger,
  .trigger:focus-visible {
    --_border: var(--k-time-picker-border-color-focus, ${token('color.accent.default')});
    outline: none;
  }

  :host([data-user-invalid]) .trigger {
    --_border: ${token('color.status.danger.solid')};
  }

  .trigger:disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    --_border: ${token('color.stroke.default')};
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--_border);
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([shape='chamfer']) .trigger,
  :host([shape='scallop']) .trigger,
  :host([shape='notch']) .trigger {
    border-color: transparent;
  }

  .display {
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: ${token('font.family.mono')};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .display.placeholder {
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.tertiary')};
  }

  .trailing {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .clear-btn {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
  }

  .clear-btn[hidden] {
    display: none;
  }

  .clear-btn:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .clock-icon {
    display: inline-flex;
    width: 14px;
    height: 14px;
    color: ${token('color.fg.secondary')};
  }

  .clear-btn svg,
  .clock-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  :host(:not([open])) .panel:not(.closing) {
    display: none;
  }

  .panel {
    position: fixed;
    inset: auto;
    margin: 0;
    box-sizing: border-box;
    z-index: ${token('zIndex.popover')};
    border-radius: 0px;
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
    font-family: ${token('font.family.sans')};
    user-select: none;
  }

  .panel.closing {
    pointer-events: none;
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 82%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    border-color: ${token('surface.acrylic.border')};
  }

  .columns {
    display: flex;
    align-items: stretch;
  }

  .col-wrap {
    display: flex;
    flex-direction: column;
    min-width: 64px;
  }

  .col-wrap + .col-wrap {
    border-inline-start: 1px solid ${token('color.stroke.subtle')};
  }

  .col-head {
    padding: 6px 8px;
    text-align: center;
    font-size: 10px;
    font-weight: ${token('font.weight.semibold')};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${token('color.fg.tertiary')};
    border-bottom: 1px solid ${token('color.stroke.subtle')};
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 210px;
    overflow-y: auto;
    padding: 4px;
    scrollbar-width: thin;
  }

  .cell {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    padding: 4px 10px;
    border: 2px solid transparent;
    font-family: ${token('font.family.mono')};
    font-size: ${token('font.size.xs')};
    font-variant-numeric: tabular-nums;
    color: ${token('color.fg.default')};
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .cell:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    border-color: ${token('color.stroke.strong')};
  }

  .cell[aria-selected='true'] {
    background: ${token('color.accent.default')};
    color: ${token('color.accent.fg')};
    border-color: transparent;
    font-weight: ${token('font.weight.semibold')};
  }

  .cell[aria-selected='true']:hover:not(:disabled) {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  .cell[aria-selected='true']:active:not(:disabled) {
    background: ${token('color.accent.active')};
    border-color: transparent;
  }

  .cell:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
    border-color: transparent;
  }

  .cell:focus-visible,
  .footer-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 1px;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-top: 1px solid ${token('color.stroke.default')};
  }

  .footer-btn {
    all: unset;
    box-sizing: border-box;
    padding: 3px 10px;
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.medium')};
    color: ${token('color.accent.text')};
    cursor: pointer;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .footer-btn:hover {
    background: color-mix(in srgb, ${token('color.accent.default')} 14%, transparent);
  }

  .footer-btn.primary {
    background: ${token('color.accent.default')};
    color: ${token('color.accent.fg')};
    border: 2px solid transparent;
  }

  .footer-btn.primary:hover {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }
`;
