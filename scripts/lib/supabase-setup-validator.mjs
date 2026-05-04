import fs from 'node:fs';
import path from 'node:path';

export const TOP_LEVEL_SQL_PATTERN = /^\d{4}_.+\.sql$/;
export const SUPABASE_MIGRATION_PATTERN = /^\d{14}_.+\.sql$/;

export function validateSupabaseSetup(projectRoot = process.cwd()) {
  const issues = [];
  const warnings = [];
  const logs = [];

  const supabaseDir = path.join(projectRoot, 'supabase');
  const migrationsDir = path.join(supabaseDir, 'migrations');

  const fail = (msg) => issues.push(msg);
  const warn = (msg) => warnings.push(msg);
  const pass = (msg) => logs.push(msg);

  if (!fs.existsSync(supabaseDir)) {
    fail('Missing supabase/ directory');
    return { ok: false, logs, issues };
  }
  pass('supabase/ directory exists');

  const configPath = path.join(supabaseDir, 'config.toml');
  if (!fs.existsSync(configPath)) fail('Missing supabase/config.toml');
  else {
    pass('supabase/config.toml exists');
    const configText = fs.readFileSync(configPath, 'utf8');
    const projectIdMatch = configText.match(/^project_id\s*=\s*"(.*)"\s*$/m);
    if (!projectIdMatch) {
      fail('supabase/config.toml must define project_id');
    } else if (!projectIdMatch[1].trim()) {
      warn('supabase/config.toml project_id is empty; run `supabase link --project-ref <PROJECT_REF>`');
    }
  }

  if (!fs.existsSync(migrationsDir)) fail('Missing supabase/migrations/ directory');
  else pass('supabase/migrations/ directory exists');

  const topSql = fs.readdirSync(supabaseDir)
    .filter((name) => TOP_LEVEL_SQL_PATTERN.test(name))
    .sort();

  if (topSql.length === 0) fail('No top-level numbered SQL files found in supabase/');
  else pass(`Found ${topSql.length} top-level numbered SQL files`);

  const numbers = topSql.map((n) => Number(n.slice(0, 4)));
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      fail(`Gap or disorder in numbered SQL sequence: ${topSql[i - 1]} -> ${topSql[i]}`);
      break;
    }
  }
  if (numbers.length > 0 && numbers[0] !== 1) fail(`Numbered SQL files should start from 0001, found ${topSql[0]}`);
  else if (numbers.length > 0) pass(`Numbered SQL sequence starts correctly at ${topSql[0]}`);

  if (fs.existsSync(migrationsDir)) {
    const allMigrationEntries = fs.readdirSync(migrationsDir).sort();
    const migrationFiles = allMigrationEntries
      .filter((name) => SUPABASE_MIGRATION_PATTERN.test(name))
      .sort();

    const invalidEntries = allMigrationEntries.filter((name) => !SUPABASE_MIGRATION_PATTERN.test(name));
    if (invalidEntries.length > 0) fail(`Invalid migration filename(s): ${invalidEntries.join(', ')}`);

    if (migrationFiles.length === 0) fail('No valid timestamp migrations found in supabase/migrations/');
    else pass(`Found ${migrationFiles.length} timestamp migrations in supabase/migrations/`);

    const seen = new Set();
    for (const file of migrationFiles) {
      const stamp = file.slice(0, 14);
      if (seen.has(stamp)) {
        fail(`Duplicate migration date stamp: ${stamp}`);
        break;
      }
      seen.add(stamp);
    }
  }

  return { ok: issues.length === 0, logs, warnings, issues };
}
