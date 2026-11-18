import '@kerno/tokens/tokens.css';
import '@kerno/tokens/base.css';
import '@kerno/primitives/define';
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
}

themeButtons.forEach((b) => b.addEventListener('click', () => selectTheme(b.dataset.theme!)));
selectTheme('auto');

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
