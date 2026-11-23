#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const REPORTS_DIR = join(ROOT, 'reports');
const BUDGETS_PATH = join(__dirname, 'size-budgets.json');

const CHECK_MODE = process.argv.includes('--check');
const SKIP_COMPONENTS = process.argv.includes('--packages-only');

const WORKSPACE_PACKAGES = ['tokens', 'core', 'effects', 'primitives', 'components'];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function measureBuffer(buf) {
  const gzip = gzipSync(buf, { level: 9 }).length;
  const brotli = brotliCompressSync(buf, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
  return { raw: buf.length, gzip, brotli };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function bundleEntry(entryPath, { externalizeWorkspace = true } = {}) {
  const result = await build({
    root: ROOT,
    logLevel: 'silent',
    configFile: false,
    resolve: {
      // Measure compiled npm dist/ output (not raw TS sources)
      conditions: ['import', 'module', 'browser', 'default'],
    },
    build: {
      write: false,
      minify: true,
      sourcemap: false,
      target: 'es2022',
      lib: {
        entry: entryPath,
        formats: ['es'],
        fileName: 'bundle',
      },
      rollupOptions: {
        external: (id) => {
          if (!externalizeWorkspace) return false;
          return id === 'tslib' || id.startsWith('@kerno/');
        },
      },
    },
  });

  const outputs = Array.isArray(result) ? result : [result];
  const chunks = new Map();
  for (const out of outputs) {
    if (!('output' in out)) continue;
    for (const chunk of out.output) {
      if (chunk.type === 'chunk') chunks.set(chunk.fileName, chunk);
    }
  }

  // Initial footprint: entry chunks plus everything they import statically. Chunks only
  // reachable through a dynamic `import()` load on demand and are reported as `lazyGzip`.
  const eager = new Set();
  const queue = [...chunks.values()].filter((c) => c.isEntry).map((c) => c.fileName);
  while (queue.length > 0) {
    const fileName = queue.pop();
    if (eager.has(fileName) || !chunks.has(fileName)) continue;
    eager.add(fileName);
    queue.push(...chunks.get(fileName).imports);
  }
  let eagerCode = '';
  let lazyCode = '';
  for (const [fileName, chunk] of chunks) {
    if (eager.has(fileName)) eagerCode += chunk.code;
    else lazyCode += chunk.code;
  }
  const lazyGzip = lazyCode ? measureBuffer(Buffer.from(lazyCode, 'utf8')).gzip : 0;
  return { ...measureBuffer(Buffer.from(eagerCode, 'utf8')), lazyGzip };
}

async function runBatched(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const budgets = readJson(BUDGETS_PATH);
  const pkgEntries = [];
  const componentTargets = [];

  for (const dir of WORKSPACE_PACKAGES) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    const pkg = readJson(pkgPath);
    const mainExport = pkg.exports?.['.']?.default;
    if (mainExport) {
      pkgEntries.push({
        name: pkg.name,
        type: 'js',
        entry: join(PACKAGES_DIR, dir, mainExport),
      });
    }

    for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
      if (subpath === '.' || subpath === './package.json' || subpath.endsWith('/define')) continue;
      if (typeof target === 'string' && target.endsWith('.css')) {
        pkgEntries.push({
          name: `${pkg.name}/${subpath.replace(/^\.\//, '')}`,
          type: 'css',
          entry: join(PACKAGES_DIR, dir, target),
        });
        continue;
      }
      if (typeof target === 'object' && target !== null && typeof target.default === 'string') {
        if (dir === 'effects' || dir === 'primitives' || dir === 'components') {
          componentTargets.push({
            name: `${pkg.name}/${subpath.replace(/^\.\//, '')}`,
            pkg: pkg.name,
            entry: join(PACKAGES_DIR, dir, target.default),
          });
        }
      }
    }
  }

  // 1. Measure full package entries & CSS assets
  const packageResults = [];
  for (const item of pkgEntries) {
    const metrics =
      item.type === 'css'
        ? measureBuffer(readFileSync(item.entry))
        : await bundleEntry(item.entry, { externalizeWorkspace: true });
    const budget = budgets.packages?.[item.name] ?? null;
    packageResults.push({
      name: item.name,
      ...metrics,
      budget,
      pass: budget === null ? true : metrics.gzip <= budget,
    });
  }

  // 2. Measure representative standalone (zero-external) adoption bundles
  const standaloneSpecs = [
    { name: '@kerno/primitives/button', entry: 'packages/primitives/dist/button/index.js' },
    { name: '@kerno/primitives/input', entry: 'packages/primitives/dist/input/index.js' },
    { name: '@kerno/components/dialog', entry: 'packages/components/dist/dialog/index.js' },
    {
      name: '@kerno/components/date-picker',
      entry: 'packages/components/dist/date-picker/index.js',
    },
    { name: '@kerno/components/data-grid', entry: 'packages/components/dist/data-grid/index.js' },
    {
      name: '@kerno/components/color-picker',
      entry: 'packages/components/dist/color-picker/index.js',
    },
  ];
  const standaloneResults = await runBatched(standaloneSpecs, 4, async (spec) => {
    const metrics = await bundleEntry(join(ROOT, spec.entry), { externalizeWorkspace: false });
    const budget = budgets.standalone?.[spec.name] ?? null;
    return {
      name: spec.name,
      ...metrics,
      budget,
      pass: budget === null ? true : metrics.gzip <= budget,
    };
  });

  // 3. Measure every individual subpath module (isolated)
  const maxCompBudget = budgets.maxComponentGzipBytes ?? 14336;
  const componentResults = SKIP_COMPONENTS
    ? []
    : await runBatched(componentTargets, 6, async (item) => {
        const metrics = await bundleEntry(item.entry, { externalizeWorkspace: true });
        const customBudget = budgets.components?.[item.name] ?? maxCompBudget;
        return {
          name: item.name,
          pkg: item.pkg,
          ...metrics,
          budget: customBudget,
          pass: metrics.gzip <= customBudget,
        };
      });

  componentResults.sort((a, b) => b.gzip - a.gzip);

  const failures = [
    ...packageResults.filter((r) => !r.pass),
    ...standaloneResults.filter((r) => !r.pass),
    ...componentResults.filter((r) => !r.pass),
  ];

  // Build Markdown report
  const mdLines = [
    '# Kerno Bundle Size Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Package Entries (Workspace Peer External)',
    '',
    '| Package / Asset | Raw | Gzip | Brotli | Gzip Budget | Status |',
    '| --- | ---: | ---: | ---: | ---: | :---: |',
    ...packageResults.map(
      (r) =>
        `| \`${r.name}\` | ${formatKb(r.raw)} | **${formatKb(r.gzip)}** | ${formatKb(r.brotli)} | ${r.budget ? formatKb(r.budget) : '—'} | ${r.pass ? '✅' : '❌'} |`,
    ),
    '',
    '## Standalone Single-Component Footprint (All Deps Bundled)',
    '',
    '| Entry | Raw | Gzip | Brotli | Lazy Gzip | Gzip Budget | Status |',
    '| --- | ---: | ---: | ---: | ---: | ---: | :---: |',
    ...standaloneResults.map(
      (r) =>
        `| \`${r.name}\` | ${formatKb(r.raw)} | **${formatKb(r.gzip)}** | ${formatKb(r.brotli)} | ${r.lazyGzip ? formatKb(r.lazyGzip) : '—'} | ${r.budget ? formatKb(r.budget) : '—'} | ${r.pass ? '✅' : '❌'} |`,
    ),
  ];

  if (componentResults.length > 0) {
    const avgGzip = componentResults.reduce((sum, r) => sum + r.gzip, 0) / componentResults.length;
    mdLines.push(
      '',
      `## Per-Module Subpath Footprint (${componentResults.length} Modules, Avg ${formatKb(avgGzip)} Gzip, Ceiling ${formatKb(maxCompBudget)})`,
      '',
      '| Subpath | Raw | Gzip | Brotli | Budget | Status |',
      '| --- | ---: | ---: | ---: | ---: | :---: |',
      ...componentResults.map(
        (r) =>
          `| \`${r.name}\` | ${formatKb(r.raw)} | ${formatKb(r.gzip)} | ${formatKb(r.brotli)} | ${formatKb(r.budget)} | ${r.pass ? '✅' : '❌'} |`,
      ),
    );
  }

  const markdown = mdLines.join('\n') + '\n';
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(join(REPORTS_DIR, 'bundle-size.md'), markdown, 'utf8');
  writeFileSync(
    join(REPORTS_DIR, 'bundle-size.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        packages: packageResults,
        standalone: standaloneResults,
        components: componentResults,
        passed: failures.length === 0,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }

  // Concise console summary
  console.log('\n📦 Kerno Package Sizes (minified ESM / CSS):');
  console.table(
    packageResults.map((r) => ({
      Package: r.name,
      Raw: formatKb(r.raw),
      Gzip: formatKb(r.gzip),
      Brotli: formatKb(r.brotli),
      Budget: r.budget ? formatKb(r.budget) : '—',
      Status: r.pass ? 'PASS' : 'FAIL',
    })),
  );

  console.log('🚀 Standalone Single-Component Footprint (self-contained):');
  console.table(
    standaloneResults.map((r) => ({
      Entry: r.name,
      Raw: formatKb(r.raw),
      Gzip: formatKb(r.gzip),
      Brotli: formatKb(r.brotli),
      Lazy: r.lazyGzip ? formatKb(r.lazyGzip) : '—',
      Budget: r.budget ? formatKb(r.budget) : '—',
      Status: r.pass ? 'PASS' : 'FAIL',
    })),
  );

  if (componentResults.length > 0) {
    console.log(`🔎 Top 10 Largest Subpath Modules (of ${componentResults.length} analyzed):`);
    console.table(
      componentResults.slice(0, 10).map((r) => ({
        Module: r.name,
        Raw: formatKb(r.raw),
        Gzip: formatKb(r.gzip),
        Brotli: formatKb(r.brotli),
        Budget: formatKb(r.budget),
        Status: r.pass ? 'PASS' : 'FAIL',
      })),
    );
  }

  console.log(`📝 Reports written to reports/bundle-size.md and reports/bundle-size.json`);

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} bundle size budget violation(s):`);
    for (const f of failures) {
      console.error(`  - ${f.name}: ${formatKb(f.gzip)} gzip exceeds budget ${formatKb(f.budget)}`);
    }
    if (CHECK_MODE) process.exit(1);
  } else {
    console.log('✅ All bundle size budgets passed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
