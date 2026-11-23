import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../command/define.js';
import type { DrawerRequestCloseDetail, KDrawer } from './index.js';
import type { KCommand } from '../command/index.js';

const dialogOf = (host: Element): HTMLDialogElement =>
  host.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

/** Presses and releases the pointer on the modal backdrop, away from the panel. */
const clickBackdrop = (dialog: HTMLDialogElement, x: number, y: number): void => {
  const init = { clientX: x, clientY: y, bubbles: true, composed: true };
  dialog.dispatchEvent(new PointerEvent('pointerdown', init));
  dialog.dispatchEvent(new MouseEvent('click', init));
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-drawer> on the native <dialog> element', () => {
  it('opens modally or non-modally and locks scrolling only when modal', async () => {
    document.body.innerHTML = '<k-drawer label="Inspector"></k-drawer>';
    const drawer = document.querySelector('k-drawer') as KDrawer;
    await drawer.updateComplete;

    drawer.show();
    await drawer.updateComplete;
    expect(dialogOf(drawer).matches(':modal')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    drawer.modal = false;
    await drawer.updateComplete;
    expect(dialogOf(drawer).open).toBe(true);
    expect(dialogOf(drawer).matches(':modal')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('requests closing on backdrop clicks with source "backdrop"', async () => {
    document.body.innerHTML = '<k-drawer label="Filters" size="sm" open></k-drawer>';
    const drawer = document.querySelector('k-drawer') as KDrawer;
    await drawer.updateComplete;

    const sources: string[] = [];
    drawer.addEventListener('k-request-close', (e) =>
      sources.push((e as CustomEvent<DrawerRequestCloseDetail>).detail.source),
    );
    // The default drawer is anchored to the inline end; the far start edge is backdrop.
    clickBackdrop(dialogOf(drawer), 2, 2);
    await drawer.updateComplete;
    expect(sources).toEqual(['backdrop']);
    expect(drawer.open).toBe(false);
  });

  it('is named by its title', async () => {
    document.body.innerHTML = '<k-drawer label="Settings"></k-drawer>';
    const drawer = document.querySelector('k-drawer') as KDrawer;
    await drawer.updateComplete;
    expect(dialogOf(drawer).getAttribute('aria-labelledby')).toBe('title');
  });
});

describe('<k-command> on the native <dialog> element', () => {
  it('opens modally, is named by its placeholder and resets the query on close', async () => {
    document.body.innerHTML = `
      <k-command placeholder="Search commands">
        <k-command-item value="a">Alpha</k-command-item>
      </k-command>
    `;
    const cmd = document.querySelector('k-command') as KCommand;
    await cmd.updateComplete;
    const onClose = vi.fn();
    cmd.addEventListener('k-close', onClose);

    cmd.value = 'alp';
    cmd.show();
    await cmd.updateComplete;
    const dialog = dialogOf(cmd);
    expect(dialog.matches(':modal')).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Search commands');
    await vi.waitFor(() =>
      expect(cmd.shadowRoot!.activeElement?.classList.contains('search-input')).toBe(true),
    );

    await userEvent.keyboard('{Escape}');
    await cmd.updateComplete;
    expect(cmd.open).toBe(false);
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(cmd.value).toBe(''));
  });

  it('closes on backdrop clicks', async () => {
    document.body.innerHTML = '<k-command open><k-command-item>Alpha</k-command-item></k-command>';
    const cmd = document.querySelector('k-command') as KCommand;
    await cmd.updateComplete;
    clickBackdrop(dialogOf(cmd), 2, window.innerHeight - 2);
    await cmd.updateComplete;
    expect(cmd.open).toBe(false);
  });

  it('renders inline palettes outside the dialog and moves them in for modal use', async () => {
    document.body.innerHTML = `
      <k-command inline><k-command-item>Alpha</k-command-item></k-command>
    `;
    const cmd = document.querySelector('k-command') as KCommand;
    await cmd.updateComplete;

    const panel = cmd.shadowRoot!.querySelector('.panel')!;
    const dialog = dialogOf(cmd);
    expect(dialog.contains(panel)).toBe(false);
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(dialog.open).toBe(false);

    cmd.inline = false;
    cmd.open = true;
    await cmd.updateComplete;
    expect(dialog.contains(panel)).toBe(true);
    expect(dialog.matches(':modal')).toBe(true);
  });
});
