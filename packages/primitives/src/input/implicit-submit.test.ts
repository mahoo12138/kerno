import { afterEach, describe, expect, it } from 'vitest';
import type { KernoElement } from '@kerno/core';
import './define.js';
import '../button/define.js';
import '../number-input/define.js';

const mount = async (html: string): Promise<HTMLFormElement> => {
  document.body.innerHTML = html;
  const hosts = [...document.querySelectorAll<KernoElement>('k-input, k-button, k-number-input')];
  await Promise.all(hosts.map((el) => el.updateComplete));
  return document.querySelector('form')!;
};

/** Records each submission's entries, including the submitter's `name=value`. */
const recordSubmits = (form: HTMLFormElement): Record<string, string>[] => {
  const submits: Record<string, string>[] = [];
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form, (event as SubmitEvent).submitter);
    submits.push(Object.fromEntries([...data].map(([key, value]) => [key, String(value)])));
  });
  return submits;
};

/** Presses Enter in the native `<input>` inside `host`'s shadow root. */
const pressEnter = (host: Element, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    composed: true,
    cancelable: true,
    ...init,
  });
  host.shadowRoot!.querySelector('input')!.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('implicit submission from shadow-DOM text fields', () => {
  it('submits a form whose only text field is a <k-input>', async () => {
    const form = await mount('<form><k-input name="q" value="kerno"></k-input></form>');
    const submits = recordSubmits(form);
    const event = pressEnter(form.querySelector('k-input')!);
    expect(submits).toEqual([{ q: 'kerno' }]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('activates the default <k-button> and submits its name and value', async () => {
    const form = await mount(`
      <form>
        <k-input name="q" value="kerno"></k-input>
        <k-input name="r"></k-input>
        <k-button type="submit" name="action" value="save">Save</k-button>
        <k-button type="submit" name="action" value="publish">Publish</k-button>
      </form>
    `);
    const submits = recordSubmits(form);
    pressEnter(form.querySelector('k-input')!);
    expect(submits).toEqual([{ q: 'kerno', r: '', action: 'save' }]);
  });

  it('does not submit when the default button is disabled', async () => {
    const form = await mount(`
      <form>
        <k-input name="q"></k-input>
        <k-button type="submit" disabled>Go</k-button>
      </form>
    `);
    const submits = recordSubmits(form);
    pressEnter(form.querySelector('k-input')!);
    expect(submits).toEqual([]);
  });

  it('does not submit when several text fields block it and no submit button exists', async () => {
    const form = await mount('<form><k-input name="a"></k-input><input name="b" /></form>');
    const submits = recordSubmits(form);
    pressEnter(form.querySelector('k-input')!);
    expect(submits).toEqual([]);
  });

  it('commits <k-number-input> before submitting', async () => {
    const form = await mount('<form><k-number-input name="n"></k-number-input></form>');
    const submits = recordSubmits(form);
    const host = form.querySelector('k-number-input')!;
    host.shadowRoot!.querySelector('input')!.value = '42';
    pressEnter(host);
    expect(submits).toEqual([{ n: '42' }]);
  });

  it('leaves Enter alone during IME composition and outside a form', async () => {
    const form = await mount('<form><k-input name="q"></k-input></form>');
    const submits = recordSubmits(form);
    const composing = pressEnter(form.querySelector('k-input')!, { isComposing: true });
    expect(submits).toEqual([]);
    expect(composing.defaultPrevented).toBe(false);

    document.body.innerHTML = '<k-input></k-input>';
    const loose = document.querySelector('k-input')!;
    await loose.updateComplete;
    expect(pressEnter(loose).defaultPrevented).toBe(false);
  });
});
