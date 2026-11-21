import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-ring-progress>`:
 *
 * --k-ring-root-color
 */
export const ringProgressStyles = css`
  :host {
    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.default')};
  }

  :host([hidden]) {
    display: none;
  }

  svg {
    display: block;
    overflow: visible;
  }

  .track {
    fill: none;
    stroke: var(--k-ring-root-color, ${token('color.control.default')});
  }

  .segment {
    fill: none;
    cursor: pointer;
    transition:
      stroke-dasharray ${token('motion.duration.normal')} ${token('motion.easing.standard')},
      stroke-dashoffset ${token('motion.duration.normal')} ${token('motion.easing.standard')},
      opacity ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      filter ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .segment:hover {
    filter: brightness(1.14);
  }

  .label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16%;
    pointer-events: none;
    line-height: 1.2;
  }
`;
