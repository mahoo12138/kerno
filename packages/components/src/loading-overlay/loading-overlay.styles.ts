import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-loading-overlay>`:
 *
 * --k-loading-overlay-bg
 * --k-loading-overlay-blur
 * --k-loading-overlay-z-index
 * --k-loading-overlay-radius
 */
export const loadingOverlayStyles = css`
  :host {
    position: absolute;
    inset: 0;
    z-index: var(--k-loading-overlay-z-index, 20);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--k-loading-overlay-radius, inherit);
    background: var(
      --k-loading-overlay-bg,
      color-mix(in srgb, ${token('color.bg.canvas')} 72%, transparent)
    );
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    transition:
      opacity ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      visibility ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([visible]) {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
  }

  :host([acrylic]) {
    backdrop-filter: blur(var(--k-loading-overlay-blur, 6px)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--k-loading-overlay-blur, 6px)) saturate(140%);
  }

  @media (prefers-reduced-transparency: reduce) {
    :host([acrylic]) {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: ${token('color.bg.layer')};
    }
  }

  .inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 16px;
    text-align: center;
  }

  .spinner {
    width: 28px;
    height: 28px;
    color: ${token('color.accent.default')};
    animation: k-overlay-spin 0.8s linear infinite;
  }

  @keyframes k-overlay-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2.2s;
    }
  }

  .label {
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.medium')};
    color: ${token('color.fg.secondary')};
  }

  .label:empty {
    display: none;
  }
`;
