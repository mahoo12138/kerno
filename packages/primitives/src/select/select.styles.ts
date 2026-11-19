import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const optionStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: ${token('control.height.md')};
    padding: 4px ${token('spacing.sm')};
    border-radius: 0px;
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    cursor: pointer;
    user-select: none;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(:disabled),
  .base:focus-visible:not(:disabled) {
    background: ${token('color.subtle.hover')};
    outline: none;
  }

  :host([selected]) .base {
    font-weight: ${token('font.weight.semibold')};
    background: color-mix(in srgb, ${token('color.accent.default')} 22%, transparent);
    color: ${token('color.fg.default')};
  }

  :host([selected]) .base:hover:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.default')} 32%, transparent);
  }

  .base:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .check {
    display: inline-flex;
    width: 14px;
    height: 14px;
    opacity: 0;
  }

  :host([selected]) .check {
    opacity: 1;
  }

  .check svg {
    width: 100%;
    height: 100%;
  }
`;

export const selectStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;

    display: inline-flex;
    vertical-align: middle;
    min-width: 180px;
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

  .combobox {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: var(--_height);
    padding-inline: var(--_padding-x);
    border-radius: var(--_radius);
    border: 2px solid ${token('color.stroke.strong')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([shape='chamfer']) .combobox,
  :host([shape='scallop']) .combobox,
  :host([shape='notch']) .combobox {
    border-color: transparent;
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: ${token('color.stroke.strong')};
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([data-user-invalid]) .combobox {
    border-color: ${token('color.status.danger.solid')};
  }

  .combobox:hover:not(:disabled) {
    border-color: color-mix(in srgb, ${token('color.fg.default')} 68%, transparent);
  }

  :host([shape='chamfer']) .combobox:hover:not(:disabled),
  :host([shape='scallop']) .combobox:hover:not(:disabled),
  :host([shape='notch']) .combobox:hover:not(:disabled) {
    border-color: transparent;
  }

  .combobox:hover:not(:disabled) .shape-stroke {
    stroke: color-mix(in srgb, ${token('color.fg.default')} 68%, transparent);
  }

  :host([open]) .combobox,
  .combobox:focus-visible {
    border-color: ${token('color.accent.default')};
    outline: none;
  }

  :host([open]) .shape-stroke,
  .combobox:focus-visible .shape-stroke {
    stroke: ${token('color.accent.default')};
  }

  .combobox:disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    border-color: ${token('color.stroke.default')};
  }

  .display {
    position: relative;
    z-index: 2;
  }

  .display.placeholder {
    color: ${token('color.fg.tertiary')};
  }

  .arrow {
    position: relative;
    z-index: 2;
    display: inline-flex;
    width: 14px;
    height: 14px;
    color: ${token('color.fg.secondary')};
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([open]) .arrow {
    transform: rotate(180deg);
  }

  .arrow svg {
    width: 100%;
    height: 100%;
  }

  :host(:not([open])) .listbox:not(.closing) {
    display: none;
  }

  .listbox {
    position: fixed;
    inset: auto;
    margin: 0;
    z-index: ${token('zIndex.dropdown')};
    min-width: 180px;
    max-height: 240px;
    overflow: auto;
    padding: 2px;
    border-radius: 0px;
    border: 2px solid ${token('color.stroke.strong')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
  }

  .listbox.closing {
    pointer-events: none;
  }
`;
