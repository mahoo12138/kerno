import { generateTokensCss } from '@kerno/tokens';
import '@kerno/primitives/define';
import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KDialog, KDropdown, KNav, KPopover, KTabs, KTooltip } from './index.js';

let tokenStyle: HTMLStyleElement;

beforeEach(() => {
  tokenStyle = document.createElement('style');
  tokenStyle.textContent = generateTokensCss();
  document.head.append(tokenStyle);
});

afterEach(() => {
  tokenStyle.remove();
  document.body.innerHTML = '';
});

describe('<k-dialog>', () => {
  it('opens, traps focus, emits k-request-close on Escape and closes cleanly', async () => {
    document.body.innerHTML = `
      <button id="open-btn">Launch</button>
      <k-dialog label="Confirm action">
        <p>Are you sure?</p>
        <k-button slot="footer" id="confirm-btn" variant="accent">Confirm</k-button>
      </k-dialog>
    `;
    const openBtn = document.getElementById('open-btn') as HTMLButtonElement;
    const dialog = document.querySelector('k-dialog') as KDialog;
    await dialog.updateComplete;

    openBtn.focus();
    const onOpen = vi.fn();
    const onRequestClose = vi.fn();
    const onClose = vi.fn();
    dialog.addEventListener('k-open', onOpen);
    dialog.addEventListener('k-request-close', onRequestClose);
    dialog.addEventListener('k-close', onClose);

    dialog.show();
    await dialog.updateComplete;
    expect(onOpen).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);

    await userEvent.keyboard('{Escape}');
    await dialog.updateComplete;
    expect(onRequestClose).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(openBtn);
  });
});

describe('<k-popover>', () => {
  it('toggles on trigger click and dismisses on Escape', async () => {
    document.body.innerHTML = `
      <k-popover>
        <k-button slot="trigger" id="pop-btn">Info</k-button>
        <div>Popover details</div>
      </k-popover>
    `;
    const popover = document.querySelector('k-popover') as KPopover;
    const btn = document.getElementById('pop-btn')!;
    await popover.updateComplete;

    btn.click();
    await popover.updateComplete;
    expect(popover.open).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    await userEvent.keyboard('{Escape}');
    await popover.updateComplete;
    expect(popover.open).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('<k-tooltip>', () => {
  it('shows on focus and hides on blur or Escape', async () => {
    document.body.innerHTML = `
      <k-tooltip content="Helpful hint">
        <button id="tip-target">Hover me</button>
      </k-tooltip>
    `;
    const tooltip = document.querySelector('k-tooltip') as KTooltip;
    const target = document.getElementById('tip-target') as HTMLButtonElement;
    await tooltip.updateComplete;

    target.focus();
    await tooltip.updateComplete;
    expect(tooltip.open).toBe(true);

    await userEvent.keyboard('{Escape}');
    await tooltip.updateComplete;
    expect(tooltip.open).toBe(false);
  });
});

describe('<k-dropdown>, <k-menu> & <k-menu-item>', () => {
  it('opens, navigates items with ArrowDown and closes on item selection', async () => {
    document.body.innerHTML = `
      <k-dropdown>
        <k-button slot="trigger" id="dd-btn">Actions</k-button>
        <k-menu>
          <k-menu-item value="edit">Edit</k-menu-item>
          <k-menu-item value="duplicate">Duplicate</k-menu-item>
          <k-menu-item value="delete" disabled>Delete</k-menu-item>
        </k-menu>
      </k-dropdown>
    `;
    const dropdown = document.querySelector('k-dropdown') as KDropdown;
    const btn = document.getElementById('dd-btn')!;
    await dropdown.updateComplete;

    const selected: string[] = [];
    dropdown.addEventListener('k-select', (e) => {
      selected.push((e as CustomEvent<{ value: string }>).detail.value);
    });

    btn.click();
    await dropdown.updateComplete;
    expect(dropdown.open).toBe(true);

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await dropdown.updateComplete;

    expect(selected).toEqual(['duplicate']);
    expect(dropdown.open).toBe(false);
  });
});

describe('<k-tabs>, <k-tab> & <k-tab-panel>', () => {
  it('pairs tabs with panels, switches on click and supports ArrowRight navigation', async () => {
    document.body.innerHTML = `
      <k-tabs value="overview">
        <k-tab panel="overview">Overview</k-tab>
        <k-tab panel="tokens">Tokens</k-tab>
        <k-tab panel="disabled" disabled>Disabled</k-tab>
        <k-tab-panel name="overview">Overview body</k-tab-panel>
        <k-tab-panel name="tokens">Tokens body</k-tab-panel>
        <k-tab-panel name="disabled">Disabled body</k-tab-panel>
      </k-tabs>
    `;
    const tabs = document.querySelector('k-tabs') as KTabs;
    const tabList = tabs.getTabs();
    const panels = tabs.getPanels();
    await Promise.all([
      tabs.updateComplete,
      ...tabList.map((t) => t.updateComplete),
      ...panels.map((p) => p.updateComplete),
    ]);

    expect(tabList[0]!.active).toBe(true);
    expect(panels[0]!.active).toBe(true);
    expect(panels[1]!.hidden).toBe(true);

    const onChange = vi.fn();
    tabs.addEventListener('k-tab-change', onChange);

    tabList[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    await Promise.all([
      tabs.updateComplete,
      ...tabList.map((t) => t.updateComplete),
      ...panels.map((p) => p.updateComplete),
    ]);

    expect(tabs.value).toBe('tokens');
    expect(tabList[1]!.active).toBe(true);
    expect(panels[1]!.active).toBe(true);
    expect(panels[0]!.hidden).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe('<k-nav> & <k-nav-item>', () => {
  it('tracks active navigation item, sets aria-current="page" and emits k-nav-select', async () => {
    document.body.innerHTML = `
      <k-nav value="home" label="Primary">
        <k-nav-item value="home">Home</k-nav-item>
        <k-nav-item value="components">Components</k-nav-item>
      </k-nav>
    `;
    const nav = document.querySelector('k-nav') as KNav;
    const items = nav.getItems();
    await Promise.all([nav.updateComplete, ...items.map((i) => i.updateComplete)]);

    expect(items[0]!.active).toBe(true);
    expect(items[0]!.shadowRoot!.querySelector('button')!.getAttribute('aria-current')).toBe(
      'page',
    );

    const onSelect = vi.fn();
    nav.addEventListener('k-nav-select', onSelect);

    items[1]!.click();
    await Promise.all([nav.updateComplete, ...items.map((i) => i.updateComplete)]);

    expect(nav.value).toBe('components');
    expect(items[1]!.active).toBe(true);
    expect(items[0]!.active).toBe(false);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
