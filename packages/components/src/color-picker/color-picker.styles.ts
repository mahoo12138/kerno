import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

const CHECKERBOARD = `conic-gradient(
  rgba(128, 128, 128, 0.25) 90deg,
  transparent 90deg 180deg,
  rgba(128, 128, 128, 0.25) 180deg 270deg,
  transparent 270deg
)`;

export const colorPickerStyles = css`
  :host {
    display: inline-flex;
    flex-direction: column;
    gap: 10px;
    width: var(--k-color-picker-width, 240px);
    max-width: 100%;
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.default')};
    user-select: none;
  }

  :host([full-width]) {
    display: flex;
    width: 100%;
  }

  :host([hidden]) {
    display: none;
  }

  :host([disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }

  .saturation {
    position: relative;
    width: 100%;
    height: var(--k-color-picker-saturation-height, 148px);
    cursor: crosshair;
    touch-action: none;
    overflow: hidden;
    border: 1px solid ${token('color.stroke.control')};
    box-sizing: border-box;
    outline: none;
  }

  .saturation:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .sat-white,
  .sat-black {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .sat-white {
    background: linear-gradient(to right, #ffffff, transparent);
  }

  .sat-black {
    background: linear-gradient(to top, #000000, transparent);
  }

  .sat-thumb {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: ${token('radius.full')};
    border: 2px solid #ffffff;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.55),
      inset 0 0 0 1px rgba(0, 0, 0, 0.35);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .sliders {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bars {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bar {
    position: relative;
    height: 12px;
    cursor: pointer;
    touch-action: none;
    border: 1px solid ${token('color.stroke.control')};
    box-sizing: border-box;
    outline: none;
  }

  .bar:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .hue-bar {
    background: linear-gradient(
      to right,
      #ff0000 0%,
      #ffff00 17%,
      #00ff00 33%,
      #00ffff 50%,
      #0000ff 67%,
      #ff00ff 83%,
      #ff0000 100%
    );
  }

  .alpha-bar {
    background-image: ${CHECKERBOARD};
    background-size: 8px 8px;
  }

  .alpha-bar[hidden] {
    display: none;
  }

  .alpha-gradient {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bar-thumb {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 16px;
    background: #ffffff;
    border: 2px solid ${token('color.bg.canvas')};
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-sizing: border-box;
  }

  .preview-swatch {
    position: relative;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: 1px solid ${token('color.stroke.control')};
    background-image: ${CHECKERBOARD};
    background-size: 8px 8px;
    overflow: hidden;
  }

  .preview-fill {
    position: absolute;
    inset: 0;
  }

  .swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(22px, 1fr));
    gap: 6px;
  }

  .swatches:empty {
    display: none;
  }

  .swatch {
    all: unset;
    position: relative;
    box-sizing: border-box;
    height: 22px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    cursor: pointer;
    background-image: ${CHECKERBOARD};
    background-size: 8px 8px;
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .swatch:hover {
    transform: scale(1.1);
    z-index: 2;
  }

  .swatch:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .swatch[aria-pressed='true'] {
    box-shadow:
      0 0 0 1px ${token('color.bg.layer')},
      0 0 0 3px ${token('color.accent.default')};
  }

  .swatch-fill {
    position: absolute;
    inset: 0;
  }
`;

export const colorInputStyles = css`
  :host {
    --_height: ${token('control.height.md')};
    --_padding-x: ${token('control.paddingX.md')};
    --_font-size: ${token('font.size.sm')};
    --_radius: var(--k-color-input-radius, ${token('shape.radius.control')});
    --_border: var(--k-color-input-border-color, ${token('color.stroke.strong')});

    display: inline-flex;
    vertical-align: middle;
    min-width: min(210px, 100%);
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
    --_height: ${token('control.height.sm')};
    --_padding-x: ${token('control.paddingX.sm')};
    --_font-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_height: ${token('control.height.lg')};
    --_padding-x: ${token('control.paddingX.lg')};
    --_font-size: ${token('font.size.md')};
  }

  .control {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    align-items: center;
    gap: 8px;
    min-height: var(--_height);
    padding-inline: 8px;
    border: 2px solid var(--_border);
    border-radius: var(--_radius);
    background: var(--k-color-input-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    transition: border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .control:hover:not(.disabled) {
    --_border: color-mix(in srgb, ${token('color.fg.default')} 72%, transparent);
  }

  .control:focus-within:not(.disabled),
  :host([open]) .control:not(.disabled) {
    --_border: ${token('color.accent.default')};
  }

  :host([data-user-invalid]) .control {
    --_border: ${token('color.status.danger.solid')};
  }

  .control.disabled {
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
  }

  :host([shape='chamfer']) .control,
  :host([shape='scallop']) .control,
  :host([shape='notch']) .control {
    border-color: transparent;
  }

  .swatch-btn {
    all: unset;
    position: relative;
    z-index: 2;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border: 1px solid ${token('color.stroke.control')};
    background-image: ${CHECKERBOARD};
    background-size: 8px 8px;
    cursor: pointer;
    overflow: hidden;
  }

  .swatch-btn-fill {
    position: absolute;
    inset: 0;
  }

  .input {
    all: unset;
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-width: 0;
    font-family: ${token('font.family.mono')};
    font-size: var(--_font-size);
    color: inherit;
  }

  .input::placeholder {
    color: ${token('color.fg.tertiary')};
    font-family: ${token('font.family.sans')};
  }

  .icon-btn {
    all: unset;
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
  }

  .icon-btn:hover {
    color: ${token('color.fg.default')};
  }

  .icon-btn[hidden] {
    display: none;
  }

  .icon-btn svg {
    width: 14px;
    height: 14px;
  }

  .panel {
    position: fixed;
    margin: 0;
    padding: 12px;
    border: 1px solid ${token('color.stroke.control')};
    border-radius: ${token('shape.radius.overlay')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    box-shadow: ${token('elevation.3')};
    z-index: ${token('zIndex.dropdown')};
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
`;
