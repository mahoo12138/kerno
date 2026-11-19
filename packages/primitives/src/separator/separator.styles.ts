import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const separatorStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 1px;
    background: var(--k-separator-color, ${token('color.stroke.default')});
    flex-shrink: 0;
  }

  :host([orientation='vertical']) {
    display: inline-block;
    width: 1px;
    height: auto;
    min-height: 1em;
    align-self: stretch;
  }

  :host([hidden]) {
    display: none;
  }
`;
