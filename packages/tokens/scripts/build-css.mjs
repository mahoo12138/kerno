// Emits the static stylesheets from the compiled token sources.
import { mkdir, writeFile } from 'node:fs/promises';
import { generateBaseCss, generateTokensCss } from '../dist/index.js';

const outDir = new URL('../dist/css/', import.meta.url);
await mkdir(outDir, { recursive: true });
await writeFile(new URL('tokens.css', outDir), generateTokensCss());
await writeFile(new URL('base.css', outDir), generateBaseCss());
console.log('[@kerno/tokens] wrote dist/css/tokens.css, dist/css/base.css');
