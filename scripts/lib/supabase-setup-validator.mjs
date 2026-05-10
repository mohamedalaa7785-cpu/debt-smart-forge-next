import fs from 'node:fs';
import path from 'node:path';

export const TOP_LEVEL_SQL_PATTERN = /^\d{4}_.+\.sql$/;
export const SUPABASE_MIGRATION_PATTERN = /^\d{14}_.+\.sql$/;

const FULL_RESET_SQL = '0018_full_reset_current_schema.sql';
const EXPECTED_PROJECT_ID = 'qjcrvgbgmumwhzxdbgad';

const REQUIRED_TABLES = [
  'users',
  'profiles',
  'import_batches',
  'clients',
  'documents',
  'client_phones',
  'client_addresses',
  'client_loans',
  'client_notes',
  'assignments',
  'risk_scores',
  'attachments',
  'client_actions',
  'call_logs',
  'followups',
  'osint_results',
  'osint_history',
  'fraud_analysis',
  'legal_cases',
  'audit_logs',
  'debts',
  'payments',
  'collections',
  'admin_users',
  'intelligence',
  'locations',
  'settings',
  'permissions',
];

const REQUIRED_COLUMNS = {
  users: ['id', 'email', 'name', 'role', 'is_super_user', 'created_at'],
  profiles: ['id', 'user_id', 'email', 'username', 'full_name', 'role', 'is_admin', 'is_hidden_admin', 'created_at', 'updated_at'],
  clients: [
    'id',
    'customer_id',
    'name',
    'email',
    'company',
    'image_url',
    'notes',
    'referral',
    'referral_text',
    'referral_image_url',
    'status',
    'import_batch_id',
    'owner_id',
    'team_leader_id',
    'created_by',
    'portfolio_type',
    'domain_type',
    'branch',
    'cycle_start_date',
    'cycle_end_date',
    'updated_at',
    'created_at',
  ],
  client_loans: [
    'id',
    'client_id',
    'loan_type',
    'loan_number',
    'cycle',
    'organization',
    'will_legal',
    'referral_date',
    'collector_percentage',
    'emi',
    'balance',
    'overdue',
    'amount_due',
    'bucket',
    'penalty_enabled',
    'penalty_amount',
    'created_at',
  ],
  osint_results: ['maps_results', 'risk_level', 'fraud_flags', 'last_analyzed_at'],
  documents: ['owner_user_id', 'client_id', 'intelligence_id', 'storage_path', 'mime_type', 'size_bytes', 'embedding'],
};

function hasCreateTable(sql, table) {
  return new RegExp(`create\\s+table\\s+public\\.${table}\\s*\\(`, 'i').test(sql);
}

function hasColumn(sql, table, column) {
  const tableMatch = sql.match(new RegExp(`create\\s+table\\s+public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
  return Boolean(tableMatch && new RegExp(`(^|\\n)\\s*${column}\\s+`, 'i').test(tableMatch[1]));
}

function validateFullResetSql({ supabaseDir, fail, pass }) {
  const resetPath = path.join(supabaseDir, FULL_RESET_SQL);
  if (!fs.existsSync(resetPath)) {
    fail(`Missing consolidated reset SQL: supabase/${FULL_RESET_SQL}`);
    return;
  }

  const sql = fs.readFileSync(resetPath, 'utf8');
  pass(`Found consolidated reset SQL: supabase/${FULL_RESET_SQL}`);

  if (/drop\s+schema\s+(auth|storage)/i.test(sql) || /drop\s+table\s+if\s+exists\s+(auth|storage)\./i.test(sql)) {
    fail(`${FULL_RESET_SQL} must not drop Supabase-managed auth/storage schemas`);
  } else {
    pass('Full reset SQL preserves Supabase-managed auth/storage schemas');
  }

  for (const table of REQUIRED_TABLES) {
    if (!hasCreateTable(sql, table)) fail(`${FULL_RESET_SQL} is missing CREATE TABLE public.${table}`);
  }
  pass(`Full reset SQL includes ${REQUIRED_TABLES.length} required application tables`);

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of columns) {
      if (!hasColumn(sql, table, column)) fail(`${FULL_RESET_SQL} is missing public.${table}.${column}`);
    }
  }
  pass('Full reset SQL includes critical columns used by application code');

  const requiredSnippets = [
    'CREATE TRIGGER on_auth_user_sync_public_identity',
    'CREATE OR REPLACE FUNCTION public.handle_new_user_profile',
    'CREATE OR REPLACE FUNCTION public.can_access_client',
    'ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY',
    'CREATE POLICY clients_select_scoped',
    "'client-documents'",
  ];

  for (const snippet of requiredSnippets) {
    if (!sql.includes(snippet)) fail(`${FULL_RESET_SQL} is missing required snippet: ${snippet}`);
  }
  pass('Full reset SQL includes auth sync, RLS, client access, and storage bucket setup');
}

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
    return { ok: false, logs, warnings, issues };
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
    } else if (projectIdMatch[1].trim() !== EXPECTED_PROJECT_ID) {
      warn(`supabase/config.toml project_id is ${projectIdMatch[1].trim()}, expected ${EXPECTED_PROJECT_ID}`);
    } else {
      pass(`supabase/config.toml project_id is linked to ${EXPECTED_PROJECT_ID}`);
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

  validateFullResetSql({ supabaseDir, fail, pass });

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
