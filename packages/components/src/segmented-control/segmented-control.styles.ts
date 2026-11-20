import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-segmented-control>`:
 *
 * --k-segmented-bg
 * --k-segmented-border-color
 * --k-segmented-radius
 * --k-segmented-indicator-bg
 * --k-segmented-indicator-fg
 * --k-segmented-padding
 */
export const segmentedControlStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: 14px;
    --_font-size: ${token('font.size.sm')};
    --_radius: var(--k-segmented-radius, 0px);
    --_pad: var(--k-segmented-padding, 3px);

    display: inline-flex;
    vertical-align: middle;
    max-width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([full-width]) {
    display: flex;
    width: 100%;
  }

  :host([size='sm']) {
    --_height: ${token('control.height.sm')};
    --_padding-x: 10px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_height: ${token('control.height.lg')};
    --_padding-x: 18px;
    --_font-size: ${token('font.size.md')};
  }

  .track {
    position: relative;
    display: inline-grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    align-items: stretch;
    padding: var(--_pad);
    background: var(--k-segmented-bg, ${token('color.bg.layerAlt')});
    border: 1px solid var(--k-segmented-border-color, ${token('color.stroke.default')});
    border-radius: var(--_radius);
    user-select: none;
  }

  :host([full-width]) .track {
    display: grid;
    width: 100%;
  }

  :host([orientation='vertical']) .track {
    grid-auto-flow: row;
    grid-auto-columns: unset;
    grid-auto-rows: minmax(0, 1fr);
  }

  .indicator {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    border-radius: max(0px, calc(var(--_radius) - 1px));
    background: var(--k-segmented-indicator-bg, ${token('color.accent.default')});
    pointer-events: none;
    opacity: 0;
    will-change: transform, width, height;
  }

  :host([variant='surface']) .indicator {
    background: var(--k-segmented-indicator-bg, ${token('color.bg.layer')});
    box-shadow: ${token('elevation.1')};
    border: 1px solid ${token('color.stroke.control')};
    box-sizing: border-box;
  }

  .indicator.visible {
    opacity: 1;
  }

  .indicator.animated {
    transition:
      transform 180ms cubic-bezier(0.2, 0, 0, 1),
      width 180ms cubic-bezier(0.2, 0, 0, 1),
      height 180ms cubic-bezier(0.2, 0, 0, 1),
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  @media (prefers-reduced-motion: reduce) {
    .indicator.animated {
      transition: none;
    }
  }

  .segment {
    all: unset;
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: calc(var(--_height) - var(--_pad) * 2 - 2px);
    padding-inline: var(--_padding-x);
    padding-block: 4px;
    color: ${token('color.fg.secondary')};
    font-size: var(--_font-size);
    font-weight: ${token('font.weight.medium')};
    white-space: nowrap;
    cursor: pointer;
    transition: color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .segment:hover:not(:disabled):not([aria-checked='true']) {
    color: ${token('color.fg.default')};
  }

  .segment[aria-checked='true'] {
    color: var(--k-segmented-indicator-fg, ${token('color.accent.fg')});
    font-weight: ${token('font.weight.semibold')};
  }

  :host([variant='surface']) .segment[aria-checked='true'] {
    color: var(--k-segmented-indicator-fg, ${token('color.fg.default')});
  }

  .segment:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
  }

  .segment:disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  :host([disabled]) .indicator {
    background: ${token('color.accent.disabled')};
  }

  :host([disabled]) .segment[aria-checked='true'] {
    color: ${token('color.accent.fgDisabled')};
  }

  .source-slot {
    display: none;
  }
`;
