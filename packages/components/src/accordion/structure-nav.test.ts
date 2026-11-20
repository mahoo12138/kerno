import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../breadcrumb/define.js';
import '../pagination/define.js';
import type { KAccordion, KAccordionItem } from './index.js';
import type { KBreadcrumb, KBreadcrumbItem } from '../breadcrumb/index.js';
import { computePaginationRange, type KPagination } from '../pagination/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-accordion>', () => {
  it('enforces single-expand, collapsible=false, inert collapsed panels, and arrow navigation', async () => {
    document.body.innerHTML = `
      <k-accordion>
        <k-accordion-item value="one" heading="Section One" open>Body 1</k-accordion-item>
        <k-accordion-item value="two" heading="Section Two">Body 2</k-accordion-item>
        <k-accordion-item value="three" heading="Section Three" disabled>Body 3</k-accordion-item>
      </k-accordion>
    `;
    const acc = document.querySelector('k-accordion') as KAccordion;
    const items = [...acc.querySelectorAll<KAccordionItem>('k-accordion-item')];
    await Promise.all([acc.updateComplete, ...items.map((i) => i.updateComplete)]);

    expect(items[0]!.open).toBe(true);
    expect(items[1]!.shadowRoot!.querySelector<HTMLDivElement>('.panel')!.inert).toBe(true);

    // Clicking item 2 closes item 1 in single mode
    items[1]!.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!.click();
    await Promise.all(items.map((i) => i.updateComplete));
    expect(items[0]!.open).toBe(false);
    expect(items[1]!.open).toBe(true);
    expect(items[1]!.shadowRoot!.querySelector<HTMLDivElement>('.panel')!.inert).toBe(false);

    // When collapsible=false, clicking the sole open item keeps it open
    acc.collapsible = false;
    await acc.updateComplete;
    items[1]!.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!.click();
    await items[1]!.updateComplete;
    expect(items[1]!.open).toBe(true);

    // Multiple mode lets both stay open
    acc.multiple = true;
    await acc.updateComplete;
    items[0]!.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!.click();
    await Promise.all(items.map((i) => i.updateComplete));
    expect(items[0]!.open).toBe(true);
    expect(items[1]!.open).toBe(true);

    // ArrowDown moves focus from trigger 0 to trigger 1 (skipping disabled trigger 2 on next press)
    items[0]!.focusTrigger();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[0]);
  });
});

describe('<k-breadcrumb>', () => {
  it('marks the final item aria-current="page" and collapses middle crumbs when max-items is set', async () => {
    document.body.innerHTML = `
      <k-breadcrumb max-items="3" separator="/">
        <k-breadcrumb-item href="#home">Home</k-breadcrumb-item>
        <k-breadcrumb-item href="#org">Workspace</k-breadcrumb-item>
        <k-breadcrumb-item href="#proj">Kerno</k-breadcrumb-item>
        <k-breadcrumb-item>Settings</k-breadcrumb-item>
      </k-breadcrumb>
    `;
    const bc = document.querySelector('k-breadcrumb') as KBreadcrumb;
    const items = [...bc.querySelectorAll<KBreadcrumbItem>('k-breadcrumb-item')];
    await Promise.all([bc.updateComplete, ...items.map((i) => i.updateComplete)]);

    expect(items[3]!.shadowRoot!.querySelector<HTMLElement>('.current')!.hidden).toBe(false);
    expect(items[3]!.shadowRoot!.querySelector('.current')!.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(items[1]!.hasAttribute('data-k-bc-collapsed')).toBe(true);
    expect(items[2]!.hasAttribute('data-k-bc-collapsed')).toBe(false);

    // Clicking the ellipsis button expands hidden crumbs
    const ellipsis = items[0]!.shadowRoot!.querySelector<HTMLButtonElement>('.ellipsis')!;
    expect(ellipsis.hidden).toBe(false);
    ellipsis.click();
    await Promise.all([bc.updateComplete, ...items.map((i) => i.updateComplete)]);
    expect(items[1]!.hasAttribute('data-k-bc-collapsed')).toBe(false);
    expect(ellipsis.hidden).toBe(true);
  });
});

describe('<k-pagination>', () => {
  it('computes clean collapsed ranges without redundant single-page ellipses', () => {
    expect(computePaginationRange(1, 1)).toEqual([1]);
    expect(computePaginationRange(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(computePaginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(computePaginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 10]);
    expect(computePaginationRange(5, 10)).toEqual([
      1,
      'ellipsis-start',
      4,
      5,
      6,
      'ellipsis-end',
      10,
    ]);
    expect(computePaginationRange(10, 10)).toEqual([1, 'ellipsis-start', 6, 7, 8, 9, 10]);
  });

  it('emits k-page-change, updates summary, and uses chromatic accent hover border on active page', async () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<style id="pg-accent">:root { --k-color-accent-default: rgb(13, 148, 136); --k-color-accent-hover: rgb(20, 184, 166); --k-color-accent-border-hover: rgb(94, 234, 212); }</style>',
    );
    document.body.innerHTML =
      '<k-pagination total="95" page-size="10" page="1" show-edges show-total></k-pagination>';
    const pg = document.querySelector('k-pagination') as KPagination;
    await pg.updateComplete;

    expect(pg.pageCount).toBe(10);
    expect(pg.shadowRoot!.querySelector('.summary')!.textContent).toBe('1–10 of 95');

    const activeBtn = pg.shadowRoot!.querySelector<HTMLButtonElement>('[aria-current="page"]')!;
    expect(activeBtn.textContent).toBe('1');
    expect(getComputedStyle(activeBtn).backgroundColor).toBe('rgb(13, 148, 136)');

    await userEvent.hover(activeBtn);
    expect(getComputedStyle(activeBtn).borderTopColor).toBe('rgb(94, 234, 212)');
    await userEvent.unhover(activeBtn);

    const onChange = vi.fn();
    pg.addEventListener('k-page-change', (e) =>
      onChange((e as CustomEvent<{ page: number }>).detail.page),
    );

    const nextBtn = pg.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!;
    nextBtn.click();
    await pg.updateComplete;
    expect(pg.page).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
    expect(pg.shadowRoot!.querySelector('.summary')!.textContent).toBe('11–20 of 95');

    document.getElementById('pg-accent')!.remove();
  });
});
