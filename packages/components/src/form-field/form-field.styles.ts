import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const formFieldStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .label {
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.medium')};
    color: ${token('color.fg.default')};
    cursor: pointer;
  }

  .label:empty {
    display: none;
  }

  .required-mark {
    color: ${token('color.status.danger.fg')};
    margin-inline-start: 2px;
  }

  .help {
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
  }

  .help:empty {
    display: none;
  }

  .error {
    font-size: ${token('font.size.xs')};
    color: ${token('color.status.danger.fg')};
  }

  .error:empty {
    display: none;
  }
`;
