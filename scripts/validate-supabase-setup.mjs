#!/usr/bin/env node
import { validateSupabaseSetup } from './lib/supabase-setup-validator.mjs';

const result = validateSupabaseSetup(process.cwd());

for (const line of result.logs) console.log(`✅ ${line}`);
for (const line of result.warnings ?? []) console.warn(`⚠️ ${line}`);
for (const line of result.issues) console.error(`❌ ${line}`);

if (!result.ok) {
  console.error('\nSupabase setup validation failed.');
  process.exitCode = 1;
} else {
  console.log('\nSupabase setup validation passed.');
}
