import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const skeletonStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 1rem;
  }

  :host([hidden]) {
    display: none;
  }

  :host([variant='circular']) {
    width: 40px;
    height: 40px;
  }

  .base {
    width: 100%;
    height: 100%;
    border-radius: ${token('radius.md')};
    background: ${token('color.stroke.default')};
  }

  :host([variant='circular']) .base {
    border-radius: ${token('radius.full')};
  }

  :host([effect='pulse']) .base {
    animation: k-skeleton-pulse ${token('motion.loop.pulse')} ${token('motion.easing.standard')}
      infinite;
  }

  @keyframes k-skeleton-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.45;
    }
  }
`;
