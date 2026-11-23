import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const accordionStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    border: 1px solid ${token('color.stroke.default')};
    border-radius: var(--k-accordion-radius, ${token('shape.radius.control')});
    background: ${token('color.bg.layer')};
    overflow: hidden;
  }

  :host([hidden]) {
    display: none;
  }

  ::slotted(k-accordion-item:not(:last-child)) {
    border-bottom: 1px solid ${token('color.stroke.default')};
  }
`;

/**
 * Public customization surface for `<k-accordion-item>`:
 *
 * --k-accordion-header-padding
 * --k-accordion-body-padding
 */
export const accordionItemStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .header {
    margin: 0;
  }

  .trigger {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.md')};
    min-height: 44px;
    padding: var(--k-accordion-header-padding, 10px 16px);
    color: ${token('color.fg.default')};
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.medium')};
    line-height: ${token('font.lineHeight.tight')};
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .trigger::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    background: ${token('color.accent.default')};
    transform: scaleY(0);
    transition:
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .trigger:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
  }

  .trigger:active:not(:disabled) {
    background: ${token('color.subtle.active')};
  }

  :host([open]) .trigger {
    font-weight: ${token('font.weight.semibold')};
    background: color-mix(in srgb, ${token('color.accent.default')} 8%, transparent);
  }

  :host([open]) .trigger::before {
    transform: scaleY(1);
  }

  :host([open]) .trigger:hover:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.hover')} 14%, transparent);
  }

  :host([open]) .trigger:hover:not(:disabled)::before {
    background: ${token('color.accent.hover')};
  }

  :host([open]) .trigger:active:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.active')} 20%, transparent);
  }

  :host([open]) .trigger:active:not(:disabled)::before {
    background: ${token('color.accent.active')};
  }

  .trigger:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
  }

  .trigger:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
  }

  .heading-text {
    flex: 1 1 auto;
    min-width: 0;
    text-align: start;
  }

  .chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: ${token('color.fg.secondary')};
    transition:
      transform ${token('motion.duration.normal')} ${token('motion.easing.decelerate')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([open]) .chevron {
    transform: rotate(180deg);
    color: ${token('color.accent.text')};
  }

  .trigger:disabled .chevron {
    color: ${token('color.fg.disabled')};
  }

  .chevron svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .panel-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows ${token('motion.duration.normal')}
      ${token('motion.easing.decelerate')};
  }

  :host([open]) .panel-wrap {
    grid-template-rows: 1fr;
  }

  .panel {
    overflow: hidden;
  }

  .body {
    padding: var(--k-accordion-body-padding, 4px 16px 14px);
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.normal')};
    color: ${token('color.fg.secondary')};
  }
`;
