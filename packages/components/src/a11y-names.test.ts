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

describe('composite component accessible name forwarding', () => {
  it('forwards host aria-label to pickers, comboboxes, upload and segmented control', async () => {
    await mount(`
      <k-autocomplete aria-label="Framework"></k-autocomplete>
      <k-multi-select aria-label="Skills"></k-multi-select>
      <k-tags-input aria-label="Topics"></k-tags-input>
      <k-date-picker aria-label="Start date"></k-date-picker>
      <k-time-picker aria-label="Start time"></k-time-picker>
      <k-cascader aria-label="Location"></k-cascader>
      <k-color-input aria-label="Brand color"></k-color-input>
      <k-segmented-control aria-label="View mode"><k-option value="a">A</k-option></k-segmented-control>
      <k-upload aria-label="Attachments"></k-upload>
    `);
    expect(attr('k-autocomplete', 'input', 'aria-label')).toBe('Framework');
    expect(attr('k-multi-select', 'input', 'aria-label')).toBe('Skills');
    expect(attr('k-tags-input', 'input', 'aria-label')).toBe('Topics');
    expect(attr('k-date-picker', '.trigger', 'aria-label')).toBe('Start date');
    expect(attr('k-time-picker', '.trigger', 'aria-label')).toBe('Start time');
    expect(attr('k-cascader', '.trigger', 'aria-label')).toBe('Location');
    expect(attr('k-color-input', 'input', 'aria-label')).toBe('Brand color');
    expect(attr('k-segmented-control', '[role="radiogroup"]', 'aria-label')).toBe('View mode');
    expect(attr('k-upload', '.dropzone', 'aria-label')).toBe('Attachments');
  });

  it('forwards <label for> to composite form controls and respects copy-button slotted labels', async () => {
    await mount(`
      <label for="dob">Birthday</label>
      <k-date-picker id="dob"></k-date-picker>
      <k-copy-button id="slotted" value="abc">Copy API key</k-copy-button>
      <k-copy-button id="bare" value="abc"></k-copy-button>
      <k-copy-button id="named" aria-label="Copy token" value="abc"></k-copy-button>
    `);
    const trigger = inner('k-date-picker', '.trigger');
    const label = document.querySelector('label')!;
    if ('ariaLabelledByElements' in Element.prototype) {
      expect(trigger.ariaLabelledByElements?.[0]).toBe(label);
    } else {
      expect(trigger.getAttribute('aria-label')).toBe('Birthday');
    }

    expect(attr('#slotted', 'button', 'aria-label')).toBeNull();
    expect(attr('#bare', 'button', 'aria-label')).toBe('Copy');
    expect(attr('#named', 'button', 'aria-label')).toBe('Copy token');
  });
});
