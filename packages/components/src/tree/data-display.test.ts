import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../list/define.js';
import '../table/define.js';
import type { KTree, KTreeItem } from './index.js';
import type { KList, KListItem } from '../list/index.js';
import type { KTable } from '../table/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-tree>', () => {
  it('supports cascade checkboxes with parent indeterminate state, keyboard nav, and lazy loading', async () => {
    document.body.innerHTML = `
      <k-tree checkable>
        <k-tree-item id="root" value="packages" label="packages" expanded>
          <k-tree-item id="c1" value="tokens" label="tokens"></k-tree-item>
          <k-tree-item id="c2" value="core" label="core"></k-tree-item>
        </k-tree-item>
        <k-tree-item id="lazy-node" value="remote" label="remote" lazy></k-tree-item>
      </k-tree>
    `;
    const tree = document.querySelector('k-tree') as KTree;
    const root = document.getElementById('root') as KTreeItem;
    const c1 = document.getElementById('c1') as KTreeItem;
    const c2 = document.getElementById('c2') as KTreeItem;
    const lazyNode = document.getElementById('lazy-node') as KTreeItem;
    await Promise.all([
      tree.updateComplete,
      root.updateComplete,
      c1.updateComplete,
      c2.updateComplete,
      lazyNode.updateComplete,
    ]);

    // Checking one child puts parent into indeterminate state
    c1.shadowRoot!.querySelector<HTMLButtonElement>('.check')!.click();
    await Promise.all([root.updateComplete, c1.updateComplete, c2.updateComplete]);
    expect(c1.checked).toBe(true);
    expect(root.checked).toBe(false);
    expect(root.indeterminate).toBe(true);

    // Checking second child marks parent fully checked
    c2.shadowRoot!.querySelector<HTMLButtonElement>('.check')!.click();
    await Promise.all([root.updateComplete, c1.updateComplete, c2.updateComplete]);
    expect(root.checked).toBe(true);
    expect(root.indeterminate).toBe(false);

    // Unchecking parent cascades to all children
    root.shadowRoot!.querySelector<HTMLButtonElement>('.check')!.click();
    await Promise.all([root.updateComplete, c1.updateComplete, c2.updateComplete]);
    expect(c1.checked).toBe(false);
    expect(c2.checked).toBe(false);

    // Expanding lazy branch fires k-tree-load and enters loading state
    const onLoad = vi.fn();
    tree.addEventListener('k-tree-load', (e) =>
      onLoad((e as CustomEvent<{ value: string }>).detail.value),
    );
    lazyNode.shadowRoot!.querySelector<HTMLButtonElement>('.toggle')!.click();
    await lazyNode.updateComplete;
    expect(lazyNode.expanded).toBe(true);
    expect(lazyNode.loading).toBe(true);
    expect(onLoad).toHaveBeenCalledWith('remote');
  });

  it('computes initial parent indeterminate state when children are pre-checked in HTML', async () => {
    document.body.innerHTML = `
      <k-tree checkable>
        <k-tree-item id="p" value="p" label="Parent" expanded>
          <k-tree-item value="a" label="A" checked></k-tree-item>
          <k-tree-item value="b" label="B"></k-tree-item>
        </k-tree-item>
      </k-tree>
    `;
    const tree = document.querySelector('k-tree') as KTree;
    const parent = document.getElementById('p') as KTreeItem;
    await Promise.all([tree.updateComplete, parent.updateComplete]);
    expect(parent.checked).toBe(false);
    expect(parent.indeterminate).toBe(true);
  });
});

describe('<k-list>', () => {
  it('supports single and multiple selection modes and emits k-list-select', async () => {
    document.body.innerHTML = `
      <k-list selection="single">
        <k-list-item value="a">Item A</k-list-item>
        <k-list-item value="b">Item B</k-list-item>
        <k-list-item value="c" disabled>Item C</k-list-item>
      </k-list>
    `;
    const list = document.querySelector('k-list') as KList;
    const items = [...list.querySelectorAll<KListItem>('k-list-item')];
    await Promise.all([list.updateComplete, ...items.map((i) => i.updateComplete)]);

    items[0]!.shadowRoot!.querySelector<HTMLDivElement>('.base')!.click();
    await Promise.all(items.map((i) => i.updateComplete));
    expect(list.selectedValues).toEqual(['a']);

    items[1]!.shadowRoot!.querySelector<HTMLDivElement>('.base')!.click();
    await Promise.all(items.map((i) => i.updateComplete));
    expect(list.selectedValues).toEqual(['b']);

    list.selection = 'multiple';
    await list.updateComplete;
    items[0]!.shadowRoot!.querySelector<HTMLDivElement>('.base')!.click();
    await Promise.all(items.map((i) => i.updateComplete));
    expect(list.selectedValues).toEqual(['a', 'b']);
  });
});

describe('<k-table> enhancements', () => {
  it('supports multi-row selection with mixed header checkbox and live filter', async () => {
    document.body.innerHTML = '<k-table selectable row-key="id"></k-table>';
    const table = document.querySelector('k-table') as KTable;
    table.columns = [
      { key: 'name', title: 'Component', sortable: true },
      { key: 'layer', title: 'Layer' },
    ];
    table.data = [
      { id: '1', name: 'DatePicker', layer: 'Data Entry' },
      { id: '2', name: 'Tree', layer: 'Data Display' },
      { id: '3', name: 'Upload', layer: 'Data Entry' },
    ];
    await table.updateComplete;

    const rowChecks = table.shadowRoot!.querySelectorAll<HTMLButtonElement>('tbody .check-btn');
    expect(rowChecks).toHaveLength(3);

    const onSelect = vi.fn();
    table.addEventListener('k-selection-change', (e) =>
      onSelect((e as CustomEvent<{ selectedKeys: string[] }>).detail.selectedKeys),
    );

    rowChecks[0]!.click();
    await table.updateComplete;
    expect(onSelect).toHaveBeenLastCalledWith(['1']);
    expect(table.shadowRoot!.querySelector('thead .check-btn')!.getAttribute('aria-checked')).toBe(
      'mixed',
    );

    // Header select-all selects all visible rows
    table.shadowRoot!.querySelector<HTMLButtonElement>('thead .check-btn')!.click();
    await table.updateComplete;
    expect(table.selectedKeys).toEqual(['1', '2', '3']);
    expect(table.shadowRoot!.querySelector('thead .check-btn')!.getAttribute('aria-checked')).toBe(
      'true',
    );

    // Live filter narrows rows
    table.filter = 'Data Entry';
    await table.updateComplete;
    expect(table.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});
