import ts from 'typescript';
import type { Plugin } from 'vite';

const DECORATOR = /^\s*@[A-Za-z_$]/m;

/**
 * Vite's built-in transformer (oxc) only supports legacy decorators. Kerno uses
 * TC39 standard decorators, so files containing them are pre-compiled with the
 * TypeScript compiler — the same one producing the published `dist` output.
 */
export function standardDecorators(): Plugin {
  return {
    name: 'kerno:standard-decorators',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]!;
      if (!/\.[cm]?ts$/.test(file) || file.includes('/node_modules/') || !DECORATOR.test(code)) {
        return null;
      }
      const result = ts.transpileModule(code, {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          useDefineForClassFields: true,
          verbatimModuleSyntax: true,
          sourceMap: true,
          inlineSources: true,
        },
      });
      return { code: result.outputText, map: result.sourceMapText ?? null };
    },
  };
}
