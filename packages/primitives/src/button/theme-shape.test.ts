import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, createTheme, generateTokensCss } from '@kerno/tokens';
import './define.js';
import type { KButton } from './index.js';

afterEach(() => {
  document.head.querySelector('style[data-test-tokens]')?.remove();
  document.body.innerHTML = '';
});

describe('shape tokens', () => {
  it('lets a theme round every control through shape.radius.control', async () => {
    const style = document.createElement('style');
    style.dataset.testTokens = '';
    style.textContent = generateTokensCss();
    document.head.append(style);

    document.body.innerHTML = '<div id="square"><k-button>A</k-button></div><div id="round"></div>';
    const round = document.getElementById('round')!;
    round.innerHTML = '<k-button>B</k-button>';
    applyTheme(
      createTheme({ name: 'rounded-controls', tokens: { shape: { radius: { control: '4px' } } } }),
      round,
    );

    const [square, rounded] = [...document.querySelectorAll<KButton>('k-button')];
    await Promise.all([square!.updateComplete, rounded!.updateComplete]);
    const radius = (el: KButton): string =>
      getComputedStyle(el.shadowRoot!.querySelector('.base')!).borderTopLeftRadius;
    expect(radius(square!)).toBe('0px');
    expect(radius(rounded!)).toBe('4px');
  });
});
