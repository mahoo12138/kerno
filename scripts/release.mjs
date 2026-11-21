#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLISH_PACKAGES = ['tokens', 'core', 'effects', 'primitives', 'components'];

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: ROOT,
    stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    ...opts,
  });
}

function readPkg(dir) {
  const file = join(ROOT, 'packages', dir, 'package.json');
  return { file, dir, json: JSON.parse(readFileSync(file, 'utf8')) };
}

function collectExportFiles(exportsMap) {
  const files = new Set();
  const visit = (node) => {
    if (typeof node === 'string') {
      if (!node.endsWith('package.json')) files.add(node.replace(/^\.\//, ''));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'source') continue;
        visit(v);
      }
    }
  };
  visit(exportsMap);
  return [...files];
}

function verifyPackages({ skipCheck = false } = {}) {
  if (!skipCheck) {
    console.log('🔍 Running full quality gate (`pnpm check`)...');
    run('pnpm', ['check']);
    console.log('📊 Running bundle size budget check (`pnpm size:check`)...');
    run('pnpm', ['size:check']);
  }

  console.log('\n🔎 Verifying publishable package metadata, exports, and tarballs...');
  const pkgs = PUBLISH_PACKAGES.map(readPkg);
  const versions = new Set(pkgs.map((p) => p.json.version));
  if (versions.size !== 1) {
    throw new Error(
      `Mismatched package versions across workspace: ${pkgs.map((p) => `${p.json.name}@${p.json.version}`).join(', ')}`,
    );
  }
  const version = [...versions][0];
  const tempDir = mkdtempSync(join(tmpdir(), 'kerno-pack-'));
  const summary = [];

  try {
    for (const { dir, json } of pkgs) {
      const pkgDir = join(ROOT, 'packages', dir);
      if (json.license !== 'MIT') {
        throw new Error(`${json.name}: missing or non-MIT license field`);
      }
      if (json.publishConfig?.access !== 'public') {
        throw new Error(`${json.name}: publishConfig.access must be "public"`);
      }

      const exportedFiles = collectExportFiles(json.exports);
      for (const rel of exportedFiles) {
        const abs = join(pkgDir, rel);
        if (!existsSync(abs)) {
          throw new Error(`${json.name}: exported file missing on disk: ${rel}`);
        }
      }

      const out = run('pnpm', ['pack', '--pack-destination', tempDir], {
        cwd: pkgDir,
        capture: true,
      }).trim();
      const tarball = out.split(/\r?\n/).pop();
      if (!tarball || !existsSync(tarball)) {
        throw new Error(`${json.name}: failed to locate packed tarball from output: ${out}`);
      }

      const entries = run('tar', ['-tzf', tarball], { capture: true })
        .trim()
        .split(/\r?\n/)
        .map((line) => line.replace(/^package\//, ''));
      const entrySet = new Set(entries);

      const leakedTests = entries.filter((f) => /\.test\.(ts|js|d\.ts|js\.map)$/.test(f));
      if (leakedTests.length > 0) {
        throw new Error(
          `${json.name}: test files leaked into tarball: ${leakedTests.slice(0, 5).join(', ')}`,
        );
      }

      for (const rel of exportedFiles) {
        if (!entrySet.has(rel)) {
          throw new Error(`${json.name}: exported file missing from tarball: ${rel}`);
        }
      }

      const packedPkgRaw = run('tar', ['-xOf', tarball, 'package/package.json'], {
        capture: true,
      });
      if (packedPkgRaw.includes('workspace:')) {
        throw new Error(
          `${json.name}: unresolved workspace: protocol found in packed package.json`,
        );
      }

      const tarballBytes = statSync(tarball).size;
      summary.push({
        Package: json.name,
        Version: json.version,
        Files: entries.length,
        Exports: exportedFiles.length,
        Tarball: `${(tarballBytes / 1024).toFixed(1)} KB`,
        Status: 'OK',
      });
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.table(summary);
  console.log(
    `✅ Release verification passed for ${pkgs.length} packages at v${version} (0 missing exports, 0 test leaks, 0 workspace: leaks).`,
  );
}

function bumpSemver(current, spec) {
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(spec)) return spec;
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(current);
  if (!match) throw new Error(`Invalid current semver: ${current}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (spec === 'major') return `${major + 1}.0.0`;
  if (spec === 'minor') return `${major}.${minor + 1}.0`;
  if (spec === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unsupported version bump "${spec}". Use patch | minor | major | x.y.z`);
}

function generateChangelogSection(nextVersion) {
  let lastTag;
  try {
    lastTag = run('git', ['describe', '--tags', '--abbrev=0'], { capture: true }).trim();
  } catch {
    lastTag = '';
  }

  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const rawLog = run('git', ['log', range, '--pretty=format:%h %s'], { capture: true }).trim();
  const lines = rawLog ? rawLog.split(/\r?\n/) : [];

  const features = [];
  const fixes = [];
  const other = [];
  for (const line of lines) {
    const idx = line.indexOf(' ');
    const hash = line.slice(0, idx);
    const subject = line.slice(idx + 1);
    const item = `- ${subject} (\`${hash}\`)`;
    if (/^feat(\([^)]+\))?:/.test(subject)) features.push(item);
    else if (/^fix(\([^)]+\))?:/.test(subject)) fixes.push(item);
    else other.push(item);
  }

  const date = new Date().toISOString().slice(0, 10);
  const out = [`## [${nextVersion}] - ${date}`, ''];
  if (features.length) out.push('### Features', '', ...features, '');
  if (fixes.length) out.push('### Fixes', '', ...fixes, '');
  if (other.length) out.push('### Maintenance', '', ...other, '');
  if (lines.length === 0) out.push('- Release maintenance update.', '');
  return out.join('\n');
}

function versionPackages(spec, { dryRun = false } = {}) {
  if (!spec) {
    throw new Error('Usage: pnpm release:version <patch|minor|major|x.y.z> [--dry-run]');
  }
  const pkgs = PUBLISH_PACKAGES.map(readPkg);
  const current = pkgs[0].json.version;
  const next = bumpSemver(current, spec);
  const section = generateChangelogSection(next);

  console.log(
    `🏷️  Bumping ${pkgs.length} Kerno packages: ${current} → ${next}${dryRun ? ' (dry-run)' : ''}`,
  );
  if (dryRun) {
    console.log('\nPreview CHANGELOG section:\n');
    console.log(section);
    return;
  }

  for (const { file, json } of pkgs) {
    json.version = next;
    writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  }

  const changelogPath = join(ROOT, 'CHANGELOG.md');
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\nAll notable changes to Kerno are documented in this file.\n\n';
  const marker = '## [';
  const insertAt = existing.indexOf(marker);
  const updated =
    insertAt === -1
      ? `${existing.trimEnd()}\n\n${section}\n`
      : `${existing.slice(0, insertAt)}${section}\n${existing.slice(insertAt)}`;
  writeFileSync(changelogPath, updated, 'utf8');

  console.log('✅ Updated packages/*/package.json and CHANGELOG.md.');
  console.log('\nNext steps:');
  console.log(`  1. pnpm release:verify`);
  console.log(`  2. git add -A && git commit -m "chore(release): v${next}"`);
  console.log(`  3. git tag -a v${next} -m "v${next}" && git push --follow-tags`);
}

function publishPackages(args) {
  const execute = args.includes('--execute');
  const dryRun = !execute || args.includes('--dry-run');
  const tagIdx = args.indexOf('--tag');
  const distTag = tagIdx !== -1 && args[tagIdx + 1] ? args[tagIdx + 1] : 'latest';
  const skipVerify = args.includes('--skip-verify');

  if (!skipVerify) {
    verifyPackages({ skipCheck: args.includes('--skip-check') });
  }

  const publishArgs = [
    '-r',
    '--filter',
    './packages/**',
    'publish',
    '--access',
    'public',
    '--tag',
    distTag,
    '--no-git-checks',
  ];
  if (dryRun) {
    publishArgs.push('--dry-run');
    console.log('\n🧪 Running pnpm publish --dry-run (pass --execute to publish to npm)...');
  } else {
    console.log(`\n🚀 Publishing all 5 @kerno/* packages to npm (tag: ${distTag})...`);
  }

  run('pnpm', publishArgs);
}

const [, , command, ...rest] = process.argv;

try {
  if (command === 'verify') {
    verifyPackages({ skipCheck: rest.includes('--skip-check') });
  } else if (command === 'version') {
    versionPackages(
      rest.find((a) => !a.startsWith('--')),
      { dryRun: rest.includes('--dry-run') },
    );
  } else if (command === 'publish') {
    publishPackages(rest);
  } else {
    console.log(
      [
        'Kerno Release CLI',
        '',
        'Usage:',
        '  node scripts/release.mjs verify [--skip-check]',
        '  node scripts/release.mjs version <patch|minor|major|x.y.z> [--dry-run]',
        '  node scripts/release.mjs publish [--dry-run | --execute] [--tag latest|next]',
      ].join('\n'),
    );
    process.exit(command ? 1 : 0);
  }
} catch (err) {
  console.error(`\n❌ Release script failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
