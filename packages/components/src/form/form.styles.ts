import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-form>`:
 *
 * --k-form-gap
 * --k-form-columns
 */
export const formStyles = css`
  :host {
    display: block;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .base {
    display: flex;
    flex-direction: column;
    gap: var(--k-form-gap, ${token('spacing.lg')});
  }

  .summary {
    position: relative;
    padding: 12px 14px 12px 16px;
    border: 1px solid
      color-mix(
        in srgb,
        ${token('color.status.danger.solid')} 35%,
        ${token('color.stroke.default')}
      );
    background: ${token('color.status.danger.bg')};
    color: ${token('color.fg.default')};
  }

  .summary::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${token('color.status.danger.solid')};
  }

  .summary[hidden] {
    display: none;
  }

  .summary-title {
    margin: 0 0 6px;
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.status.danger.fg')};
  }

  .summary-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-btn {
    all: unset;
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .summary-btn:hover {
    color: ${token('color.status.danger.fg')};
  }

  .summary-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: var(--k-form-gap, ${token('spacing.md')});
  }

  :host([layout='horizontal']) .fields {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  :host([layout='grid']) .fields {
    display: grid;
    grid-template-columns: repeat(var(--k-form-columns, 2), minmax(0, 1fr));
    gap: var(--k-form-gap, ${token('spacing.md')});
    align-items: start;
  }

  @media (max-width: 640px) {
    :host([layout='grid']) .fields {
      grid-template-columns: 1fr;
    }
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token('spacing.sm')};
  }

  .actions:not(.has-content) {
    display: none;
  }

  :host([loading]) .fields {
    opacity: 0.72;
    pointer-events: none;
  }
`;
