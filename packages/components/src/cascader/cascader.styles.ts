import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-cascader>`:
 *
 * --k-cascader-height
 * --k-cascader-radius
 * --k-cascader-bg
 * --k-cascader-border-color
 * --k-cascader-border-color-focus
 */
export const cascaderStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: ${token('shape.radius.control')};
    --_border: var(--k-cascader-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: min(230px, 100%);
    max-width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: ${token('shape.radius.parametric')};
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
    min-height: var(--k-cascader-height, var(--_height));
    padding-inline: var(--_padding-x);
    border: 2px solid var(--_border);
    border-radius: var(--k-cascader-radius, var(--_radius));
    background: var(--k-cascader-bg, ${token('color.bg.layer')});
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
      --k-cascader-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 72%, transparent)
    );
  }

  :host([open]) .trigger,
  .trigger:focus-visible {
    --_border: var(--k-cascader-border-color-focus, ${token('color.accent.default')});
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
    white-space: nowrap;
  }

  .display.placeholder {
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

  .arrow {
    display: inline-flex;
    width: 12px;
    height: 12px;
    color: ${token('color.fg.secondary')};
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  :host([open]) .arrow {
    transform: rotate(180deg);
  }

  .clear-btn svg,
  .arrow svg {
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
    z-index: ${token('zIndex.dropdown')};
    border-radius: ${token('shape.radius.overlay')};
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
    font-family: ${token('font.family.sans')};
    user-select: none;
    max-width: calc(100vw - 24px);
    overflow-x: auto;
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

  .menus {
    display: flex;
    align-items: stretch;
  }

  .menu {
    display: flex;
    flex-direction: column;
    min-width: 156px;
    max-height: 240px;
    overflow-y: auto;
    padding: 4px 0;
    box-sizing: border-box;
  }

  .menu + .menu {
    border-inline-start: 1px solid ${token('color.stroke.subtle')};
  }

  .item {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 32px;
    padding: 5px 10px 5px 14px;
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3px;
    bottom: 3px;
    width: 3px;
    background: ${token('color.accent.default')};
    transform: scaleY(0);
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  .item:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
  }

  .item[data-active='true'] {
    background: color-mix(in srgb, ${token('color.accent.default')} 16%, transparent);
  }

  .item[data-active='true']::before {
    transform: scaleY(1);
  }

  .item[aria-selected='true'] {
    background: color-mix(in srgb, ${token('color.accent.default')} 30%, transparent);
    font-weight: ${token('font.weight.semibold')};
  }

  .item[aria-selected='true']::before {
    transform: scaleY(1);
  }

  .item:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
  }

  .item:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
  }

  .item:disabled::before {
    transform: scaleY(0);
  }

  .item-chevron {
    display: inline-flex;
    width: 12px;
    height: 12px;
    color: ${token('color.fg.tertiary')};
    flex-shrink: 0;
  }

  .item-chevron svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .empty {
    padding: 14px 16px;
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
  }
`;
