import { afterEach, describe, expect, it, vi } from 'vitest';
import '@kerno/primitives/input/define';
import '@kerno/primitives/number-input/define';
import './define.js';
import type { KForm } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-form> implicit submission', () => {
  it('submits exactly once when Enter is pressed inside a <k-input>', async () => {
    document.body.innerHTML = '<k-form><k-input name="q" value="kerno"></k-input></k-form>';
    const form = document.querySelector('k-form') as KForm;
    const input = form.querySelector('k-input')!;
    await Promise.all([form.updateComplete, input.updateComplete]);

    const onSubmit = vi.fn();
    form.addEventListener('k-submit', onSubmit);
    const enter = { key: 'Enter', bubbles: true, composed: true, cancelable: true };
    input.shadowRoot!.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', enter));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('commits and submits when Enter is pressed inside a <k-number-input>', async () => {
    document.body.innerHTML = '<k-form><k-number-input name="count"></k-number-input></k-form>';
    const form = document.querySelector('k-form') as KForm;
    const num = form.querySelector('k-number-input')!;
    await Promise.all([form.updateComplete, num.updateComplete]);

    let submitted: Record<string, unknown> | null = null;
    form.addEventListener('k-submit', (e) => {
      submitted = (e as CustomEvent<{ values: Record<string, unknown> }>).detail.values;
    });
    const inner = num.shadowRoot!.querySelector<HTMLInputElement>('input')!;
    inner.value = '12';
    inner.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    expect(submitted).toEqual({ count: 12 });
  });
});
