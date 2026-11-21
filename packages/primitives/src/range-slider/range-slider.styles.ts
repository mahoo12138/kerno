import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-range-slider>`:
 *
 * --k-range-slider-track-height
 * --k-range-slider-thumb-size
 */
export const rangeSliderStyles = css`
  :host {
    --_track-h: var(--k-range-slider-track-height, 4px);
    --_thumb: var(--k-range-slider-thumb-size, 18px);

    display: block;
    width: 100%;
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.default')};
  }

  :host([hidden]) {
    display: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    font-size: ${token('font.size.sm')};
  }

  .header:empty {
    display: none;
  }

  .label {
    font-weight: ${token('font.weight.medium')};
    color: ${token('color.fg.default')};
  }

  .value-readout {
    font-family: ${token('font.family.mono')};
    font-size: ${token('font.size.xs')};
    color: ${token('color.accent.text')};
    font-variant-numeric: tabular-nums;
  }

  .track-wrap {
    position: relative;
    display: flex;
    align-items: center;
    height: calc(var(--_thumb) + 8px);
    cursor: pointer;
    touch-action: none;
    user-select: none;
  }

  :host([disabled]) .track-wrap {
    cursor: default;
    opacity: 0.5;
  }

  .rail {
    position: relative;
    width: 100%;
    height: var(--_track-h);
    background: ${token('color.stroke.control')};
    border-radius: 9999px;
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    background: ${token('color.accent.default')};
    border-radius: 9999px;
    pointer-events: none;
    transition: background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .track-wrap:hover .fill {
    background: ${token('color.accent.hover')};
  }

  .thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    width: var(--_thumb);
    height: var(--_thumb);
    border-radius: 9999px;
    border: 2px solid ${token('color.accent.default')};
    background: ${token('color.bg.layer')};
    box-shadow: ${token('elevation.1')};
    cursor: grab;
    outline: none;
    z-index: 2;
    transition:
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      transform ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .thumb::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 9999px;
    background: ${token('color.accent.default')};
    transition:
      transform ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .thumb:hover:not([aria-disabled='true']) {
    border-color: ${token('color.accent.borderHover')};
  }

  .thumb:hover:not([aria-disabled='true'])::after {
    background: ${token('color.accent.hover')};
    transform: scale(1.12);
  }

  .thumb.dragging {
    cursor: grabbing;
    z-index: 3;
    border-color: ${token('color.accent.active')};
  }

  .thumb.dragging::after {
    background: ${token('color.accent.active')};
    transform: scale(0.86);
  }

  .thumb:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .thumb-tip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    padding: 2px 6px;
    background: ${token('color.bg.layerAlt')};
    border: 1px solid ${token('color.stroke.control')};
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.mono')};
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    box-shadow: ${token('elevation.2')};
    transition:
      opacity ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .thumb:hover .thumb-tip,
  .thumb:focus-visible .thumb-tip,
  .thumb.dragging .thumb-tip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .marks {
    position: relative;
    height: 18px;
    margin-top: 2px;
  }

  .marks:empty {
    display: none;
  }

  .mark {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    font-family: ${token('font.family.mono')};
    font-size: 10px;
    color: ${token('color.fg.tertiary')};
    white-space: nowrap;
    user-select: none;
  }
`;
