import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@kerno/primitives/select/define';
import './define.js';
import type { KSelect } from '@kerno/primitives/select';
import type { DialogRequestCloseDetail, KDialog } from './index.js';

const mount = async (html: string): Promise<KDialog> => {
  document.body.innerHTML = html;
  const dialog = document.querySelector('k-dialog') as KDialog;
  await dialog.updateComplete;
  return dialog;
};

const panelOf = (dialog: KDialog): HTMLDialogElement =>
  dialog.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

/** Presses and releases the pointer on the modal backdrop (outside the panel's box). */
const clickBackdrop = (dialog: KDialog): void => {
  const panel = panelOf(dialog);
  const init = { clientX: 2, clientY: 2, bubbles: true, composed: true };
  panel.dispatchEvent(new PointerEvent('pointerdown', init));
  panel.dispatchEvent(new MouseEvent('click', init));
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-dialog> on the native <dialog> element', () => {
  it('opens modally: top layer, inert page, scroll lock', async () => {
    const dialog = await mount(`
      <button id="outside">Outside</button>
      <k-dialog label="Confirm"><button id="inside">Inside</button></k-dialog>
    `);
    dialog.show();
    await dialog.updateComplete;

    const panel = panelOf(dialog);
    expect(panel.open).toBe(true);
    expect(panel.matches(':modal')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    // Everything outside a modal dialog is inert.
    const outside = document.getElementById('outside') as HTMLButtonElement;
    outside.focus();
    expect(document.activeElement).not.toBe(outside);
    const inside = document.getElementById('inside') as HTMLButtonElement;
    inside.focus();
    expect(document.activeElement).toBe(inside);

    dialog.close();
    await dialog.updateComplete;
    expect(panel.open).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('opens non-modally without a backdrop or inert page', async () => {
    const dialog = await mount('<k-dialog label="Info"></k-dialog>');
    dialog.modal = false;
    dialog.show();
    await dialog.updateComplete;

    const panel = panelOf(dialog);
    expect(panel.open).toBe(true);
    expect(panel.matches(':modal')).toBe(false);

    // Switching to modal while open re-shows it as a modal dialog.
    dialog.modal = true;
    await dialog.updateComplete;
    expect(panel.matches(':modal')).toBe(true);
  });

  it('requests closing on backdrop clicks unless close-on-backdrop is off', async () => {
    const dialog = await mount('<k-dialog label="Backdrop" open></k-dialog>');
    const sources: string[] = [];
    dialog.addEventListener('k-request-close', (e) =>
      sources.push((e as CustomEvent<DialogRequestCloseDetail>).detail.source),
    );

    dialog.closeOnBackdrop = false;
    await dialog.updateComplete;
    clickBackdrop(dialog);
    await dialog.updateComplete;
    expect(dialog.open).toBe(true);

    dialog.closeOnBackdrop = true;
    await dialog.updateComplete;
    clickBackdrop(dialog);
    await dialog.updateComplete;
    expect(sources).toEqual(['backdrop']);
    expect(dialog.open).toBe(false);
  });

  it('ignores clicks inside the panel and keeps open with close-on-escape off', async () => {
    const dialog = await mount('<k-dialog label="Sticky" open><p id="body">Body</p></k-dialog>');
    document.getElementById('body')!.click();
    await dialog.updateComplete;
    expect(dialog.open).toBe(true);

    dialog.closeOnEscape = false;
    await dialog.updateComplete;
    await userEvent.keyboard('{Escape}');
    await dialog.updateComplete;
    expect(dialog.open).toBe(true);
    expect(panelOf(dialog).open).toBe(true);
  });

  it('closes a select inside the dialog before the dialog on Escape', async () => {
    const dialog = await mount(`
      <k-dialog label="Pick" open>
        <k-select><k-option value="a">A</k-option><k-option value="b">B</k-option></k-select>
      </k-dialog>
    `);
    const select = dialog.querySelector('k-select') as KSelect;
    select.open = true;
    await select.updateComplete;

    await userEvent.keyboard('{Escape}');
    await select.updateComplete;
    expect(select.open).toBe(false);
    expect(dialog.open).toBe(true);

    await userEvent.keyboard('{Escape}');
    await dialog.updateComplete;
    expect(dialog.open).toBe(false);
  });

  it('stays in sync when the browser closes the native dialog itself', async () => {
    const dialog = await mount('<k-dialog label="Native" open></k-dialog>');
    const onClose = vi.fn();
    dialog.addEventListener('k-close', onClose);

    panelOf(dialog).close();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('re-enters the top layer when moved in the document and keeps focus restoration', async () => {
    const dialog = await mount(`
      <button id="launcher">Launch</button>
      <k-dialog label="Moved"></k-dialog>
    `);
    const launcher = document.getElementById('launcher') as HTMLButtonElement;
    launcher.focus();
    dialog.show();
    await dialog.updateComplete;

    const host = document.createElement('section');
    document.body.append(host);
    host.append(dialog);
    await dialog.updateComplete;
    expect(panelOf(dialog).matches(':modal')).toBe(true);

    dialog.close();
    await dialog.updateComplete;
    expect(document.activeElement).toBe(launcher);
  });

  it('preserves focus restoration when switching modal mode while open', async () => {
    const dialog = await mount(`
      <button id="launcher">Launch</button>
      <k-dialog label="Switch"></k-dialog>
    `);
    const launcher = document.getElementById('launcher') as HTMLButtonElement;
    launcher.focus();
    dialog.modal = false;
    dialog.show();
    await dialog.updateComplete;

    dialog.modal = true;
    await dialog.updateComplete;
    expect(panelOf(dialog).matches(':modal')).toBe(true);

    dialog.close();
    await dialog.updateComplete;
    expect(document.activeElement).toBe(launcher);
  });

  it('lets Escape pass through when a non-modal dialog disables close-on-escape', async () => {
    const dialog = await mount('<k-dialog label="Modeless" open></k-dialog>');
    dialog.modal = false;
    dialog.closeOnEscape = false;
    await dialog.updateComplete;

    let prevented: boolean | null = null;
    const onKey = (e: KeyboardEvent): void => {
      prevented = e.defaultPrevented;
    };
    document.addEventListener('keydown', onKey);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    document.removeEventListener('keydown', onKey);

    expect(prevented).toBe(false);
    expect(dialog.open).toBe(true);
  });

  it('is named by its title, or by a host aria-label', async () => {
    const dialog = await mount('<k-dialog label="Delete file?"></k-dialog>');
    const panel = panelOf(dialog);
    expect(panel.getAttribute('aria-labelledby')).toBe('title');

    dialog.setAttribute('aria-label', 'Confirm deletion');
    await new Promise((resolve) => setTimeout(resolve));
    expect(panel.getAttribute('aria-label')).toBe('Confirm deletion');
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
  });
});
