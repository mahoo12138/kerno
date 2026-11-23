import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { registerLocale } from '@kerno/core';
import { zhCN } from '@kerno/core/locales/zh-CN';
import '@kerno/primitives/define';
import './define.js';
import type { KernoElement } from '@kerno/core';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const mount = async (html: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div id="wrap" lang="zh-CN">${html}</div>`;
  const hosts = [...document.querySelectorAll('*')].filter((el) => el.localName.startsWith('k-'));
  await Promise.all(hosts.map((el) => (el as KernoElement).updateComplete));
  return document.getElementById('wrap')!;
};

const shadow = (selector: string, inner: string): Element =>
  document.querySelector(selector)!.shadowRoot!.querySelector(inner)!;

beforeAll(() => registerLocale(zhCN));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('components follow the page language', () => {
  it('localizes labels, placeholders and validation messages', async () => {
    await mount(`
      <k-dialog label="标题"></k-dialog>
      <k-input clearable value="x"></k-input>
      <k-select required><k-option value="a">A</k-option></k-select>
      <k-date-picker></k-date-picker>
      <k-pagination total="95"></k-pagination>
      <k-empty-state></k-empty-state>
      <k-upload max-size="2048" max-files="3"></k-upload>
    `);
    expect(shadow('k-dialog', '.close-btn').getAttribute('aria-label')).toBe('关闭');
    expect(shadow('k-input', '.clear-btn').getAttribute('aria-label')).toBe('清除');
    expect(shadow('k-select', '.display').textContent).toBe('请选择…');
    expect(shadow('k-date-picker', '.display').textContent).toBe('选择日期');
    expect(shadow('k-pagination', '.nav').getAttribute('aria-label')).toBe('分页');
    expect(shadow('k-empty-state', '.title').textContent).toBe('暂无数据');
    expect(shadow('k-upload', '.drop-hint').textContent).toBe('最大 2.0 KB · 最多 3 个文件');

    const select = document.querySelector('k-select') as HTMLElement & {
      validationMessage: string;
    };
    expect(select.validationMessage).toBe('请从列表中选择一项。');
  });

  it('keeps explicit text props over localized defaults', async () => {
    await mount('<k-select placeholder="Pick a fruit"></k-select>');
    expect(shadow('k-select', '.display').textContent).toBe('Pick a fruit');
  });

  it('switches language at runtime, including open overlays and dynamic subtrees', async () => {
    const wrap = await mount(`
      <k-dialog label="Title"></k-dialog>
      <k-command open><k-command-item value="a">Alpha</k-command-item></k-command>
      <k-autocomplete open></k-autocomplete>
      <k-color-picker></k-color-picker>
      <k-form><k-input name="q" required></k-input></k-form>
    `);
    const picker = document.querySelector('k-color-picker') as KernoElement & {
      swatches: readonly string[];
    };
    picker.swatches = ['#0d9488'];
    await picker.updateComplete;
    const form = document.querySelector('k-form') as KernoElement & { validate(): void };
    form.validate();

    expect(shadow('k-dialog', '.close-btn').getAttribute('aria-label')).toBe('关闭');
    expect(shadow('k-command', '.footer-count').textContent).toBe('1 条命令');
    expect(shadow('k-autocomplete', '.empty').textContent).toBe('无匹配结果');
    expect(shadow('k-color-picker', '.swatch').getAttribute('aria-label')).toBe('选择颜色 #0d9488');
    expect(shadow('k-form', '.summary-title').textContent).toBe('请修正以下 1 处错误：');

    wrap.setAttribute('lang', 'en');
    await settle();
    expect(shadow('k-dialog', '.close-btn').getAttribute('aria-label')).toBe('Close');
    expect(shadow('k-command', '.footer-count').textContent).toBe('1 command');
    expect(shadow('k-autocomplete', '.empty').textContent).toBe('No matches found');
    expect(shadow('k-color-picker', '.swatch').getAttribute('aria-label')).toBe(
      'Select color #0d9488',
    );
    expect(shadow('k-form', '.summary-title').textContent).toBe('Please fix 1 validation error:');
  });
});
