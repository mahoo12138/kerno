import { userEvent } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadShapeOutline } from '@kerno/effects/shape/lazy';
import './define.js';
import '../number-input/define.js';
import type { KTextarea } from './index.js';
import type { KNumberInput } from '../number-input/index.js';

// Shape outlines load on demand; preload so `shape` changes apply synchronously.
beforeAll(() => loadShapeOutline());

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-textarea>', () => {
  it('participates in FormData, tracks live character count, validates required, and resets', async () => {
    document.body.innerHTML = `
      <form>
        <k-textarea name="bio" value="Hi" maxlength="5" show-count required shape="chamfer"></k-textarea>
      </form>
    `;
    const form = document.querySelector('form')!;
    const ta = form.querySelector('k-textarea') as KTextarea;
    await ta.updateComplete;

    expect(new FormData(form).get('bio')).toBe('Hi');
    expect(ta.shadowRoot!.querySelector('.count')!.textContent).toBe('2 / 5');
    expect(ta.shadowRoot!.querySelector<HTMLElement>('.base')!.style.clipPath).toContain('path(');

    const native = ta.shadowRoot!.querySelector('textarea')!;
    native.value = 'Hello';
    native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await ta.updateComplete;

    expect(ta.shadowRoot!.querySelector('.count')!.textContent).toBe('5 / 5');
    expect(ta.shadowRoot!.querySelector('.count')!.classList.contains('limit')).toBe(true);
    expect(new FormData(form).get('bio')).toBe('Hello');

    form.reset();
    await ta.updateComplete;
    expect(ta.value).toBe('Hi');
    expect(new FormData(form).get('bio')).toBe('Hi');
  });
});

describe('<k-number-input>', () => {
  it('handles precision-safe stepping, min/max clamping, keyboard shortcuts, and FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-number-input name="opacity" value="0.1" min="0" max="1" step="0.2" precision="1"></k-number-input>
      </form>
    `;
    const form = document.querySelector('form')!;
    const num = form.querySelector('k-number-input') as KNumberInput;
    await num.updateComplete;

    expect(new FormData(form).get('opacity')).toBe('0.1');

    num.stepUp();
    await num.updateComplete;
    expect(num.value).toBe(0.3);
    expect(num.shadowRoot!.querySelector('input')!.value).toBe('0.3');

    num.focus();
    await userEvent.keyboard('{End}');
    await num.updateComplete;
    expect(num.value).toBe(1);
    expect(num.shadowRoot!.querySelector<HTMLButtonElement>('.inc-btn')!.disabled).toBe(true);

    await userEvent.keyboard('{Home}');
    await num.updateComplete;
    expect(num.value).toBe(0);
    expect(num.shadowRoot!.querySelector<HTMLButtonElement>('.dec-btn')!.disabled).toBe(true);

    form.reset();
    await num.updateComplete;
    expect(num.value).toBe(0.1);
  });
});
