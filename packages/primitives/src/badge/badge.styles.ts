import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const badgeStyles = css`
  :host {
    --_bg: ${token('color.control.default')};
    --_fg: ${token('color.fg.default')};
    --_border: ${token('color.stroke.control')};

    display: inline-flex;
    vertical-align: middle;
  }

  :host([hidden]) {
    display: none;
  }

  :host([variant='accent']) {
    --_bg: ${token('color.accent.default')};
    --_fg: ${token('color.accent.fg')};
    --_border: transparent;
  }

  :host([variant='success']) {
    --_bg: ${token('color.status.success.bg')};
    --_fg: ${token('color.status.success.fg')};
    --_border: transparent;
  }

  :host([variant='warning']) {
    --_bg: ${token('color.status.warning.bg')};
    --_fg: ${token('color.status.warning.fg')};
    --_border: transparent;
  }

  :host([variant='danger']) {
    --_bg: ${token('color.status.danger.bg')};
    --_fg: ${token('color.status.danger.fg')};
    --_border: transparent;
  }

  .base {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--k-badge-radius, ${token('radius.md')});
    border: ${token('control.borderWidth')} solid var(--_border);
    background: var(--k-badge-bg, var(--_bg));
    color: var(--k-badge-fg, var(--_fg));
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.medium')};
    line-height: ${token('font.lineHeight.tight')};
    white-space: nowrap;
  }

  :host([pill]) .base {
    border-radius: ${token('radius.full')};
  }
`;
