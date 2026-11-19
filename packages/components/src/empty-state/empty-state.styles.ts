import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const emptyStateStyles = css`
  :host {
    display: block;
  }

  .base {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: ${token('spacing.sm')};
    padding: ${token('spacing.2xl')} ${token('spacing.lg')};
    border-radius: ${token('radius.lg')};
    border: 1px dashed ${token('color.stroke.control')};
    background: ${token('color.bg.layerAlt')};
    font-family: ${token('font.family.sans')};
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: ${token('radius.full')};
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.secondary')};
  }

  .icon svg {
    width: 18px;
    height: 18px;
  }

  .title {
    margin: 0;
    font-size: ${token('font.size.md')};
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.fg.default')};
  }

  .description {
    margin: 0;
    max-width: 380px;
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.secondary')};
  }

  .description:empty {
    display: none;
  }

  .actions {
    margin-top: ${token('spacing.xs')};
    display: flex;
    gap: ${token('spacing.sm')};
  }

  .actions:not(.has-content) {
    display: none;
  }
`;
