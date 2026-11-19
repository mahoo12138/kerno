import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Injected once into `document.head` while `<k-scrollbar>` is connected,
 * hiding the browser's native page scrollbar except in forced-colors and print.
 */
export const DOCUMENT_HIDE_CSS = `
@media not all and (forced-colors: active) {
  html { scrollbar-width: none; }
  html::-webkit-scrollbar { display: none; width: 0; height: 0; }
}
`;

const SHARED_SCROLLBAR_CSS = /* css */ `
  :host {
    --k-scrollbar-thickness: 12px;
    --k-scrollbar-padding: 0px;
    --k-scrollbar-thumb-min-length: 28px;
    --k-scrollbar-button-length: 15px;
    --k-scrollbar-line: 40px;
    --k-scrollbar-hotzone: 4px;
    --k-scrollbar-idle-delay: 2500ms;
    --k-scrollbar-touch-idle-delay: 500ms;
    --k-scrollbar-scroll-smoothing: 50ms;
    --k-scrollbar-thumb-smoothing: 100ms;
    --k-scrollbar-repeat-delay: 250ms;
    --k-scrollbar-repeat-interval: 50ms;
    --k-scrollbar-marker-spacing: 6px;
    --k-scrollbar-marker-reach: 12px;
    --k-scrollbar-card-gap: 10px;
    --k-scrollbar-card-delay: 320ms;
    --k-scrollbar-fade-in: 120ms;
    --k-scrollbar-fade-out: 167ms;
    --k-scrollbar-z-index: 2147483000;

    --_sb-track-bg: color-mix(in srgb, ${token('color.bg.layer')} 76%, transparent);
    --_sb-track-border: ${token('color.stroke.subtle')};
    --_sb-thumb-bg: color-mix(in srgb, ${token('color.fg.default')} 36%, transparent);
    --_sb-thumb-hover-bg: color-mix(in srgb, ${token('color.fg.default')} 56%, transparent);
    --_sb-thumb-pressed-bg: color-mix(in srgb, ${token('color.fg.default')} 74%, transparent);
    --_sb-thumb-border: transparent;
    --_sb-btn-bg: transparent;
    --_sb-btn-hover-bg: color-mix(in srgb, ${token('color.fg.default')} 8%, transparent);
    --_sb-btn-pressed-bg: color-mix(in srgb, ${token('color.fg.default')} 14%, transparent);
    --_sb-glyph: color-mix(in srgb, ${token('color.fg.default')} 55%, transparent);
    --_sb-glyph-hover: ${token('color.fg.default')};
    --_sb-glyph-pressed: ${token('color.fg.default')};
    --_sb-marker-bg: color-mix(in srgb, ${token('color.fg.default')} 34%, transparent);
    --_sb-marker-current-bg: ${token('color.accent.default')};
    --_sb-marker-hover-bg: ${token('color.fg.default')};
    --_sb-marker-on-thumb-bg: ${token('color.bg.layer')};
    --_sb-radius: 999px;
    --_sb-thumb-rest-size: 3px;
    --_sb-thumb-engaged-size: 6px;
    --_sb-card-radius: ${token('radius.md')};
  }

  :host([hidden]) {
    display: none;
  }

  /* Classic Windows 8 / 10 Modern UI variant */
  :host([variant='classic']) {
    --k-scrollbar-thickness: 17px;
    --k-scrollbar-thumb-min-length: 48px;
    --k-scrollbar-button-length: calc(var(--k-scrollbar-thickness) * 33 / 17);
    --k-scrollbar-idle-delay: 3000ms;
    --k-scrollbar-fade-in: 250ms;
    --k-scrollbar-fade-out: 167ms;
    --_sb-radius: 0px;
    --_sb-thumb-rest-size: calc(var(--k-scrollbar-thickness) - 2 * var(--k-scrollbar-padding));
    --_sb-thumb-engaged-size: calc(var(--k-scrollbar-thickness) - 2 * var(--k-scrollbar-padding));
    --_sb-track-bg: color-mix(in srgb, ${token('color.fg.default')} 9%, transparent);
    --_sb-thumb-bg: color-mix(in srgb, ${token('color.fg.default')} 26%, transparent);
    --_sb-thumb-hover-bg: color-mix(in srgb, ${token('color.fg.default')} 40%, transparent);
    --_sb-thumb-pressed-bg: color-mix(in srgb, ${token('color.fg.default')} 62%, transparent);
    --_sb-thumb-border: color-mix(in srgb, ${token('color.fg.default')} 16%, transparent);
    --_sb-btn-bg: color-mix(in srgb, ${token('color.fg.default')} 9%, transparent);
    --_sb-btn-hover-bg: color-mix(in srgb, ${token('color.fg.default')} 20%, transparent);
    --_sb-btn-pressed-bg: color-mix(in srgb, ${token('color.fg.default')} 60%, transparent);
    --_sb-glyph-pressed: ${token('color.bg.layer')};
    --_sb-card-radius: 0px;
  }

  /* Minimal floating pill variant */
  :host([variant='minimal']) {
    --k-scrollbar-thickness: 10px;
    --k-scrollbar-thumb-min-length: 32px;
    --k-scrollbar-idle-delay: 1600ms;
    --_sb-thumb-rest-size: 3px;
    --_sb-thumb-engaged-size: 6px;
    --_sb-track-bg: transparent;
    --_sb-track-border: transparent;
  }

  :host([last-indicator='touch']) {
    --k-scrollbar-thumb-min-length: 17px;
  }

  .frame {
    position: absolute;
    inset: 0;
  }

  .bar {
    position: absolute;
    display: flex;
    box-sizing: border-box;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    opacity: 0;
    transition: opacity var(--k-scrollbar-fade-out) linear;
  }

  .bar[data-shown='true'] {
    opacity: 1;
    transition-duration: var(--k-scrollbar-fade-in);
  }

  .bar.v {
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--k-scrollbar-thickness);
    padding: var(--k-scrollbar-padding);
    flex-direction: column;
  }

  .bar.h {
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--k-scrollbar-thickness);
    padding: var(--k-scrollbar-padding);
    flex-direction: row;
  }

  .frame.rtl .bar.v {
    right: auto;
    left: 0;
  }

  /* Track shell (underneath buttons + area in fluent, inside area in classic) */
  .track-bg {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border-radius: var(--_sb-radius);
    background: var(--_sb-track-bg);
    border: 1px solid var(--_sb-track-border);
    opacity: 0;
    transition:
      opacity 120ms ease,
      background-color 120ms ease;
  }

  :host([variant='fluent']) .track-bg,
  :host(:not([variant])) .track-bg {
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
  }

  .bar[data-engaged='true'] .track-bg,
  :host([variant='classic']) .bar[data-shown='true'] .track-bg {
    opacity: 1;
  }

  :host([last-indicator='touch']) .track-bg,
  :host([variant='minimal']) .track-bg {
    opacity: 0 !important;
  }

  /* Arrow buttons */
  .button {
    position: relative;
    z-index: 1;
    flex: none;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    background: var(--_sb-btn-bg);
    color: var(--_sb-glyph);
    border-radius: var(--_sb-radius);
    opacity: 0;
    transition:
      opacity 120ms ease,
      background-color 100ms ease,
      color 100ms ease;
  }

  .bar.v > .button {
    width: 100%;
    height: var(--k-scrollbar-button-length);
  }

  .bar.h > .button {
    height: 100%;
    width: var(--k-scrollbar-button-length);
  }

  .bar[data-engaged='true'] .button,
  :host([variant='classic']) .bar[data-shown='true'] .button {
    opacity: 1;
  }

  .button[hover] {
    background: var(--_sb-btn-hover-bg);
    color: var(--_sb-glyph-hover);
  }

  .button[pressed] {
    background: var(--_sb-btn-pressed-bg);
    color: var(--_sb-glyph-pressed);
  }

  .button svg {
    width: 10px;
    height: 10px;
    fill: currentColor;
    transition: transform 80ms ease;
  }

  :host([variant='classic']) .button svg {
    width: 11px;
    height: 11px;
  }

  .button[pressed] svg {
    transform: scale(0.875);
  }

  /* Track area */
  .area {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    contain: layout;
  }

  .track,
  .thumb,
  .markers {
    position: absolute;
    box-sizing: border-box;
  }

  .track,
  .markers {
    inset: 0;
  }

  /* Thumb */
  .thumb {
    border-radius: var(--_sb-radius);
    background: var(--_sb-thumb-bg);
    border: 1px solid var(--_sb-thumb-border);
    will-change: transform;
    transition:
      width 167ms cubic-bezier(0.1, 0.9, 0.2, 1),
      height 167ms cubic-bezier(0.1, 0.9, 0.2, 1),
      left 167ms cubic-bezier(0.1, 0.9, 0.2, 1),
      top 167ms cubic-bezier(0.1, 0.9, 0.2, 1),
      background-color 100ms ease,
      border-color 100ms ease;
  }

  .bar.v .thumb {
    top: 0;
    width: var(--_sb-thumb-rest-size);
    left: calc((100% - var(--_sb-thumb-rest-size)) / 2);
    min-height: var(--k-scrollbar-thumb-min-length);
  }

  .bar.v[data-engaged='true'] .thumb {
    width: var(--_sb-thumb-engaged-size);
    left: calc((100% - var(--_sb-thumb-engaged-size)) / 2);
  }

  .bar.h .thumb {
    left: 0;
    height: var(--_sb-thumb-rest-size);
    top: calc((100% - var(--_sb-thumb-rest-size)) / 2);
    min-width: var(--k-scrollbar-thumb-min-length);
  }

  .bar.h[data-engaged='true'] .thumb {
    height: var(--_sb-thumb-engaged-size);
    top: calc((100% - var(--_sb-thumb-engaged-size)) / 2);
  }

  /* Classic keeps constant thumb thickness with crisp zero-lag state */
  :host([variant='classic']) .thumb {
    transition:
      background-color 80ms ease,
      border-color 80ms ease;
  }

  /* Touch indicator: slim 4px panning pill */
  :host([last-indicator='touch']) .bar.v .thumb {
    width: 4px;
    left: calc((100% - 4px) / 2);
  }

  :host([last-indicator='touch']) .bar.h .thumb {
    height: 4px;
    top: calc((100% - 4px) / 2);
  }

  .thumb[hover] {
    background: var(--_sb-thumb-hover-bg);
  }

  .thumb[pressed] {
    background: var(--_sb-thumb-pressed-bg);
  }

  /* Markers */
  .slot {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bar.v .slot {
    left: 0;
    right: 0;
    top: 0;
    height: 0;
  }

  .bar.h .slot {
    top: 0;
    bottom: 0;
    left: 0;
    width: 0;
    flex-direction: column;
  }

  .marker {
    flex: none;
    box-sizing: border-box;
    border-radius: 1px;
    background: var(--_sb-marker-bg);
    transition:
      width 120ms ease,
      height 120ms ease,
      background-color 100ms ease;
  }

  .bar.v .marker {
    width: 6px;
    height: 2px;
  }

  .bar.v .marker[current] {
    width: 9px;
    background: var(--_sb-marker-current-bg);
  }

  .bar.v .marker[hover] {
    width: calc(var(--k-scrollbar-thickness) - 2px);
    height: 3px;
    background: var(--_sb-marker-hover-bg);
  }

  .bar.h .marker {
    height: 6px;
    width: 2px;
  }

  .bar.h .marker[current] {
    height: 9px;
    background: var(--_sb-marker-current-bg);
  }

  .bar.h .marker[hover] {
    height: calc(var(--k-scrollbar-thickness) - 2px);
    width: 3px;
    background: var(--_sb-marker-hover-bg);
  }

  .marker[on-thumb] {
    background: var(--_sb-marker-on-thumb-bg);
  }

  /* Corner where both vertical and horizontal bars meet */
  .corner {
    position: absolute;
    bottom: 0;
    right: 0;
    box-sizing: border-box;
    background: var(--_sb-track-bg);
    opacity: 0;
    transition: opacity 140ms linear;
  }

  .corner[data-shown='true'] {
    opacity: 1;
  }

  .frame.rtl .corner {
    right: auto;
    left: 0;
  }

  /* Top-layer marker hover card */
  .card {
    position: fixed;
    left: 0;
    top: 0;
    margin: 0;
    inset: auto;
    width: max-content;
    max-width: 280px;
    height: auto;
    box-sizing: border-box;
    padding: 6px 10px;
    border-radius: var(--_sb-card-radius);
    background: ${token('color.bg.layer')};
    border: 1px solid ${token('color.stroke.control')};
    box-shadow: ${token('elevation.3')};
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.xs')};
    line-height: 1.4;
    opacity: 0;
    transform: translateY(0);
    transition:
      opacity var(--k-scrollbar-fade-in) linear,
      transform 367ms cubic-bezier(0.1, 0.9, 0.2, 1);
  }

  .card:not(.open) {
    display: none;
  }

  .card[data-state='enter'][data-dir='forward'] {
    transform: translateY(-10px);
  }

  .card[data-state='enter'][data-dir='backward'] {
    transform: translateY(10px);
  }

  .card[data-axis='horizontal'][data-state='enter'][data-dir='forward'] {
    transform: translateX(-10px);
  }

  .card[data-axis='horizontal'][data-state='enter'][data-dir='backward'] {
    transform: translateX(10px);
  }

  .card[data-state='open'] {
    opacity: 1;
    transform: none;
  }

  .card[data-state='exit'] {
    opacity: 0;
    transition-duration: var(--k-scrollbar-fade-out);
  }

  .card-content {
    display: grid;
    gap: 3px;
  }

  .card-line {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-wrap: balance;
  }

  /* Geometry-driven input: overlay elements never capture wheel or clicks directly */
  .frame,
  .frame *,
  .cards,
  .cards * {
    pointer-events: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar,
    .thumb,
    .button,
    .track-bg,
    .marker,
    .card {
      transition: none !important;
      transform: none;
    }
  }

  @media (forced-colors: active) {
    .frame,
    .cards {
      display: none !important;
    }
  }

  @media print {
    .frame,
    .cards {
      display: none !important;
    }
  }
`;

export const scrollViewStyles = css`
  :host {
    display: block;
    position: relative;
    overflow: hidden;
  }

  .viewport {
    position: absolute;
    inset: 0;
    overflow: auto;
    outline: none;
  }

  .viewport:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
  }

  @media not all and (forced-colors: active) {
    .viewport {
      scrollbar-width: none;
    }
    .viewport::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
  }

  .content {
    min-width: 100%;
    min-height: 100%;
    box-sizing: border-box;
  }

  ${SHARED_SCROLLBAR_CSS}
`;

export const pageScrollbarStyles = css`
  :host {
    position: fixed;
    inset: 0;
    overflow: visible;
    pointer-events: none;
    z-index: var(--k-scrollbar-z-index, 2147483000);
  }

  .frame {
    inset: 0;
  }

  ${SHARED_SCROLLBAR_CSS}
`;
