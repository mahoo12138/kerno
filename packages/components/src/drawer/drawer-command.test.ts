import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../command/define.js';
import type { KDrawer } from './index.js';
import {
  defaultCommandFilter,
  type KCommand,
  type KCommandGroup,
  type KCommandItem,
} from '../command/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-drawer>', () => {
  it('opens across placements, traps focus, respects cancelable k-request-close, and restores focus', async () => {
    document.body.innerHTML = `
      <button id="open-btn">Open Drawer</button>
      <k-drawer placement="left" size="sm" label="Inspector" acrylic>
        <input id="drawer-input" type="text" />
        <button slot="footer" id="drawer-save">Save</button>
      </k-drawer>
    `;
    const opener = document.getElementById('open-btn') as HTMLButtonElement;
    const drawer = document.querySelector('k-drawer') as KDrawer;
    await drawer.updateComplete;

    opener.focus();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    drawer.addEventListener('k-open', onOpen);
    drawer.addEventListener('k-close', onClose);

    drawer.show();
    await drawer.updateComplete;
    expect(drawer.open).toBe(true);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(drawer.shadowRoot!.querySelector('.panel')!.getAttribute('aria-modal')).toBe('true');

    // Prevent first Escape close
    let block = true;
    drawer.addEventListener('k-request-close', (e) => {
      if (block) e.preventDefault();
    });
    await userEvent.keyboard('{Escape}');
    await drawer.updateComplete;
    expect(drawer.open).toBe(true);

    // Allow Escape close and verify focus restoration
    block = false;
    await userEvent.keyboard('{Escape}');
    await drawer.updateComplete;
    expect(drawer.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(opener);
  });
});

describe('<k-command>', () => {
  it('toggles via global shortcut, filters items/groups fuzzily, and activates via keyboard', async () => {
    document.body.innerHTML = `
      <k-command shortcut="mod+k" acrylic>
        <k-command-group id="g-theme" heading="Themes">
          <k-command-item value="theme-light" keywords="day bright">Switch to Light Theme</k-command-item>
          <k-command-item value="theme-ocean" keywords="teal dark">Switch to Ocean Theme</k-command-item>
        </k-command-group>
        <k-command-group id="g-nav" heading="Navigation">
          <k-command-item value="jump-acrylic">Go to Acrylic Lab</k-command-item>
          <k-command-item value="disabled-cmd" disabled>Unavailable Action</k-command-item>
        </k-command-group>
      </k-command>
    `;
    const cmd = document.querySelector('k-command') as KCommand;
    const gTheme = document.getElementById('g-theme') as KCommandGroup;
    const gNav = document.getElementById('g-nav') as KCommandGroup;
    await cmd.updateComplete;

    // Trigger global Cmd/Ctrl + K
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    );
    await cmd.updateComplete;
    expect(cmd.open).toBe(true);

    const input = cmd.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!;
    input.value = 'ocean';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await cmd.updateComplete;

    expect(gTheme.hidden).toBe(false);
    expect(gNav.hidden).toBe(true);
    const items = [...cmd.querySelectorAll<KCommandItem>('k-command-item')];
    expect(items[0]!.hidden).toBe(true);
    expect(items[1]!.hidden).toBe(false);
    expect(items[1]!.active).toBe(true);

    // Fuzzy subsequence check
    expect(defaultCommandFilter(items[1]!, 'soct')).toBeGreaterThan(0);

    // Enter activates highlighted item and closes modal
    const selected: string[] = [];
    cmd.addEventListener('k-command-select', (e) => {
      selected.push((e as CustomEvent<{ value: string }>).detail.value);
    });
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await cmd.updateComplete;
    expect(selected).toEqual(['theme-ocean']);
    expect(cmd.open).toBe(false);
  });

  it('navigates visible enabled items cleanly with ArrowDown/ArrowUp in inline mode', async () => {
    document.body.innerHTML = `
      <k-command inline>
        <k-command-item value="a">Alpha</k-command-item>
        <k-command-item value="b" disabled>Beta Disabled</k-command-item>
        <k-command-item value="c">Gamma</k-command-item>
      </k-command>
    `;
    const cmd = document.querySelector('k-command') as KCommand;
    await cmd.updateComplete;

    const items = [...cmd.querySelectorAll<KCommandItem>('k-command-item')];
    const input = cmd.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!;
    expect(items[0]!.active).toBe(true);

    // ArrowDown skips disabled item "b" and lands on "c"
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await cmd.updateComplete;
    expect(items[2]!.active).toBe(true);

    // Wraps back to "a"
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await cmd.updateComplete;
    expect(items[0]!.active).toBe(true);
  });
});
