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
    box-sizing: border-box;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: ${token('control.height.md')};
    padding: 4px ${token('spacing.sm')};
    border-radius: ${token('radius.md')};
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
    color: ${token('color.accent.text')};
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

    display: inline-flex;
    vertical-align: middle;
    min-width: 180px;
  }

  :host([hidden]) {
    display: none;
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
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    min-height: var(--_height);
    padding-inline: var(--_padding-x);
    border-radius: ${token('radius.md')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.control')};
    background: ${token('color.control.default')};
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([data-user-invalid]) .combobox {
    border-color: ${token('color.status.danger.solid')};
  }

  .combobox:hover:not(:disabled) {
    background: ${token('color.control.hover')};
  }

  .combobox:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .combobox:disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    border-color: ${token('color.stroke.default')};
  }

  .display.placeholder {
    color: ${token('color.fg.tertiary')};
  }

  .arrow {
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

  :host(:not([open])) .listbox {
    display: none;
  }

  .listbox {
    position: fixed;
    z-index: ${token('zIndex.dropdown')};
    min-width: 180px;
    max-height: 240px;
    overflow: auto;
    padding: ${token('spacing.xs')};
    border-radius: ${token('radius.lg')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: ${token('color.bg.layer')};
    box-shadow: ${token('elevation.4')};
  }
`;
