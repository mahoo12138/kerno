import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const cardStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }

  .surface {
    --k-surface-padding: 0px;
    width: 100%;
    height: 100%;
  }

  :host([interactive]) .surface {
    cursor: pointer;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token('spacing.sm')};
    padding: ${token('spacing.lg')};
    padding-bottom: ${token('spacing.sm')};
    font-weight: ${token('font.weight.semibold')};
    font-size: ${token('font.size.md')};
  }

  .header:not(.has-content) {
    display: none;
  }

  .body {
    padding: ${token('spacing.lg')};
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.normal')};
    color: ${token('color.fg.secondary')};
  }

  .header.has-content + .body {
    padding-top: ${token('spacing.xs')};
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${token('spacing.sm')};
    padding: ${token('spacing.md')} ${token('spacing.lg')};
    border-top: ${token('control.borderWidth')} solid ${token('color.stroke.subtle')};
  }

  .footer:not(.has-content) {
    display: none;
  }
`;
