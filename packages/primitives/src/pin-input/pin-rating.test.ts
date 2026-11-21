import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../rating/define.js';
import type { KPinInput } from './index.js';
import type { KRating } from '../rating/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-pin-input>', () => {
  it('auto-advances, supports Backspace retreat, fires k-complete, and submits FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-pin-input name="otp" length="4" required></k-pin-input>
      </form>
    `;
    const form = document.querySelector('form')!;
    const pin = form.querySelector('k-pin-input') as KPinInput;
    await pin.updateComplete;

    expect(pin.checkValidity()).toBe(false);
    const cells = [...pin.shadowRoot!.querySelectorAll<HTMLInputElement>('.cell')];
    expect(cells).toHaveLength(4);

    const onComplete = vi.fn();
    pin.addEventListener('k-complete', (e) =>
      onComplete((e as CustomEvent<{ value: string }>).detail.value),
    );

    // Non-numeric input is rejected in default number mode
    cells[0]!.value = 'a';
    cells[0]!.dispatchEvent(new Event('input', { bubbles: true }));
    await pin.updateComplete;
    expect(pin.value).toBe('');

    for (const [i, digit] of ['4', '2', '8', '9'].entries()) {
      cells[i]!.value = digit;
      cells[i]!.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await pin.updateComplete;

    expect(pin.value).toBe('4289');
    expect(pin.checkValidity()).toBe(true);
    expect(onComplete).toHaveBeenCalledWith('4289');
    expect(new FormData(form).get('otp')).toBe('4289');

    // Backspace clears last filled cell
    cells[3]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await pin.updateComplete;
    expect(pin.value).toBe('428');

    // Reset restores initial empty value
    form.reset();
    await pin.updateComplete;
    expect(pin.value).toBe('');
  });

  it('distributes pasted values across cells and respects mask mode', async () => {
    document.body.innerHTML = `<k-pin-input length="6" type="alphanumeric" mask></k-pin-input>`;
    const pin = document.querySelector('k-pin-input') as KPinInput;
    await pin.updateComplete;

    const cells = [...pin.shadowRoot!.querySelectorAll<HTMLInputElement>('.cell')];
    expect(cells[0]!.type).toBe('password');

    const dt = new DataTransfer();
    dt.setData('text', 'A1-B2-C3');
    cells[0]!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    );
    await pin.updateComplete;

    expect(pin.value).toBe('A1B2C3');

    // SMS one-time-code autofill via multi-char input event into first cell
    cells[0]!.value = 'Z9Y8X7';
    cells[0]!.dispatchEvent(new Event('input', { bubbles: true }));
    await pin.updateComplete;
    expect(pin.value).toBe('Z9Y8X7');
  });
});

describe('<k-rating>', () => {
  it('supports fractional stars, keyboard stepping, clear toggle, and FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-rating name="score" count="5" fractions="2" value="3.5" required></k-rating>
      </form>
    `;
    const form = document.querySelector('form')!;
    const rating = form.querySelector('k-rating') as KRating;
    await rating.updateComplete;

    const track = rating.shadowRoot!.querySelector<HTMLDivElement>('.track')!;
    const stars = rating.shadowRoot!.querySelectorAll<HTMLSpanElement>('.star');
    expect(stars).toHaveLength(5);
    expect(track.getAttribute('aria-valuenow')).toBe('3.5');
    expect(new FormData(form).get('score')).toBe('3.5');

    const onChange = vi.fn();
    rating.addEventListener('k-rating-change', (e) =>
      onChange((e as CustomEvent<{ value: number }>).detail.value),
    );

    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await rating.updateComplete;
    expect(rating.value).toBe(4);
    expect(onChange).toHaveBeenCalledWith(4);

    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await rating.updateComplete;
    expect(rating.value).toBe(0);
    expect(rating.checkValidity()).toBe(false);

    form.reset();
    await rating.updateComplete;
    expect(rating.value).toBe(3.5);
  });

  it('supports highlight-selected-only and readonly/disabled guards', async () => {
    document.body.innerHTML = `<k-rating count="5" value="3" highlight-selected-only readonly></k-rating>`;
    const rating = document.querySelector('k-rating') as KRating;
    await rating.updateComplete;

    const fills = [...rating.shadowRoot!.querySelectorAll<SVGSVGElement>('.star-fill')];
    expect(fills[0]!.style.clipPath).toContain('100');
    expect(fills[2]!.style.clipPath).toContain('0');

    // Readonly ignores clicks and keyboard stepping
    rating.shadowRoot!.querySelector<HTMLSpanElement>('.star')!.click();
    rating
      .shadowRoot!.querySelector<HTMLDivElement>('.track')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await rating.updateComplete;
    expect(rating.value).toBe(3);
  });
});
