import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KRangeSlider } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-range-slider>', () => {
  it('enforces min-range, steps thumbs via keyboard, and submits FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-range-slider
          name="latency"
          min="0"
          max="100"
          step="5"
          min-range="10"
          value="25,40"
          show-value
          unit="ms"
        ></k-range-slider>
      </form>
    `;
    const form = document.querySelector('form')!;
    const rs = form.querySelector('k-range-slider') as KRangeSlider;
    await rs.updateComplete;

    expect(rs.values).toEqual([25, 40]);
    expect(new FormData(form).get('latency')).toBe('25,40');

    const startThumb = rs.shadowRoot!.querySelector<HTMLDivElement>('.thumb-start')!;
    const endThumb = rs.shadowRoot!.querySelector<HTMLDivElement>('.thumb-end')!;

    const onChange = vi.fn();
    rs.addEventListener('k-range-change', (e) =>
      onChange((e as CustomEvent<{ values: [number, number] }>).detail.values),
    );

    // Advance start thumb twice (25 -> 30, then blocked at 30 because end=40 & min-range=10)
    startThumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    startThumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await rs.updateComplete;
    expect(rs.values).toEqual([30, 40]);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Advance end thumb (40 -> 45)
    endThumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await rs.updateComplete;
    expect(rs.values).toEqual([30, 45]);
    expect(new FormData(form).get('latency')).toBe('30,45');

    form.reset();
    await rs.updateComplete;
    expect(rs.values).toEqual([25, 40]);
  });
});
