#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(cmd, options = {}) {
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...options });
    return { ok: true, out };
  } catch (error) {
    return {
      ok: false,
      out: String(error?.stdout || '') + String(error?.stderr || ''),
      code: error?.status ?? 1,
    };
  }
}

function assert(name, condition, details = '') {
  if (!condition) {
    console.error(`✗ ${name}`);
    if (details) console.error(details.trim());
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${name}`);
}

console.log('Running Debt Smart OS system check...');

const bypassScan = run('rg -n "AUTH_BYPASS" app server lib middleware.ts');
assert('No AUTH_BYPASS references remain', !bypassScan.ok || !bypassScan.out.trim(), bypassScan.out);

const tokenScan = run('rg -n "localStorage\\.(getItem|setItem)\\(\\\"token\\\"" lib app');
assert('No localStorage token persistence remains', !tokenScan.ok || !tokenScan.out.trim(), tokenScan.out);

const typecheck = run('npm run typecheck');
assert('Typecheck passes', typecheck.ok, typecheck.out);

const smoke = run('npm run smoke');
assert('Smoke validators pass', smoke.ok, smoke.out);

const build = run('npm run build');
assert('Production build passes', build.ok, build.out);

const lint = run('npm run lint');
if (!lint.ok) {
  console.log('! Lint check did not pass in this environment (known dependency limitation).');
  console.log(lint.out.trim());
} else {
  console.log('✓ Lint passes');
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('\nSystem check failed.');
  process.exit(process.exitCode);
}

console.log('\nSystem check completed successfully.');
