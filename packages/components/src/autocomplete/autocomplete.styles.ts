import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-autocomplete>`:
 *
 * --k-autocomplete-height
 * --k-autocomplete-radius
 * --k-autocomplete-bg
 * --k-autocomplete-fg
 * --k-autocomplete-border-color
 * --k-autocomplete-border-color-focus
 */
export const autocompleteStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: 0px;
    --_border: var(--k-autocomplete-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: 220px;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: 6px;
  }

  :host([size='sm']) {
    --_height: ${token('control.height.sm')};
    --_padding-x: ${token('control.paddingX.sm')};
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_height: ${token('control.height.lg')};
    --_padding-x: ${token('control.paddingX.lg')};
    --_font-size: ${token('font.size.md')};
  }

  .hidden-slot {
    display: none;
  }

  .base {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    gap: ${token('spacing.xs')};
    min-height: var(--k-autocomplete-height, var(--_height));
    padding-inline: var(--_padding-x);
    border: 2px solid var(--_border);
    border-radius: var(--k-autocomplete-radius, var(--_radius));
    background: var(--k-autocomplete-bg, ${token('color.bg.layer')});
    color: var(--k-autocomplete-fg, ${token('color.fg.default')});
    cursor: text;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .base:hover:not(.disabled) {
    --_border: var(
      --k-autocomplete-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 68%, transparent)
    );
  }

  :host([open]) .base,
  .base:focus-within:not(.disabled) {
    --_border: var(--k-autocomplete-border-color-focus, ${token('color.accent.default')});
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

  .lead-icon {
    position: relative;
    z-index: 2;
    display: inline-flex;
    width: 14px;
    height: 14px;
    color: ${token('color.fg.tertiary')};
    flex-shrink: 0;
  }

  .lead-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .input {
    all: unset;
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    height: 100%;
    color: inherit;
    font-family: inherit;
    font-size: var(--_font-size);
    line-height: ${token('font.lineHeight.tight')};
  }

  .input::placeholder {
    color: ${token('color.fg.tertiary')};
    opacity: 1;
  }

  .action-btn {
    all: unset;
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    flex-shrink: 0;
  }

  .action-btn[hidden] {
    display: none;
  }

  .action-btn:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .action-btn svg,
  .spinner svg {
    width: 13px;
    height: 13px;
    display: block;
  }

  .spinner {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    color: ${token('color.accent.text')};
    flex-shrink: 0;
  }

  .spinner[hidden] {
    display: none;
  }

  .spinner svg {
    animation: k-ac-spin 0.85s linear infinite;
  }

  @keyframes k-ac-spin {
    to {
      transform: rotate(360deg);
    }
  }

  :host(:not([open])) .listbox:not(.closing) {
    display: none;
  }

  .listbox {
    position: fixed;
    inset: auto;
    margin: 0;
    box-sizing: border-box;
    z-index: ${token('zIndex.dropdown')};
    min-width: 180px;
    max-height: 260px;
    overflow: auto;
    padding: 4px 0;
    border-radius: 0px;
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layerAlt')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.4')};
    font-family: ${token('font.family.sans')};
  }

  .listbox.closing {
    pointer-events: none;
  }

  :host([acrylic]) .listbox {
    background: color-mix(in srgb, ${token('surface.acrylic.tint')} 82%, transparent);
    backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    -webkit-backdrop-filter: blur(${token('surface.acrylic.blur')})
      saturate(${token('surface.acrylic.saturation')});
    border-color: ${token('surface.acrylic.border')};
  }

  .option {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    padding: 7px ${token('control.paddingX.md')};
    padding-inline-start: 15px;
    font-size: ${token('font.size.sm')};
    line-height: ${token('font.lineHeight.tight')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    user-select: none;
    transition: background-color 80ms ${token('motion.easing.standard')};
  }

  .option::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3px;
    bottom: 3px;
    width: 3px;
    background: ${token('color.accent.default')};
    transform: scaleY(0);
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.decelerate')};
  }

  .option[data-active='true'] {
    background: color-mix(in srgb, ${token('color.accent.default')} 16%, transparent);
  }

  .option[data-active='true']::before {
    transform: scaleY(1);
  }

  .option[aria-selected='true'] {
    background: color-mix(in srgb, ${token('color.accent.default')} 32%, transparent);
    font-weight: ${token('font.weight.semibold')};
  }

  .option[aria-selected='true'][data-active='true'] {
    background: color-mix(in srgb, ${token('color.accent.hover')} 42%, transparent);
  }

  .option[aria-disabled='true'] {
    cursor: default;
    color: ${token('color.fg.disabled')};
    background: transparent;
  }

  .option[aria-disabled='true']::before {
    transform: scaleY(0);
  }

  .opt-desc {
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.regular')};
    color: ${token('color.fg.tertiary')};
  }

  .empty {
    padding: 12px ${token('control.paddingX.md')};
    text-align: center;
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
  }
`;
