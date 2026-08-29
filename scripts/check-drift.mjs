#!/usr/bin/env node
/**
 * Migration drift check.
 *
 * Probes the remote Supabase database (via the REST API + service-role key
 * from .env.local) for every table, key column, and RPC the migrations are
 * expected to have created, and reports anything missing.
 *
 * This is a safety net for the case where a migration file exists in the
 * repo but was never actually applied to the database. The real fix for
 * that class of bug is to apply migrations with `npx supabase db push`
 * (which tracks what has run) rather than by hand — but this script is a
 * quick way to confirm the two are in sync.
 *
 * Usage:  node scripts/check-drift.mjs
 * Exit:   0 = no drift, 1 = something missing (or the check itself failed)
 *
 * When you add a migration that creates a new table / column / function,
 * add it to the EXPECT_* structures below so this stays meaningful.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(join(root, '.env.local'), 'utf8');
  } catch {
    console.error('Could not read .env.local — run this from the project root.');
    process.exit(1);
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const i = line.indexOf('=');
    if (i === -1 || line.trimStart().startsWith('#')) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const H = { apikey: ANON, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' };
const NIL = '00000000-0000-0000-0000-000000000000';

const results = [];
const ok = (m) => results.push(['OK  ', m]);
const miss = (m) => results.push(['MISS', m]);
const info = (m) => results.push(['INFO', m]);

// ---------------------------------------------------------------------------
// Expectations — keep in sync with supabase/migrations/*
// ---------------------------------------------------------------------------

const EXPECT_TABLES = [
  'profiles', 'plant_progress', 'daily_checkins', 'task_library', 'tasks',
  'evening_wrapups', 'water_drop_events', 'affirmations',
  'checkins', 'checkin_questions', 'checkin_question_history', 'checkin_responses',
];

// Only tables that reliably have >= 1 row are worth column-probing via REST
// (an empty table returns [] and we can't see its shape). List the columns
// that matter; a superset in the DB is fine.
const EXPECT_COLUMNS = {
  daily_checkins: [
    'id', 'user_id', 'date', 'energy_level', 'sleep_quality', 'hydration', 'mental_load',
    'steps_done', 'water_done', 'shower_done', 'outside_done', 'meal1_done', 'meal2_done',
    'journaling_done', 'reading_done', 'praying_done', 'meditating_done',
    'writing_done', 'creativity_done', 'created_at', 'updated_at',
  ],
  plant_progress: [
    'user_id', 'total_water_drops', 'displayed_phase', 'phase_advanced_at',
    'created_at', 'updated_at',
  ],
  checkin_questions: ['question_key', 'domain', 'period', 'text_en', 'text_de', 'active'],
};

// [rpc name, args that reach the function body without needing real data].
// A reachable function returns a business-logic error (or 200); a missing
// one returns 404 / PGRST202 / "could not find the function".
const EXPECT_FUNCTIONS = [
  ['complete_task', { p_task_id: NIL, p_user_id: NIL, p_today: '2020-01-01' }],
  ['award_steps', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_goal_completed', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['generate_daily_tasks', { p_user_id: NIL, p_date: '2020-01-01', p_energy_level: 3 }],
  ['is_admin', {}],
  ['admin_list_profiles', {}],
  ['admin_list_checkins', {}],
  ['admin_list_completed_tasks', {}],
  ['admin_list_shared_wrapups', {}],
  ['award_water', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_shower', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_outside', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_meal1', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_meal2', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_journaling', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_reading', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_praying', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_meditating', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_writing', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['award_creativity', { p_user_id: NIL, p_date: '2020-01-01' }],
  ['settle_plant_phase', { p_user_id: NIL }],
  ['submit_checkin', { checkin_period: 'morning', responses: [] }],
];

// Rows that must be present (seed migrations).
const EXPECT_QUESTION_KEYS = [
  'sleep', 'mental_load', 'self_kindness', 'engagement', 'connection', 'identity',
];

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

async function checkTables() {
  for (const t of EXPECT_TABLES) {
    const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, { headers: H });
    if (r.ok) ok(`table ${t}`);
    else miss(`table ${t} — HTTP ${r.status} ${(await r.json().catch(() => ({})))?.message ?? ''}`);
  }
}

async function checkColumns() {
  for (const [t, cols] of Object.entries(EXPECT_COLUMNS)) {
    const r = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, { headers: H });
    if (!r.ok) { miss(`columns ${t} — table not readable`); continue; }
    const rows = await r.json();
    if (!rows.length) { results.push(['SKIP', `columns ${t} — no rows to introspect`]); continue; }
    const present = new Set(Object.keys(rows[0]));
    const missing = cols.filter((c) => !present.has(c));
    if (missing.length) miss(`columns ${t} — missing: ${missing.join(', ')}`);
    else ok(`columns ${t} (${cols.length} checked)`);
  }
}

async function checkFunctions() {
  for (const [fn, args] of EXPECT_FUNCTIONS) {
    const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: H, body: JSON.stringify(args),
    });
    const body = await r.json().catch(() => ({}));
    const code = body?.code ?? '';
    const msg = body?.message ?? '';
    const gone = r.status === 404 || code === 'PGRST202'
      || /could not find the function|does not exist/i.test(msg);
    if (gone) miss(`function ${fn} — ${msg || `HTTP ${r.status}`}`);
    else ok(`function ${fn} (reachable: ${msg || code || `HTTP ${r.status}`})`);
  }
}

async function checkSeeds() {
  const r = await fetch(
    `${URL}/rest/v1/checkin_questions?select=question_key,period,text_en&order=question_key`,
    { headers: H },
  );
  if (!r.ok) { miss('checkin_questions seed — table not readable'); return; }
  const rows = await r.json();
  const keys = new Set(rows.map((x) => x.question_key));
  const missing = EXPECT_QUESTION_KEYS.filter((k) => !keys.has(k));
  if (missing.length) miss(`checkin_questions seed — missing keys: ${missing.join(', ')}`);
  else ok(`checkin_questions seed (${rows.length} rows)`);
  for (const x of rows) info(`  ${x.question_key} · ${x.period} · "${x.text_en}"`);
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nChecking ${URL} for migration drift...\n`);
  await checkTables();
  await checkColumns();
  await checkFunctions();
  await checkSeeds();

  for (const [tag, m] of results) console.log(`[${tag}] ${m}`);

  const problems = results.filter((r) => r[0] === 'MISS');
  if (problems.length === 0) {
    console.log('\n✅ No drift detected — schema matches the migrations.\n');
    process.exit(0);
  }
  console.log(`\n⚠️  ${problems.length} problem(s) found. A migration file is probably not applied.`);
  console.log('   Fix with:  npx supabase db push\n');
  process.exit(1);
}

main().catch((e) => {
  console.error('\nDrift check failed to run:', e);
  process.exit(1);
});
