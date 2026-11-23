import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-chip>`:
 *
 * --k-chip-radius
 */
export const chipStyles = css`
  :host {
    --_height: 30px;
    --_pad-x: 12px;
    --_font-size: ${token('font.size.xs')};
    --_radius: var(--k-chip-radius, ${token('shape.radius.control')});

    display: inline-flex;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([pill]) {
    --_radius: ${token('radius.full')};
  }

  :host([size='sm']) {
    --_height: 24px;
    --_pad-x: 9px;
    --_font-size: ${token('font.size.2xs')};
  }

  :host([size='lg']) {
    --_height: 36px;
    --_pad-x: 16px;
    --_font-size: ${token('font.size.sm')};
  }

  .chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--_height);
    padding-inline: var(--_pad-x);
    border: 2px solid ${token('color.stroke.control')};
    border-radius: var(--_radius);
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    font-size: var(--_font-size);
    font-weight: ${token('font.weight.medium')};
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .chip:hover:not(:disabled) {
    background: ${token('color.control.hover')};
    border-color: color-mix(in srgb, ${token('color.fg.default')} 55%, transparent);
  }

  .chip:active:not(:disabled) {
    background: ${token('color.control.active')};
  }

  .chip:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  /* Outline variant (default) checked */
  :host([checked]) .chip {
    border-color: ${token('color.accent.default')};
    background: color-mix(in srgb, ${token('color.accent.default')} 14%, transparent);
    color: ${token('color.accent.text')};
  }

  :host([checked]) .chip:hover:not(:disabled) {
    border-color: ${token('color.accent.borderHover')};
    background: color-mix(in srgb, ${token('color.accent.hover')} 20%, transparent);
  }

  /* Filled variant checked — full Fluent 1 chromatic Accent ramp */
  :host([variant='filled'][checked]) .chip {
    background: ${token('color.accent.default')};
    border-color: ${token('color.accent.default')};
    color: ${token('color.accent.fg')};
  }

  :host([variant='filled'][checked]) .chip:hover:not(:disabled) {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  :host([variant='filled'][checked]) .chip:active:not(:disabled) {
    background: ${token('color.accent.active')};
    border-color: ${token('color.accent.active')};
  }

  /* Light variant */
  :host([variant='light']) .chip {
    border-color: transparent;
    background: ${token('color.control.default')};
  }

  :host([variant='light'][checked]) .chip {
    border-color: transparent;
    background: color-mix(in srgb, ${token('color.accent.default')} 20%, transparent);
    color: ${token('color.accent.text')};
  }

  :host([variant='light'][checked]) .chip:hover:not(:disabled) {
    background: color-mix(in srgb, ${token('color.accent.hover')} 28%, transparent);
  }

  /* Disabled */
  .chip:disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    border-color: ${token('color.stroke.default')};
    color: ${token('color.fg.disabled')};
  }

  :host([variant='filled'][checked]) .chip:disabled {
    background: ${token('color.accent.disabled')};
    border-color: transparent;
    color: ${token('color.accent.fgDisabled')};
  }

  .check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0;
    height: 12px;
    margin-inline-end: -6px;
    opacity: 0;
    overflow: hidden;
    transform: scale(0.6);
    transition:
      width ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      margin ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      opacity ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([checked]) .check {
    width: 12px;
    margin-inline-end: 0;
    opacity: 1;
    transform: scale(1);
  }

  .check svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

export const chipGroupStyles = css`
  :host {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('spacing.sm')};
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }
`;
