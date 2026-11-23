import { afterEach, describe, expect, it } from 'vitest';
import {
  KernoElement,
  LocalizeController,
  define,
  registerLocale,
  resolveLang,
  setLabels,
  translate,
} from './index.js';
import { zhCN } from './locales/zh-CN.js';

class Greeter extends KernoElement {
  static override template = '<span class="out"></span><button class="btn"></button>';
  readonly localize = new LocalizeController(this);

  get text(): string | null {
    return this.renderRoot.querySelector('.out')!.textContent;
  }

  protected override update(): void {
    this.renderRoot.querySelector('.out')!.textContent = this.localize.term('close');
    setLabels(this.renderRoot, [['.btn', this.localize.term('clear')]]);
  }
}
define('test-i18n-greeter', Greeter);

registerLocale(zhCN);

const originalLang = document.documentElement.getAttribute('lang');
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  document.body.innerHTML = '';
  if (originalLang === null) document.documentElement.removeAttribute('lang');
  else document.documentElement.setAttribute('lang', originalLang);
});

describe('translate', () => {
  it('falls back to English and formats parameterized messages', () => {
    expect(translate('fr', 'close')).toBe('Close');
    expect(translate('fr', 'remove', 'report.pdf')).toBe('Remove report.pdf');
    expect(translate('en', 'formErrors', 1)).toBe('Please fix 1 validation error:');
    expect(translate('en', 'formErrors', 3)).toBe('Please fix 3 validation errors:');
  });

  it('matches regional, script and underscore variants, and keeps sibling fallback with partial overrides', () => {
    expect(translate('zh-CN', 'close')).toBe('关闭');
    expect(translate('ZH-cn', 'close')).toBe('关闭');
    expect(translate('zh_CN', 'close')).toBe('关闭');
    expect(translate('zh', 'close')).toBe('关闭');
    expect(translate('zh-Hans-CN', 'remove', 'a')).toBe('移除 a');

    // A partial override on a regional variant still falls back to a same-language sibling.
    registerLocale({ code: 'zh-TW', messages: { close: '關閉' } });
    expect(translate('zh-TW', 'close')).toBe('關閉');
    expect(translate('zh-TW', 'clear')).toBe('清除');
  });

  it('invalidates cached lookup chains when another copy bumps the shared registry', () => {
    expect(translate('yy-copy', 'close')).toBe('Close');
    const reg = Reflect.get(globalThis, Symbol.for('kerno.i18n.v1')) as {
      locales: Map<string, Record<string, unknown>>;
      version: number;
    };
    reg.locales.set('yy-copy', { close: 'Ylose' });
    reg.version++;
    expect(translate('yy-copy', 'close')).toBe('Ylose');
  });

  it('lets registrations override single messages, including English ones', () => {
    registerLocale({ code: 'en', messages: { close: 'Dismiss' } });
    expect(translate('en', 'close')).toBe('Dismiss');
    expect(translate('fr', 'close')).toBe('Dismiss');
    expect(translate('en', 'clear')).toBe('Clear');
    registerLocale({ code: 'en', messages: { close: 'Close' } });
    expect(translate('en', 'close')).toBe('Close');
  });
});

describe('resolveLang', () => {
  it('uses the nearest lang attribute, crossing shadow roots', () => {
    document.body.innerHTML = '<div lang="zh-CN"><div id="host"></div></div><p id="plain"></p>';
    document.documentElement.setAttribute('lang', 'en-GB');
    const root = document.getElementById('host')!.attachShadow({ mode: 'open' });
    root.innerHTML = '<span id="inner"></span><span lang="ja"><b id="ja"></b></span>';

    expect(resolveLang(root.getElementById('inner')!)).toBe('zh-CN');
    expect(resolveLang(root.getElementById('ja')!)).toBe('ja');
    expect(resolveLang(document.getElementById('plain')!)).toBe('en-GB');
  });

  it('defaults to English when no language is declared', () => {
    document.documentElement.removeAttribute('lang');
    document.body.innerHTML = '<p id="plain"></p>';
    expect(resolveLang(document.getElementById('plain')!)).toBe('en');
  });
});

describe('LocalizeController', () => {
  it('re-renders hosts when a lang attribute changes', async () => {
    document.body.innerHTML = `
      <div id="wrap" lang="en"><test-i18n-greeter></test-i18n-greeter></div>
    `;
    const el = document.querySelector('test-i18n-greeter') as Greeter;
    await el.updateComplete;
    expect(el.text).toBe('Close');

    document.getElementById('wrap')!.setAttribute('lang', 'zh-CN');
    await settle();
    expect(el.text).toBe('关闭');
    expect(el.renderRoot.querySelector('.btn')!.getAttribute('aria-label')).toBe('清除');
  });

  it('re-renders hosts when a locale is registered', async () => {
    document.body.innerHTML = '<test-i18n-greeter lang="xx-test"></test-i18n-greeter>';
    const el = document.querySelector('test-i18n-greeter') as Greeter;
    await el.updateComplete;
    expect(el.text).toBe('Close');

    registerLocale({ code: 'xx-test', messages: { close: 'Xlose' } });
    await settle();
    expect(el.text).toBe('Xlose');
  });

  it('formats dates and numbers for the host language and disconnects observer when idle', async () => {
    document.body.innerHTML = '<test-i18n-greeter lang="de_DE"></test-i18n-greeter>';
    const el = document.querySelector('test-i18n-greeter') as Greeter;
    await el.updateComplete;
    expect(el.localize.number(1234.5)).toBe('1.234,5');
    expect(el.localize.date(new Date(2026, 0, 15), { month: 'long' })).toBe('Januar');

    const reg = Reflect.get(globalThis, Symbol.for('kerno.i18n.v1')) as {
      observer: MutationObserver | null;
      controllers: Set<unknown>;
    };
    expect(reg.observer).not.toBeNull();
    el.remove();
    if (reg.controllers.size === 0) {
      expect(reg.observer).toBeNull();
    }
  });
});
