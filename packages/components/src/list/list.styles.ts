import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const listStyles = css`
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
    background: ${token('color.bg.layer')};
    border: 1px solid ${token('color.stroke.default')};
    border-radius: var(--k-list-radius, ${token('shape.radius.control')});
    overflow: hidden;
  }

  :host(:not([bordered])) .base {
    border: none;
    background: transparent;
  }

  :host([divided]) ::slotted(k-list-item:not(:last-child)) {
    border-bottom: 1px solid ${token('color.stroke.subtle')};
  }

  :host([dense]) {
    --k-list-item-padding: 6px 12px;
  }
`;

export const listItemStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: ${token('spacing.md')};
    width: 100%;
    padding: var(--k-list-item-padding, 10px 14px);
    color: ${token('color.fg.default')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.tight')};
    outline: none;
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

  :host([interactive]) .base,
  :host([data-selectable]) .base {
    cursor: pointer;
    user-select: none;
  }

  :host([interactive]) .base:hover,
  :host([data-selectable]) .base:hover {
    background: ${token('color.subtle.hover')};
  }

  :host([interactive]) .base:active,
  :host([data-selectable]) .base:active {
    background: ${token('color.subtle.active')};
  }

  :host([selected]) .base {
    background: color-mix(in srgb, ${token('color.accent.default')} 14%, transparent);
  }

  :host([selected]) .base::before {
    transform: scaleY(1);
  }

  :host([selected]) .base:hover {
    background: color-mix(in srgb, ${token('color.accent.hover')} 22%, transparent);
  }

  :host([selected]) .base:hover::before {
    background: ${token('color.accent.hover')};
  }

  :host([selected]) .base:active {
    background: color-mix(in srgb, ${token('color.accent.active')} 28%, transparent);
  }

  .base:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
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
    gap: ${token('spacing.xs')};
    flex-shrink: 0;
  }

  .prefix:not(.has-content),
  .suffix:not(.has-content) {
    display: none;
  }

  .body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-weight: ${token('font.weight.medium')};
    color: inherit;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .description {
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.secondary')};
    line-height: ${token('font.lineHeight.normal')};
  }

  .description:not(.has-content) {
    display: none;
  }
`;
