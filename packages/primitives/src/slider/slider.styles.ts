import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-slider>`:
 *
 * --k-slider-track-height
 * --k-slider-thumb-size
 * --k-slider-track-bg
 * --k-slider-fill-bg
 * --k-slider-thumb-bg
 */
export const sliderStyles = css`
  :host {
    --_percent: 50%;
    --_track-h: var(--k-slider-track-height, 4px);
    --_thumb: var(--k-slider-thumb-size, 18px);

    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    font-family: ${token('font.family.sans')};
    user-select: none;
  }

  :host([hidden]) {
    display: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    font-size: ${token('font.size.xs')};
    line-height: ${token('font.lineHeight.tight')};
  }

  .header:not(.visible) {
    display: none;
  }

  .label {
    color: ${token('color.fg.secondary')};
    font-weight: ${token('font.weight.medium')};
  }

  .value {
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.mono')};
    font-variant-numeric: tabular-nums;
  }

  .range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: var(--_thumb);
    margin: 0;
    background: transparent;
    cursor: pointer;
  }

  .range:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .range:focus-visible {
    outline: none;
  }

  .range::-webkit-slider-runnable-track {
    height: var(--_track-h);
    border-radius: ${token('radius.full')};
    background: linear-gradient(
      to right,
      var(--k-slider-fill-bg, ${token('color.accent.default')}) 0%,
      var(--k-slider-fill-bg, ${token('color.accent.default')}) var(--_percent),
      var(--k-slider-track-bg, ${token('color.stroke.control')}) var(--_percent),
      var(--k-slider-track-bg, ${token('color.stroke.control')}) 100%
    );
  }

  .range::-moz-range-track {
    height: var(--_track-h);
    border-radius: ${token('radius.full')};
    background: var(--k-slider-track-bg, ${token('color.stroke.control')});
  }

  .range::-moz-range-progress {
    height: var(--_track-h);
    border-radius: ${token('radius.full')};
    background: var(--k-slider-fill-bg, ${token('color.accent.default')});
  }

  .range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    width: var(--_thumb);
    height: var(--_thumb);
    margin-top: calc((var(--_track-h) - var(--_thumb)) / 2);
    border-radius: ${token('radius.full')};
    border: 4px solid ${token('color.bg.layer')};
    background: var(--k-slider-thumb-bg, ${token('color.accent.default')});
    box-shadow:
      0 0 0 1px ${token('color.stroke.control')},
      ${token('elevation.1')};
    transition:
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      border-width ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  .range:hover:not(:disabled)::-webkit-slider-thumb {
    border-width: 3px;
    transform: scale(1.06);
  }

  .range:active:not(:disabled)::-webkit-slider-thumb {
    border-width: 5px;
    transform: scale(0.96);
  }

  .range:focus-visible::-webkit-slider-thumb {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .range::-moz-range-thumb {
    box-sizing: border-box;
    width: var(--_thumb);
    height: var(--_thumb);
    border-radius: ${token('radius.full')};
    border: 4px solid ${token('color.bg.layer')};
    background: var(--k-slider-thumb-bg, ${token('color.accent.default')});
    box-shadow:
      0 0 0 1px ${token('color.stroke.control')},
      ${token('elevation.1')};
  }
`;
