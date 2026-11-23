import { afterEach, describe, expect, it } from 'vitest';
import type { KernoElement } from '@kerno/core';
import './define.js';

type Reflecting = Element & { ariaLabelledByElements?: readonly Element[] | null };

const isKerno = (el: Element): el is KernoElement => el.localName.startsWith('k-');

const mount = async (html: string): Promise<void> => {
  document.body.innerHTML = html;
  const hosts = [...document.body.querySelectorAll('*')].filter(isKerno);
  await Promise.all(hosts.map((el) => el.updateComplete));
};

const inner = (host: string, selector: string): Reflecting =>
  document.querySelector(host)!.shadowRoot!.querySelector(selector)!;

const attr = (host: string, selector: string, name: string): string | null =>
  inner(host, selector).getAttribute(name);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('accessible names reach the focusable inner element', () => {
  it('names checkbox, switch and radio controls by their slotted label', async () => {
    await mount(`
      <k-checkbox>Accept terms</k-checkbox>
      <k-switch>Wi-Fi</k-switch>
      <k-radio-group aria-label="Plan">
        <k-radio value="basic">Basic</k-radio>
      </k-radio-group>
    `);
    expect(attr('k-checkbox', '[role="checkbox"]', 'aria-labelledby')).toBe('label');
    expect(attr('k-switch', '[role="switch"]', 'aria-labelledby')).toBe('label');
    expect(attr('k-radio', '[role="radio"]', 'aria-labelledby')).toBe('label');
    expect(attr('k-radio-group', '[role="radiogroup"]', 'aria-label')).toBe('Plan');
  });

  it('forwards the host aria-label to inputs, textareas and the select combobox', async () => {
    await mount(`
      <k-input aria-label="Email"></k-input>
      <k-textarea aria-label="Bio"></k-textarea>
      <k-number-input aria-label="Quantity"></k-number-input>
      <k-select aria-label="Country"><k-option value="cn">China</k-option></k-select>
    `);
    expect(attr('k-input', 'input', 'aria-label')).toBe('Email');
    expect(attr('k-textarea', 'textarea', 'aria-label')).toBe('Bio');
    expect(attr('k-number-input', 'input', 'aria-label')).toBe('Quantity');
    expect(attr('k-select', '[role="combobox"]', 'aria-label')).toBe('Country');
  });

  it('keeps label-property fallbacks and lets a host aria-label override them', async () => {
    await mount(`
      <k-slider label="Volume"></k-slider>
      <k-rating aria-label="Service quality"></k-rating>
    `);
    expect(attr('k-slider', 'input', 'aria-label')).toBe('Volume');
    expect(attr('k-rating', '[role="slider"]', 'aria-label')).toBe('Service quality');
  });

  it('forwards host aria-label on button, chip, pin-input and range-slider without clobbering chip-group', async () => {
    await mount(`
      <k-button aria-label="Settings"></k-button>
      <k-chip aria-label="Favorite"></k-chip>
      <k-chip-group aria-label="Filter tags"><k-chip value="a">A</k-chip></k-chip-group>
      <k-pin-input aria-label="2FA" length="4"></k-pin-input>
      <k-range-slider aria-label="Price"></k-range-slider>
    `);
    expect(attr('k-button', 'button', 'aria-label')).toBe('Settings');
    expect(attr('k-chip', 'button', 'aria-label')).toBe('Favorite');
    expect(document.querySelector('k-chip-group')!.getAttribute('aria-label')).toBe('Filter tags');
    expect(attr('k-pin-input', '.group', 'aria-label')).toBe('2FA');
    expect(attr('k-pin-input', 'input', 'aria-label')).toBe('2FA character 1 of 4');
    expect(attr('k-range-slider', '.thumb-start', 'aria-label')).toBe('Price minimum');
    expect(attr('k-range-slider', '.thumb-end', 'aria-label')).toBe('Price maximum');
  });

  it('resolves <label for> and aria-labelledby from the light DOM', async () => {
    await mount(`
      <label for="email">Work email</label>
      <k-input id="email"></k-input>
      <span id="cb-label">Subscribe</span>
      <k-checkbox aria-labelledby="cb-label"></k-checkbox>
    `);
    const cases: [Reflecting, Element][] = [
      [inner('k-input', 'input'), document.querySelector('label')!],
      [inner('k-checkbox', '[role="checkbox"]'), document.getElementById('cb-label')!],
    ];
    for (const [el, ref] of cases) {
      if ('ariaLabelledByElements' in Element.prototype) {
        expect(el.ariaLabelledByElements?.[0]).toBe(ref);
      } else {
        expect(el.getAttribute('aria-label')).toBe(ref.textContent?.trim());
      }
    }
  });
});
