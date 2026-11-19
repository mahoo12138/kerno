import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-slider>`:
 *
 * --k-slider-track-height
 * --k-slider-thumb-width
 * --k-slider-thumb-height
 * --k-slider-track-bg
 * --k-slider-fill-bg
 * --k-slider-thumb-bg
 *
 * Styled after authentic Windows 10 (MDL2 / Fluent 1) Slider:
 * - Crisp 2px horizontal track
 * - Vertical capsule thumb (8px × 24px pill) in Accent Blue
 */
export const sliderStyles = css`
  :host {
    --_percent: 50%;
    --_track-h: var(--k-slider-track-height, 2px);
    --_thumb-w: var(--k-slider-thumb-width, 8px);
    --_thumb-h: var(--k-slider-thumb-height, var(--k-slider-thumb-size, 24px));

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
    height: var(--_thumb-h);
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
    border-radius: 0px;
    background: linear-gradient(
      to right,
      var(--k-slider-fill-bg, ${token('color.accent.default')}) 0%,
      var(--k-slider-fill-bg, ${token('color.accent.default')}) var(--_percent),
      var(--k-slider-track-bg, ${token('color.stroke.strong')}) var(--_percent),
      var(--k-slider-track-bg, ${token('color.stroke.strong')}) 100%
    );
  }

  .range::-moz-range-track {
    height: var(--_track-h);
    border-radius: 0px;
    background: var(--k-slider-track-bg, ${token('color.stroke.strong')});
  }

  .range::-moz-range-progress {
    height: var(--_track-h);
    border-radius: 0px;
    background: var(--k-slider-fill-bg, ${token('color.accent.default')});
  }

  .range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    width: var(--_thumb-w);
    height: var(--_thumb-h);
    margin-top: calc((var(--_track-h) - var(--_thumb-h)) / 2);
    border-radius: ${token('radius.full')};
    border: none;
    background: var(--k-slider-thumb-bg, ${token('color.accent.default')});
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .range:hover:not(:disabled)::-webkit-slider-thumb {
    background: ${token('color.fg.default')};
  }

  .range:active:not(:disabled)::-webkit-slider-thumb {
    background: ${token('color.accent.active')};
  }

  .range:focus-visible::-webkit-slider-thumb {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  .range::-moz-range-thumb {
    box-sizing: border-box;
    width: var(--_thumb-w);
    height: var(--_thumb-h);
    border-radius: ${token('radius.full')};
    border: none;
    background: var(--k-slider-thumb-bg, ${token('color.accent.default')});
  }
`;
