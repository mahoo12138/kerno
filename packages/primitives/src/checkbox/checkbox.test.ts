import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KCheckbox } from './index.js';

const mount = async <T extends HTMLElement = KCheckbox>(html: string): Promise<T> => {
  document.body.innerHTML = html;
  const boxes = [...document.querySelectorAll('k-checkbox')];
  await Promise.all(boxes.map((b) => b.updateComplete));
  return document.body.firstElementChild as T;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-checkbox>', () => {
  it('toggles via click and Space key, clearing indeterminate state', async () => {
    const el = await mount('<k-checkbox indeterminate>Accept terms</k-checkbox>');
    const control = el.shadowRoot!.querySelector('[part="control"]')!;
    expect(control.getAttribute('aria-checked')).toBe('mixed');

    const onChange = vi.fn();
    el.addEventListener('change', onChange);

    el.click();
    await el.updateComplete;
    expect(el.indeterminate).toBe(false);
    expect(el.checked).toBe(true);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(onChange).toHaveBeenCalledOnce();

    el.focus();
    await userEvent.keyboard(' ');
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(control.getAttribute('aria-checked')).toBe('false');
  });

  it('submits value only when checked, validates required and resets cleanly', async () => {
    const form = await mount<HTMLFormElement>(`
      <form>
        <k-checkbox name="terms" value="agreed" required></k-checkbox>
      </form>
    `);
    const cb = form.querySelector('k-checkbox')!;
    expect(cb.checkValidity()).toBe(false);
    expect(new FormData(form).get('terms')).toBeNull();

    cb.click();
    await cb.updateComplete;
    expect(cb.checkValidity()).toBe(true);
    expect(new FormData(form).get('terms')).toBe('agreed');

    form.reset();
    await cb.updateComplete;
    expect(cb.checked).toBe(false);
    expect(new FormData(form).get('terms')).toBeNull();
  });

  it('ignores activation while disabled', async () => {
    const el = await mount('<k-checkbox disabled>Disabled</k-checkbox>');
    const onChange = vi.fn();
    el.addEventListener('change', onChange);
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
