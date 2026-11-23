import { userEvent } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadShapeOutline } from '@kerno/effects/shape/lazy';
import './define.js';
import type { KInput } from './index.js';

const mount = async <T extends HTMLElement = KInput>(html: string): Promise<T> => {
  document.body.innerHTML = html;
  const inputs = [...document.querySelectorAll('k-input')];
  await Promise.all(inputs.map((i) => i.updateComplete));
  return document.body.firstElementChild as T;
};

// Shape outlines load on demand; preload so `shape` changes apply synchronously.
beforeAll(() => loadShapeOutline());

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-input>', () => {
  it('participates in FormData and resets to initial value', async () => {
    const form = await mount<HTMLFormElement>(`
      <form>
        <k-input name="username" value="alice"></k-input>
      </form>
    `);
    const input = form.querySelector('k-input')!;
    expect(new FormData(form).get('username')).toBe('alice');

    input.value = 'bob';
    await input.updateComplete;
    expect(new FormData(form).get('username')).toBe('bob');

    form.reset();
    await input.updateComplete;
    expect(input.value).toBe('alice');
    expect(new FormData(form).get('username')).toBe('alice');
  });

  it('enforces required, minlength and pattern validation via ElementInternals', async () => {
    const el = await mount(
      '<k-input name="code" required minlength="4" pattern="[A-Z]+"></k-input>',
    );
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);

    el.value = 'AB';
    await el.updateComplete;
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.tooShort).toBe(true);

    el.value = 'abcd';
    await el.updateComplete;
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.patternMismatch).toBe(true);

    el.value = 'ABCD';
    await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
  });

  it('clears value and fires k-clear, input and change when clearable button is clicked', async () => {
    const el = await mount('<k-input value="hello" clearable></k-input>');
    const clearBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear-button"]')!;
    expect(clearBtn.hidden).toBe(false);

    const onClear = vi.fn();
    const onInput = vi.fn();
    const onChange = vi.fn();
    el.addEventListener('k-clear', onClear);
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);

    clearBtn.click();
    await el.updateComplete;
    expect(el.value).toBe('');
    expect(clearBtn.hidden).toBe(true);
    expect(onClear).toHaveBeenCalledOnce();
    expect(onInput).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('toggles password visibility when password-toggle is enabled', async () => {
    const el = await mount('<k-input type="password" value="secret" password-toggle></k-input>');
    const nativeInput = el.shadowRoot!.querySelector('input')!;
    const toggleBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="password-button"]')!;
    expect(nativeInput.type).toBe('password');
    expect(toggleBtn.hidden).toBe(false);

    toggleBtn.click();
    await el.updateComplete;
    expect(nativeInput.type).toBe('text');

    toggleBtn.click();
    await el.updateComplete;
    expect(nativeInput.type).toBe('password');
  });

  it('supports user typing and non-rectangular shape clipping', async () => {
    const el = await mount('<k-input shape="chamfer"></k-input>');
    const base = el.shadowRoot!.querySelector<HTMLElement>('.base')!;
    expect(base.style.clipPath).toContain('path(');

    el.focus();
    await userEvent.keyboard('kerno');
    expect(el.value).toBe('kerno');
  });
});
