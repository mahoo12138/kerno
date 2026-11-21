import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-spoiler>`:
 *
 * --k-spoiler-fade-bg
 */
export const spoilerStyles = css`
  :host {
    display: block;
    width: 100%;
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.default')};
  }

  :host([hidden]) {
    display: none;
  }

  .clip {
    position: relative;
    overflow: hidden;
    transition: max-height ${token('motion.duration.normal')} ${token('motion.easing.standard')};
  }

  @media (prefers-reduced-motion: reduce) {
    .clip {
      transition: none;
    }
  }

  .fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 44px;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      transparent,
      var(--k-spoiler-fade-bg, ${token('color.bg.layer')})
    );
    opacity: 0;
    transition: opacity ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .clip.collapsed .fade {
    opacity: 1;
  }

  .toggle {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.accent.text')};
    cursor: pointer;
    transition: color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .toggle:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .toggle:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .toggle[hidden] {
    display: none;
  }
`;
