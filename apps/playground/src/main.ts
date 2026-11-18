import '@kerno/tokens/tokens.css';
import '@kerno/tokens/base.css';
import '@kerno/effects/define';
import '@kerno/primitives/define';
import { fadeIn, scaleIn, slideIn, type KSurface } from '@kerno/effects';
import { applyTheme, createTheme, darkTheme, type BuiltInThemeName } from '@kerno/tokens';

const ocean = createTheme({
  name: 'ocean',
  base: darkTheme,
  tokens: {
    color: {
      accent: {
        default: '#14b8a6',
        hover: '#2dd4bf',
        active: '#0d9488',
        fg: '#042f2e',
        text: '#5eead4',
      },
      bg: { canvas: '#0b1e24', layer: '#11292f', layerAlt: '#163239' },
    },
    radius: { md: '8px', lg: '14px' },
  },
});

let disposeTheme = (): void => {};
const themeButtons = document.querySelectorAll<HTMLElement>('#theme-switch k-button');

function selectTheme(name: string): void {
  disposeTheme();
  disposeTheme = applyTheme(name === 'ocean' ? ocean : (name as BuiltInThemeName));
  themeButtons.forEach((b) =>
    b.setAttribute('variant', b.dataset.theme === name ? 'accent' : 'standard'),
  );
  document.querySelectorAll<KSurface>('k-surface').forEach((s) => s.surface.invalidate());
}

themeButtons.forEach((b) => b.addEventListener('click', () => selectTheme(b.dataset.theme!)));
selectTheme('auto');

// Acrylic reduced-transparency demo
const acrylicSurfaces = document.querySelectorAll<KSurface>('#acrylic-stage k-surface');
document.querySelector('#acrylic-fallback-toggle')!.addEventListener('click', () => {
  acrylicSurfaces.forEach((s) => {
    s.reducedTransparency = !s.reducedTransparency;
  });
});

// Elevation shape toggle & Motion demo
const elevationCards = document.querySelectorAll<KSurface>('#elevation-grid k-surface');
document.querySelector('#elevation-shape-toggle')?.addEventListener('click', () => {
  elevationCards.forEach((s) => {
    s.shape = s.shape === 'chamfer' ? 'rounded' : 'chamfer';
  });
});

document.querySelector('#motion-fade')!.addEventListener('click', () => {
  elevationCards.forEach((card, i) => fadeIn(card, { delay: i * 35 }));
});
document.querySelector('#motion-scale')!.addEventListener('click', () => {
  elevationCards.forEach((card, i) => scaleIn(card, { delay: i * 35 }));
});
document.querySelector('#motion-slide')!.addEventListener('click', () => {
  elevationCards.forEach((card, i) => slideIn(card, { y: 12 }, { delay: i * 35 }));
});

// Form demo
const form = document.querySelector<HTMLFormElement>('#demo-form')!;
const output = document.querySelector<HTMLOutputElement>('#form-output')!;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form, event.submitter);
  output.textContent = JSON.stringify(Object.fromEntries(data));
});
form.addEventListener('reset', () => {
  output.textContent = 'Form reset.';
});

const fieldset = document.querySelector<HTMLFieldSetElement>('#fs')!;
document.querySelector('#fs-toggle')!.addEventListener('click', () => {
  fieldset.disabled = !fieldset.disabled;
});
