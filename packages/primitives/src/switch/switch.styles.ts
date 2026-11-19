import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-switch>`:
 *
 * --k-switch-width
 * --k-switch-height
 * --k-switch-thumb-size
 * --k-switch-track-bg
 * --k-switch-track-checked-bg
 * --k-switch-thumb-bg
 *
 * Styled after authentic Windows 10 (MDL2 / Fluent 1) ToggleSwitch:
 * - Unchecked: transparent track, crisp 2px high-contrast border, matching solid thumb
 * - Checked: solid Accent Blue track, transparent border, pure white thumb
 */
export const switchStyles = css`
  :host {
    --_width: 44px;
    --_height: 20px;
    --_thumb: 10px;
    --_radius: ${token('radius.full')};
    --_font-size: ${token('font.size.sm')};

    display: inline-flex;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: 5px;
  }

  :host([size='sm']) {
    --_width: 36px;
    --_height: 16px;
    --_thumb: 8px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_width: 52px;
    --_height: 24px;
    --_thumb: 14px;
    --_font-size: ${token('font.size.md')};
  }

  .base {
    display: inline-flex;
    align-items: center;
    gap: ${token('spacing.sm')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    line-height: ${token('font.lineHeight.tight')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    user-select: none;
  }

  .base.disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .track {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    width: var(--k-switch-width, var(--_width));
    height: var(--k-switch-height, var(--_height));
    padding: 3px;
    border-radius: var(--_radius);
    border: 2px solid ${token('color.fg.secondary')};
    background: var(--k-switch-track-bg, transparent);
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([shape='chamfer']) .track,
  :host([shape='scallop']) .track,
  :host([shape='notch']) .track {
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
    stroke: ${token('color.fg.secondary')};
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([checked]) .shape-stroke {
    stroke: transparent;
  }

  .base:hover:not(.disabled) .track {
    border-color: ${token('color.fg.default')};
  }

  :host([shape='chamfer']) .base:hover:not(.disabled) .track,
  :host([shape='scallop']) .base:hover:not(.disabled) .track,
  :host([shape='notch']) .base:hover:not(.disabled) .track {
    border-color: transparent;
  }

  .base:hover:not(.disabled) .shape-stroke {
    stroke: ${token('color.fg.default')};
  }

  .base:active:not(.disabled) .track {
    background: ${token('color.control.active')};
    border-color: transparent;
  }

  .base:active:not(.disabled) .shape-stroke {
    stroke: transparent;
  }

  :host([checked]) .track {
    background: var(--k-switch-track-checked-bg, ${token('color.accent.default')});
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .track {
    background: ${token('color.accent.hover')};
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .shape-stroke {
    stroke: transparent;
  }

  :host([checked]) .base:active:not(.disabled) .track {
    background: ${token('color.accent.active')};
  }

  :host([data-user-invalid]) .track {
    border-color: ${token('color.status.danger.solid')};
  }

  .track:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
    box-shadow: 0 0 0 1px ${token('color.stroke.focusInner')};
  }

  .track:disabled {
    background: transparent;
    border-color: ${token('color.fg.disabled')};
  }

  :host([checked]) .track:disabled {
    background: ${token('color.accent.disabled')};
    border-color: transparent;
  }

  .thumb {
    position: relative;
    z-index: 2;
    width: var(--k-switch-thumb-size, var(--_thumb));
    height: var(--k-switch-thumb-size, var(--_thumb));
    border-radius: var(--_radius);
    background: var(--k-switch-thumb-bg, ${token('color.fg.secondary')});
    transform: translateX(0);
    transition:
      transform 160ms cubic-bezier(0.1, 0.9, 0.2, 1),
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) .thumb {
    background: var(--k-switch-thumb-bg, ${token('color.fg.default')});
  }

  :host([checked]) .thumb,
  :host([checked]) .base:hover:not(.disabled) .thumb {
    background: var(--k-switch-thumb-bg, ${token('color.accent.fg')});
    transform: translateX(
      calc(var(--k-switch-width, var(--_width)) - var(--k-switch-thumb-size, var(--_thumb)) - 10px)
    );
  }

  .track:disabled .thumb {
    background: ${token('color.fg.disabled')};
  }

  :host([checked]) .track:disabled .thumb {
    background: ${token('color.accent.fgDisabled')};
  }

  .label:not(.has-content) {
    display: none;
  }
`;
