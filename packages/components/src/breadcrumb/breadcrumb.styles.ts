import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const breadcrumbStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ::slotted([data-k-bc-collapsed]) {
    display: none !important;
  }
`;

export const breadcrumbItemStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.tight')};
  }

  :host([hidden]) {
    display: none;
  }

  .link,
  .current,
  .ellipsis {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 28px;
    padding: 2px 6px;
    border-radius: ${token('shape.radius.control')};
    white-space: nowrap;
  }

  .link {
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .link:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.accent.text')};
  }

  .link:active {
    background: ${token('color.subtle.active')};
  }

  .link:focus-visible,
  .ellipsis:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 1px;
  }

  .current {
    color: ${token('color.fg.default')};
    font-weight: ${token('font.weight.semibold')};
  }

  .link[hidden],
  .current[hidden],
  .ellipsis[hidden],
  .sep[hidden] {
    display: none;
  }

  .ellipsis {
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .ellipsis:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .ellipsis svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .sep {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 14px;
    color: ${token('color.fg.tertiary')};
    user-select: none;
  }

  .sep svg {
    width: 12px;
    height: 12px;
    display: block;
  }
`;
