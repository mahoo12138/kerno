import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-tags-input>`:
 *
 * --k-tags-input-radius
 * --k-tags-input-bg
 * --k-tags-input-border-color
 * --k-tags-input-border-color-focus
 */
export const tagsInputStyles = css`
  :host {
    --_min-height: ${token('control.height.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: var(--k-tags-input-radius, ${token('shape.radius.control')});
    --_border: var(--k-tags-input-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: min(240px, 100%);
    max-width: 100%;
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
    --_min-height: ${token('control.height.sm')};
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_min-height: ${token('control.height.lg')};
    --_font-size: ${token('font.size.md')};
  }

  .control {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    min-height: var(--_min-height);
    padding: 4px 8px;
    border: 2px solid var(--_border);
    border-radius: var(--_radius);
    background: var(--k-tags-input-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    cursor: text;
    transition:
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .control:hover:not(.disabled) {
    --_border: var(
      --k-tags-input-border-color,
      color-mix(in srgb, ${token('color.fg.default')} 72%, transparent)
    );
  }

  .control:focus-within:not(.disabled),
  :host([open]) .control:not(.disabled) {
    --_border: var(--k-tags-input-border-color-focus, ${token('color.accent.default')});
  }

  :host([data-user-invalid]) .control {
    --_border: ${token('color.status.danger.solid')};
  }

  .control.disabled {
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

  :host([shape='chamfer']) .control,
  :host([shape='scallop']) .control,
  :host([shape='notch']) .control {
    border-color: transparent;
  }

  .pills {
    position: relative;
    z-index: 2;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    padding: 2px 6px 2px 8px;
    background: color-mix(in srgb, ${token('color.accent.default')} 16%, transparent);
    border: 1px solid color-mix(in srgb, ${token('color.accent.default')} 38%, transparent);
    color: ${token('color.fg.default')};
    font-size: ${token('font.size.xs')};
    line-height: 1.4;
  }

  .tag-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag-remove {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    transition: color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .tag-remove:hover:not(:disabled) {
    color: ${token('color.fg.default')};
  }

  .tag-remove svg {
    width: 10px;
    height: 10px;
  }

  .input {
    all: unset;
    flex: 1 1 80px;
    min-width: 60px;
    font-size: var(--_font-size);
    line-height: 1.4;
    color: inherit;
  }

  .input::placeholder {
    color: ${token('color.fg.tertiary')};
  }

  .clear-btn {
    all: unset;
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: ${token('color.fg.tertiary')};
    cursor: pointer;
  }

  .clear-btn:hover {
    color: ${token('color.fg.default')};
  }

  .clear-btn[hidden] {
    display: none;
  }

  .clear-btn svg {
    width: 12px;
    height: 12px;
  }

  /* Top-Layer suggestions panel */
  .panel {
    position: fixed;
    margin: 0;
    padding: 4px;
    min-width: 200px;
    max-height: 220px;
    overflow: auto;
    border: 1px solid ${token('color.stroke.control')};
    border-radius: ${token('shape.radius.overlay')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.3')};
    z-index: ${token('zIndex.dropdown')};
    box-sizing: border-box;
  }

  .panel:not(:popover-open) {
    display: none;
  }

  .panel.closing {
    pointer-events: none;
  }

  :host([acrylic]) .panel {
    background: color-mix(in srgb, ${token('color.bg.layer')} 76%, transparent);
    backdrop-filter: blur(22px) saturate(165%);
    -webkit-backdrop-filter: blur(22px) saturate(165%);
  }

  @media (prefers-reduced-transparency: reduce) {
    :host([acrylic]) .panel {
      background: ${token('color.bg.layer')};
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  .suggestion {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 7px 10px;
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.default')};
    cursor: pointer;
    position: relative;
  }

  .suggestion:hover,
  .suggestion.active {
    background: ${token('color.subtle.hover')};
  }

  .suggestion.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    background: ${token('color.accent.default')};
  }

  .source-slot {
    display: none;
  }
`;
