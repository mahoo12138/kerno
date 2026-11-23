import { afterEach, describe, expect, it, vi } from 'vitest';
import '@kerno/primitives/input/define';
import './tags-input/define.js';
import './form/define.js';
import type { KForm } from './form/index.js';
import type { KTagsInput } from './tags-input/index.js';

const enter = (isComposing: boolean): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: 'Enter', isComposing, bubbles: true, composed: true });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('IME composition', () => {
  it('<k-tags-input> ignores the Enter that confirms an IME candidate', async () => {
    document.body.innerHTML = '<k-tags-input></k-tags-input>';
    const tags = document.querySelector('k-tags-input') as KTagsInput;
    await tags.updateComplete;
    const input = tags.shadowRoot!.querySelector<HTMLInputElement>('.input')!;

    input.value = 'zhong';
    input.dispatchEvent(enter(true));
    await tags.updateComplete;
    expect(tags.values).toEqual([]);

    input.value = '中文';
    input.dispatchEvent(enter(false));
    await tags.updateComplete;
    expect(tags.values).toEqual(['中文']);
  });

  it('<k-tags-input> splits committed text on compositionend, not mid-composition', async () => {
    document.body.innerHTML = '<k-tags-input></k-tags-input>';
    const tags = document.querySelector('k-tags-input') as KTagsInput;
    await tags.updateComplete;
    const input = tags.shadowRoot!.querySelector<HTMLInputElement>('.input')!;

    input.value = 'a,';
    input.dispatchEvent(new InputEvent('input', { isComposing: true }));
    await tags.updateComplete;
    expect(tags.values).toEqual([]);

    input.dispatchEvent(new CompositionEvent('compositionend', { data: ',' }));
    await tags.updateComplete;
    expect(tags.values).toEqual(['a']);
    expect(input.value).toBe('');
  });

  it('<k-form> does not submit on the Enter that confirms an IME candidate', async () => {
    document.body.innerHTML = '<k-form><k-input name="q"></k-input></k-form>';
    const form = document.querySelector('k-form') as KForm;
    const input = form.querySelector('k-input')!;
    await Promise.all([form.updateComplete, input.updateComplete]);

    const onSubmit = vi.fn();
    form.addEventListener('k-submit', onSubmit);

    input.dispatchEvent(enter(true));
    expect(onSubmit).not.toHaveBeenCalled();

    input.dispatchEvent(enter(false));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
