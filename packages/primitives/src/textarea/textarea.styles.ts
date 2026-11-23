import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-textarea>`:
 *
 * --k-textarea-padding
 * --k-textarea-radius
 * --k-textarea-font-size
 * --k-textarea-bg
 * --k-textarea-fg
 * --k-textarea-placeholder-color
 * --k-textarea-border-color
 * --k-textarea-border-color-focus
 */
export const textareaStyles = css`
  :host {
    --_font-size: ${token('font.size.sm')};
    --_padding: 8px ${token('control.paddingX.md')};
    --_radius: ${token('shape.radius.control')};
    --_border: var(--k-textarea-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    vertical-align: middle;
    min-width: 220px;
    width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: ${token('shape.radius.parametric')};
  }

  :host([size='sm']) {
    --_font-size: ${token('font.size.xs')};
    --_padding: 6px ${token('control.paddingX.sm')};
  }

  :host([size='lg']) {
    --_font-size: ${token('font.size.md')};
    --_padding: 10px ${token('control.paddingX.lg')};
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: flex;
    width: 100%;
    border: 2px solid var(--_border);
    border-radius: var(--k-textarea-radius, var(--_radius));
    background: var(--k-textarea-bg, ${token('color.bg.layer')});
    color: var(--k-textarea-fg, ${token('color.fg.default')});
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) {
    --_border: var(
      --k-textarea-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 68%, transparent)
    );
  }

  .base:focus-within:not(.disabled) {
    --_border: var(--k-textarea-border-color-focus, ${token('color.accent.default')});
  }

  :host([data-user-invalid]) .base {
    --_border: ${token('color.status.danger.solid')};
  }

  .base.disabled {
    cursor: default;
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
    --_border: ${token('color.stroke.default')};
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--_border);
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([shape='chamfer']) .base,
  :host([shape='scallop']) .base,
  :host([shape='notch']) .base {
    border-color: transparent;
  }

  .textarea {
    all: unset;
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    display: block;
    width: 100%;
    min-height: 60px;
    padding: var(--k-textarea-padding, var(--_padding));
    color: inherit;
    font-family: inherit;
    font-size: var(--k-textarea-font-size, var(--_font-size));
    line-height: ${token('font.lineHeight.normal')};
    white-space: pre-wrap;
    overflow-wrap: break-word;
    resize: vertical;
  }

  :host([resize='none']) .textarea,
  :host([auto-resize]) .textarea {
    resize: none;
  }

  :host([resize='both']) .textarea {
    resize: both;
  }

  :host([resize='horizontal']) .textarea {
    resize: horizontal;
  }

  .textarea::placeholder {
    color: var(--k-textarea-placeholder-color, ${token('color.fg.tertiary')});
    opacity: 1;
  }

  .textarea:disabled {
    cursor: default;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    font-size: ${token('font.size.xs')};
    font-family: ${token('font.family.mono')};
    font-variant-numeric: tabular-nums;
    color: ${token('color.fg.tertiary')};
  }

  .footer[hidden] {
    display: none;
  }

  .count.limit {
    color: ${token('color.status.danger.fg')};
  }
`;
