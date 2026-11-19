import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const tableStyles = css`
  :host {
    display: block;
    width: 100%;
    overflow-x: auto;
  }

  .wrapper {
    border-radius: ${token('radius.lg')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: ${token('color.bg.layer')};
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.default')};
  }

  thead {
    background: ${token('color.bg.layerAlt')};
    border-bottom: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
  }

  th {
    padding: 10px ${token('spacing.md')};
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.fg.secondary')};
    text-align: start;
    white-space: nowrap;
    user-select: none;
  }

  th.sortable {
    cursor: pointer;
  }

  th.sortable:hover {
    color: ${token('color.fg.default')};
    background: ${token('color.subtle.hover')};
  }

  td {
    padding: 10px ${token('spacing.md')};
    border-bottom: ${token('control.borderWidth')} solid ${token('color.stroke.subtle')};
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: ${token('color.subtle.hover')};
  }

  :host([striped]) tbody tr:nth-child(even) {
    background: ${token('color.bg.layerAlt')};
  }

  .empty {
    padding: ${token('spacing.xl')};
    text-align: center;
    color: ${token('color.fg.tertiary')};
  }

  .sort-indicator {
    margin-inline-start: 4px;
    font-size: ${token('font.size.xs')};
    color: ${token('color.accent.text')};
  }
`;
