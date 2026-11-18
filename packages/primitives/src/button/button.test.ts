import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KButton } from './button.js';
import './define.js';

const mount = async (html: string): Promise<HTMLElement> => {
  document.body.innerHTML = html;
  const buttons = [...document.querySelectorAll('k-button')];
  await Promise.all(buttons.map((b) => b.updateComplete));
  return document.body.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-button>', () => {
  it('upgrades and renders a native button with parts and slots', async () => {
    const el = (await mount('<k-button>Save</k-button>')) as KButton;
    expect(el).toBeInstanceOf(KButton);
    const base = el.shadowRoot!.querySelector('[part="base"]')!;
    expect(base.tagName).toBe('BUTTON');
    expect(el.shadowRoot!.querySelectorAll('[part]')).toHaveLength(4);
    expect(el.variant).toBe('standard');
    expect(el.getAttribute('variant')).toBe('standard');
  });

  it('reflects variant and size and applies token-driven styles', async () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<style id="t">:root { --k-color-accent-default: rgb(10, 20, 30); }</style>',
    );
    const el = (await mount('<k-button variant="accent" size="lg">Go</k-button>')) as KButton;
    const base = el.shadowRoot!.querySelector('.base')!;
    expect(getComputedStyle(base).backgroundColor).toBe('rgb(10, 20, 30)');
    el.variant = 'subtle';
    await el.updateComplete;
    expect(el.getAttribute('variant')).toBe('subtle');
    document.getElementById('t')!.remove();
  });

  it('honors component-level custom properties', async () => {
    const el = await mount(
      '<k-button style="--k-button-bg: rgb(1, 1, 1); --k-button-radius: 7px">x</k-button>',
    );
    const base = el.shadowRoot!.querySelector('.base')!;
    expect(getComputedStyle(base).backgroundColor).toBe('rgb(1, 1, 1)');
    expect(getComputedStyle(base).borderTopLeftRadius).toBe('7px');
  });

  it('shows prefix/suffix wrappers only when slotted', async () => {
    const el = await mount('<k-button><span slot="prefix">★</span>Star</k-button>');
    const prefix = el.shadowRoot!.querySelector<HTMLElement>('.prefix')!;
    const suffix = el.shadowRoot!.querySelector<HTMLElement>('.suffix')!;
    expect(getComputedStyle(prefix).display).not.toBe('none');
    expect(getComputedStyle(suffix).display).toBe('none');
  });

  it('delegates focus to the inner button', async () => {
    const el = await mount('<k-button>Focus</k-button>');
    el.focus();
    expect(document.activeElement).toBe(el);
    expect(el.shadowRoot!.activeElement?.tagName).toBe('BUTTON');
  });

  it('is keyboard operable', async () => {
    const el = await mount('<k-button>Key</k-button>');
    const onClick = vi.fn();
    el.addEventListener('click', onClick);
    el.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('blocks clicks while disabled', async () => {
    const el = (await mount('<k-button disabled>No</k-button>')) as KButton;
    const onClick = vi.fn();
    el.addEventListener('click', onClick);
    el.click();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(onClick).not.toHaveBeenCalled();
    expect(el.shadowRoot!.querySelector('button')!.disabled).toBe(true);
    expect(el.matches(':disabled')).toBe(true);
  });

  it('submits its form with name/value', async () => {
    const form = (await mount(`
      <form>
        <input name="q" value="kerno">
        <k-button type="submit" name="action" value="save">Submit</k-button>
      </form>`)) as HTMLFormElement;
    const submitted = new Promise<FormData>((resolve) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        resolve(new FormData(form, e.submitter));
      });
    });
    (form.querySelector('k-button') as KButton).click();
    const data = await submitted;
    expect(data.get('q')).toBe('kerno');
    expect(data.get('action')).toBe('save');
    expect(form.querySelectorAll('button')).toHaveLength(0); // proxy cleaned up
  });

  it('runs constraint validation before submitting', async () => {
    const form = (await mount(`
      <form><input name="q" required><k-button type="submit">Submit</k-button></form>`)) as HTMLFormElement;
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', onSubmit);
    (form.querySelector('k-button') as KButton).click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('resets its form', async () => {
    const form = (await mount(`
      <form><input name="q" value="a"><k-button type="reset">Reset</k-button></form>`)) as HTMLFormElement;
    const input = form.querySelector('input')!;
    input.value = 'changed';
    (form.querySelector('k-button') as KButton).click();
    expect(input.value).toBe('a');
  });

  it('is disabled by an ancestor fieldset', async () => {
    const fieldset = await mount('<fieldset disabled><k-button>In</k-button></fieldset>');
    const el = fieldset.querySelector('k-button')!;
    await el.updateComplete;
    expect(el.isDisabled).toBe(true);
    expect(el.shadowRoot!.querySelector('button')!.disabled).toBe(true);
    (fieldset as HTMLFieldSetElement).disabled = false;
    await el.updateComplete;
    expect(el.isDisabled).toBe(false);
    expect(el.shadowRoot!.querySelector('button')!.disabled).toBe(false);
  });
});
