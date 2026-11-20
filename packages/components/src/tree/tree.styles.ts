import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const treeStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
`;

export const treeItemStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .row {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 4px 10px;
    padding-inline-start: calc(8px + var(--_tree-level, 0) * var(--k-tree-indent, 20px));
    color: ${token('color.fg.default')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.tight')};
    cursor: pointer;
    user-select: none;
    outline: none;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .row::before {
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

  .row:hover {
    background: ${token('color.subtle.hover')};
  }

  .row:active {
    background: ${token('color.subtle.active')};
  }

  :host([selected]) > .row {
    background: color-mix(in srgb, ${token('color.accent.default')} 16%, transparent);
    font-weight: ${token('font.weight.semibold')};
  }

  :host([selected]) > .row::before {
    transform: scaleY(1);
  }

  :host([selected]) > .row:hover {
    background: color-mix(in srgb, ${token('color.accent.hover')} 24%, transparent);
  }

  :host([selected]) > .row:hover::before {
    background: ${token('color.accent.hover')};
  }

  :host([selected]) > .row:active {
    background: color-mix(in srgb, ${token('color.accent.active')} 30%, transparent);
  }

  .row:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
  }

  :host([disabled]) > .row {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
  }

  :host([disabled]) > .row::before {
    transform: scaleY(0);
  }

  .toggle {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: ${token('color.fg.secondary')};
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  .toggle.leaf {
    visibility: hidden;
    pointer-events: none;
  }

  :host([expanded]) > .row .toggle:not(.spinning) {
    transform: rotate(90deg);
    color: ${token('color.fg.default')};
  }

  .toggle.spinning svg {
    animation: k-tree-spin 0.85s linear infinite;
    color: ${token('color.accent.text')};
  }

  @keyframes k-tree-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .toggle svg {
    width: 12px;
    height: 12px;
    display: block;
  }

  .check {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border: 2px solid ${token('color.fg.secondary')};
    background: transparent;
    color: ${token('color.accent.fg')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .check[hidden] {
    display: none;
  }

  .check:hover:not(:disabled) {
    border-color: ${token('color.fg.default')};
  }

  .check[aria-checked='true'],
  .check[aria-checked='mixed'] {
    background: ${token('color.accent.default')};
    border-color: transparent;
  }

  .check[aria-checked='true']:hover:not(:disabled),
  .check[aria-checked='mixed']:hover:not(:disabled) {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  .check[aria-checked='true']:active:not(:disabled),
  .check[aria-checked='mixed']:active:not(:disabled) {
    background: ${token('color.accent.active')};
    border-color: transparent;
  }

  .check:disabled {
    cursor: default;
    border-color: ${token('color.fg.disabled')};
  }

  .check[aria-checked='true']:disabled,
  .check[aria-checked='mixed']:disabled {
    background: ${token('color.accent.disabled')};
    color: ${token('color.accent.fgDisabled')};
    border-color: transparent;
  }

  .check svg {
    width: 12px;
    height: 12px;
    display: block;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    color: ${token('color.fg.secondary')};
    flex-shrink: 0;
  }

  .icon:not(.has-content) {
    display: none;
  }

  .label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .children {
    display: none;
  }

  :host([expanded]) > .children {
    display: block;
  }
`;
