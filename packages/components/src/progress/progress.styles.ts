import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const progressStyles = css`
  :host {
    --_height: 6px;
    --_fill: ${token('color.accent.default')};

    display: block;
    width: 100%;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_height: 3px;
  }

  :host([size='lg']) {
    --_height: 10px;
  }

  :host([variant='success']) {
    --_fill: ${token('color.status.success.solid')};
  }

  :host([variant='warning']) {
    --_fill: ${token('color.status.warning.solid')};
  }

  :host([variant='danger']) {
    --_fill: ${token('color.status.danger.solid')};
  }

  .track {
    position: relative;
    width: 100%;
    height: var(--k-progress-height, var(--_height));
    border-radius: ${token('radius.full')};
    background: var(--k-progress-track-bg, ${token('color.stroke.control')});
    overflow: hidden;
  }

  .bar {
    height: 100%;
    width: 0%;
    border-radius: ${token('radius.full')};
    background: var(--k-progress-fill-bg, var(--_fill));
    transition: width ${token('motion.duration.normal')} ${token('motion.easing.decelerate')};
  }

  :host([indeterminate]) .bar {
    width: 40% !important;
    animation: k-progress-indeterminate 1.2s ${token('motion.easing.standard')} infinite;
  }

  @keyframes k-progress-indeterminate {
    0% {
      transform: translateX(-110%);
    }
    100% {
      transform: translateX(260%);
    }
  }
`;
