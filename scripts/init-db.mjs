import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL/POSTGRES_URL. Run `vercel env pull .env.local` first.');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  await sql.begin(async (tx) => {
    await tx`
      create table if not exists study_progress (
        topic_id text primary key,
        completed boolean not null default false,
        notes text,
        updated_at timestamptz not null default now()
      )
    `;

    await tx`
      create table if not exists quiz_attempts (
        id bigserial primary key,
        topic_id text,
        score integer not null,
        total integer not null,
        details jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `;
  });

  const result = await sql`select now() as connected_at`;
  console.log('Database ready. Connected at:', result[0].connected_at);
} catch (error) {
  console.error('Database initialization failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
