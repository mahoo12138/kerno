import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-checkbox>`:
 *
 * --k-checkbox-size
 * --k-checkbox-radius
 * --k-checkbox-bg
 * --k-checkbox-checked-bg
 * --k-checkbox-fg
 * --k-checkbox-border-color
 *
 * Styled after authentic Windows 10 (MDL2 / Fluent 1) CheckBox:
 * - 20×20 sharp square (`0px` radius by default; `4px` for chamfer/scallop/notch)
 * - Unchecked: transparent background, crisp 2px high-contrast border
 * - Checked/Indeterminate: solid Accent Blue fill, 2px high-contrast border frame on hover
 */
export const checkboxStyles = css`
  :host {
    --_size: 20px;
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;

    display: inline-flex;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: 4px;
  }

  :host([size='sm']) {
    --_size: 16px;
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_size: 24px;
    --_font-size: ${token('font.size.md')};
  }

  .base {
    display: inline-flex;
    align-items: center;
    gap: ${token('spacing.sm')};
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    line-height: ${token('font.lineHeight.tight')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    user-select: none;
  }

  .base.disabled {
    cursor: default;
    color: ${token('color.fg.disabled')};
  }

  .control {
    all: unset;
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--k-checkbox-size, var(--_size));
    height: var(--k-checkbox-size, var(--_size));
    border-radius: var(--k-checkbox-radius, var(--_radius));
    border: 2px solid var(--k-checkbox-border-color, ${token('color.fg.secondary')});
    background: var(--k-checkbox-bg, transparent);
    color: var(--k-checkbox-fg, ${token('color.accent.fg')});
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([shape='chamfer']) .control,
  :host([shape='scallop']) .control,
  :host([shape='notch']) .control {
    border-color: transparent;
  }

  .shape-stroke {
    position: absolute;
    inset: -2px;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--k-checkbox-border-color, ${token('color.fg.secondary')});
    stroke-width: 2px;
    transition: stroke ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([checked]) .shape-stroke,
  :host([indeterminate]) .shape-stroke {
    stroke: transparent;
  }

  .base:hover:not(.disabled) .control {
    border-color: var(--k-checkbox-border-color, ${token('color.fg.default')});
  }

  :host([shape='chamfer']) .base:hover:not(.disabled) .control,
  :host([shape='scallop']) .base:hover:not(.disabled) .control,
  :host([shape='notch']) .base:hover:not(.disabled) .control {
    border-color: transparent;
  }

  .base:hover:not(.disabled) .shape-stroke {
    stroke: var(--k-checkbox-border-color, ${token('color.fg.default')});
  }

  .base:active:not(.disabled) .control {
    background: ${token('color.control.active')};
    border-color: transparent;
  }

  .base:active:not(.disabled) .shape-stroke {
    stroke: transparent;
  }

  :host([checked]) .control,
  :host([indeterminate]) .control {
    background: var(--k-checkbox-checked-bg, ${token('color.accent.default')});
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .control,
  :host([indeterminate]) .base:hover:not(.disabled) .control {
    background: var(--k-checkbox-checked-bg, ${token('color.accent.default')});
    border-color: ${token('color.fg.default')};
  }

  :host([checked][shape='chamfer']) .base:hover:not(.disabled) .control,
  :host([checked][shape='scallop']) .base:hover:not(.disabled) .control,
  :host([checked][shape='notch']) .base:hover:not(.disabled) .control,
  :host([indeterminate][shape='chamfer']) .base:hover:not(.disabled) .control,
  :host([indeterminate][shape='scallop']) .base:hover:not(.disabled) .control,
  :host([indeterminate][shape='notch']) .base:hover:not(.disabled) .control {
    border-color: transparent;
  }

  :host([checked]) .base:hover:not(.disabled) .shape-stroke,
  :host([indeterminate]) .base:hover:not(.disabled) .shape-stroke {
    stroke: ${token('color.fg.default')};
  }

  :host([checked]) .base:active:not(.disabled) .control,
  :host([indeterminate]) .base:active:not(.disabled) .control {
    background: ${token('color.accent.active')};
    border-color: transparent;
  }

  :host([data-user-invalid]) .control {
    border-color: ${token('color.status.danger.solid')};
  }

  .control:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
    box-shadow: 0 0 0 1px ${token('color.stroke.focusInner')};
  }

  .control:disabled {
    background: transparent;
    border-color: ${token('color.fg.disabled')};
    color: ${token('color.fg.disabled')};
  }

  :host([checked]) .control:disabled,
  :host([indeterminate]) .control:disabled {
    background: ${token('color.accent.disabled')};
    color: ${token('color.accent.fgDisabled')};
    border-color: transparent;
  }

  .indicator {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80%;
    height: 80%;
    opacity: 0;
    transform: scale(0.75);
    transition:
      opacity ${token('motion.duration.fast')} ${token('motion.easing.decelerate')},
      transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  :host([checked]) .indicator,
  :host([indeterminate]) .indicator {
    opacity: 1;
    transform: scale(1);
  }

  .indicator svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .label:not(.has-content) {
    display: none;
  }
`;
