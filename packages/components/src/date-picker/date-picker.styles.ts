import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-date-picker>`:
 *
 * --k-date-picker-height
 * --k-date-picker-radius
 * --k-date-picker-bg
 * --k-date-picker-border-color
 * --k-date-picker-border-color-focus
 */
export const datePickerStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;
    --_border: var(--k-date-picker-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: 210px;
    font-family: ${token('font.family.sans')};
  }

  :host([mode='range']) {
    min-width: 260px;
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
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: var(--k-date-picker-height, var(--_height));
    padding-inline: var(--_padding-x);
    border: 2px solid var(--_border);
    border-radius: var(--k-date-picker-radius, var(--_radius));
    background: var(--k-date-picker-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .trigger:hover:not(:disabled) {
    --_border: var(
      --k-date-picker-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 72%, transparent)
    );
  }

  :host([open]) .trigger,
  .trigger:focus-visible {
    --_border: var(--k-date-picker-border-color-focus, ${token('color.accent.default')});
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
    font-family: ${token('font.family.mono')};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .cal-icon {
    display: inline-flex;
    width: 14px;
    height: 14px;
    color: ${token('color.fg.secondary')};
  }

  .clear-btn svg,
  .cal-icon svg {
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
    width: 286px;
    padding: 12px;
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

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 10px;
  }

  .nav-btn,
  .view-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    border: 2px solid transparent;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .nav-btn {
    width: 28px;
    color: ${token('color.fg.secondary')};
  }

  .view-btn {
    flex: 1 1 auto;
    padding-inline: 8px;
    font-weight: ${token('font.weight.semibold')};
  }

  .nav-btn:hover,
  .view-btn:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .nav-btn:active,
  .view-btn:active {
    background: ${token('color.subtle.active')};
  }

  .nav-btn:focus-visible,
  .view-btn:focus-visible,
  .cell:focus-visible,
  .footer-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 1px;
  }

  .nav-btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 4px;
  }

  .weekday {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    font-size: 11px;
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.fg.tertiary')};
    text-transform: uppercase;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .period-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .cell {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    border: 2px solid transparent;
    border-radius: 0px;
    font-size: ${token('font.size.xs')};
    font-variant-numeric: tabular-nums;
    color: ${token('color.fg.default')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .period-grid .cell {
    height: 44px;
    font-size: ${token('font.size.sm')};
  }

  .cell[data-outside='true'] {
    color: ${token('color.fg.tertiary')};
  }

  .cell:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    border-color: ${token('color.stroke.strong')};
  }

  .cell[data-today='true']:not([aria-selected='true']) {
    border-color: ${token('color.accent.default')};
    color: ${token('color.accent.text')};
    font-weight: ${token('font.weight.semibold')};
  }

  .cell[data-in-range='true'] {
    background: color-mix(in srgb, ${token('color.accent.default')} 22%, transparent);
    color: ${token('color.fg.default')};
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
    text-decoration: line-through;
  }

  .cal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid ${token('color.stroke.default')};
  }

  .footer-btn {
    all: unset;
    box-sizing: border-box;
    padding: 3px 8px;
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.medium')};
    color: ${token('color.accent.text')};
    cursor: pointer;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .footer-btn:hover {
    background: color-mix(in srgb, ${token('color.accent.default')} 14%, transparent);
  }

  .footer-btn.muted {
    color: ${token('color.fg.secondary')};
  }

  .footer-btn.muted:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .footer-btn[hidden] {
    display: none;
  }
`;
