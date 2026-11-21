import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../hover-card/define.js';
import '../loading-overlay/define.js';
import '../spoiler/define.js';
import '../copy-button/define.js';
import { formatColor, parseColor, type KColorInput, type KColorPicker } from './index.js';
import type { KHoverCard } from '../hover-card/index.js';
import type { KLoadingOverlay } from '../loading-overlay/index.js';
import type { KSpoiler } from '../spoiler/index.js';
import type { KCopyButton } from '../copy-button/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-color-picker> & <k-color-input>', () => {
  it('parses and formats HEX, RGB, RGBA, and HSL color strings cleanly', () => {
    const parsed = parseColor('#0d9488');
    expect(parsed).not.toBeNull();
    expect(formatColor(parsed!, 'hex')).toBe('#0d9488');
    expect(formatColor(parsed!, 'rgb')).toBe('rgb(13, 148, 136)');

    const rgba = parseColor('rgba(13, 148, 136, 0.5)');
    expect(rgba).not.toBeNull();
    expect(rgba!.a).toBe(0.5);
    expect(formatColor(rgba!, 'rgba')).toBe('rgba(13, 148, 136, 0.5)');
  });

  it('selects swatches, validates color input, and submits FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-color-picker value="#0d9488"></k-color-picker>
        <k-color-input name="accent" value="#0d9488" clearable required></k-color-input>
      </form>
    `;
    const form = document.querySelector('form')!;
    const picker = form.querySelector('k-color-picker') as KColorPicker;
    const input = form.querySelector('k-color-input') as KColorInput;
    picker.swatches = ['#0d9488', '#3b82f6', '#f59e0b'];
    await Promise.all([picker.updateComplete, input.updateComplete]);

    expect(new FormData(form).get('accent')).toBe('#0d9488');

    const swatchBtns = picker.shadowRoot!.querySelectorAll<HTMLButtonElement>('.swatch');
    expect(swatchBtns).toHaveLength(3);
    swatchBtns[1]!.click();
    await picker.updateComplete;
    expect(picker.value).toBe('#3b82f6');

    // Typing an invalid value triggers patternMismatch
    const textInput = input.shadowRoot!.querySelector<HTMLInputElement>('.input')!;
    textInput.value = 'not-a-color';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    await input.updateComplete;
    expect(input.checkValidity()).toBe(false);

    textInput.value = '#f59e0b';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    await input.updateComplete;
    expect(input.checkValidity()).toBe(true);
    expect(new FormData(form).get('accent')).toBe('#f59e0b');

    // Switching format reformats value synchronously on update
    input.format = 'rgba';
    await input.updateComplete;
    expect(input.value).toBe('rgba(245, 158, 11, 1)');
  });
});

describe('<k-hover-card>, <k-loading-overlay>, <k-spoiler>, and <k-copy-button>', () => {
  it('opens <k-hover-card> on trigger hover and stays open when moving into card', async () => {
    document.body.innerHTML = `
      <k-hover-card open-delay="0" close-delay="30">
        <button slot="trigger">Hover me</button>
        <div>Rich Preview Card</div>
      </k-hover-card>
    `;
    const hc = document.querySelector('k-hover-card') as KHoverCard;
    await hc.updateComplete;

    const trigger = hc.shadowRoot!.querySelector<HTMLSpanElement>('.trigger')!;
    const card = hc.shadowRoot!.querySelector<HTMLDivElement>('.card')!;

    trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await hc.updateComplete;
    expect(hc.open).toBe(true);

    // Moving from trigger into card cancels close timer
    trigger.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    expect(hc.open).toBe(true);
  });

  it('toggles <k-loading-overlay>, <k-spoiler>, and <k-copy-button>', async () => {
    document.body.innerHTML = `
      <div style="position:relative;height:80px">
        <k-loading-overlay visible label="Loading data..."></k-loading-overlay>
      </div>
      <k-spoiler max-height="40">
        <div style="height:140px">Long collapsible specification text</div>
      </k-spoiler>
      <k-copy-button value="pnpm add @kerno/components" timeout="300"></k-copy-button>
    `;
    const overlay = document.querySelector('k-loading-overlay') as KLoadingOverlay;
    const spoiler = document.querySelector('k-spoiler') as KSpoiler;
    const copyBtn = document.querySelector('k-copy-button') as KCopyButton;
    await Promise.all([overlay.updateComplete, spoiler.updateComplete, copyBtn.updateComplete]);

    expect(overlay.getAttribute('aria-hidden')).toBe('false');
    overlay.visible = false;
    await overlay.updateComplete;
    expect(overlay.getAttribute('aria-hidden')).toBe('true');

    const toggle = spoiler.shadowRoot!.querySelector<HTMLButtonElement>('.toggle')!;
    expect(toggle.hidden).toBe(false);
    toggle.click();
    await spoiler.updateComplete;
    expect(spoiler.expanded).toBe(true);

    const onCopy = vi.fn();
    copyBtn.addEventListener('k-copy', (e) =>
      onCopy((e as CustomEvent<{ value: string }>).detail.value),
    );
    await copyBtn.copy();
    await copyBtn.updateComplete;
    expect(copyBtn.copied).toBe(true);
    expect(onCopy).toHaveBeenCalledWith('pnpm add @kerno/components');

    // Auto-resets copied state after timeout
    await new Promise((r) => setTimeout(r, 340));
    await copyBtn.updateComplete;
    expect(copyBtn.copied).toBe(false);

    // Short spoiler hides toggle button automatically
    const shortSpoiler = document.createElement('k-spoiler') as KSpoiler;
    shortSpoiler.maxHeight = 200;
    shortSpoiler.innerHTML = '<div style="height:24px">Short</div>';
    document.body.append(shortSpoiler);
    await shortSpoiler.updateComplete;
    expect(shortSpoiler.shadowRoot!.querySelector<HTMLButtonElement>('.toggle')!.hidden).toBe(true);
  });
});
