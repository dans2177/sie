import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';

const databaseUrl =
  process.env.SUPABASE_DB_URL_DIRECT ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error(
    'Missing SUPABASE_DB_URL / DATABASE_URL / POSTGRES_URL. Run `vercel env pull .env.local` first.',
  );
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });

try {
  // Lightweight migration ledger so we never re-apply a file that already ran.
  await sql`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  // Bootstrap: if the ledger is empty but core tables already exist (created by
  // ensureTables() at runtime), back-fill the init migration as already applied
  // so we don't attempt to re-run historical DDL on a live database.
  const ledgerCount = Number((await sql`select count(*)::int as n from schema_migrations`)[0].n);
  if (ledgerCount === 0) {
    const exists = await sql`
      select to_regclass('public.profile_progress') as t
    `;
    if (exists[0]?.t) {
      const initFile = '20260503180054_init_schema.sql';
      console.log(`bootstrap: marking ${initFile} as already applied (tables already exist)`);
      await sql`insert into schema_migrations (filename) values (${initFile}) on conflict do nothing`;
    }
  }

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.warn('No .sql migrations found in', migrationsDir);
  }

  const applied = new Set(
    (await sql`select filename from schema_migrations`).map((r) => r.filename),
  );

  let ran = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`skip  ${filename} (already applied)`);
      continue;
    }
    const ddl = await readFile(join(migrationsDir, filename), 'utf8');
    console.log(`apply ${filename}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`insert into schema_migrations (filename) values (${filename})`;
    });
    ran += 1;
  }

  const result = await sql`select now() as connected_at`;
  console.log(`Database ready. Applied ${ran} new migration(s). Connected at:`, result[0].connected_at);
} catch (error) {
  console.error('Database initialization failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
