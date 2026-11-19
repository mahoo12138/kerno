import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KSlider } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-slider>', () => {
  it('syncs value, percent fill, readout, FormData and form reset', async () => {
    document.body.innerHTML = `
      <form>
        <k-slider name="blur" label="Blur" unit="px" min="0" max="60" value="24" show-value></k-slider>
      </form>
    `;
    const form = document.querySelector('form')!;
    const slider = form.querySelector('k-slider') as KSlider;
    await slider.updateComplete;

    expect(slider.value).toBe(24);
    expect(slider.shadowRoot!.querySelector('[part="value"]')!.textContent).toBe('24px');
    expect(new FormData(form).get('blur')).toBe('24');

    const onInput = vi.fn();
    slider.addEventListener('input', onInput);

    const nativeRange = slider.shadowRoot!.querySelector('input')!;
    nativeRange.value = '48';
    nativeRange.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await slider.updateComplete;

    expect(slider.value).toBe(48);
    expect(slider.shadowRoot!.querySelector('[part="value"]')!.textContent).toBe('48px');
    expect(new FormData(form).get('blur')).toBe('48');
    expect(onInput).toHaveBeenCalledOnce();

    form.reset();
    await slider.updateComplete;
    expect(slider.value).toBe(24);
    expect(new FormData(form).get('blur')).toBe('24');
  });
});
