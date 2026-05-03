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

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  await sql.begin(async (tx) => {
    await tx`
      create table if not exists profile_progress (
        profile_id text not null,
        topic_id text not null,
        completed boolean not null default true,
        updated_at timestamptz not null default now(),
        primary key (profile_id, topic_id)
      )
    `;

    await tx`
      create table if not exists chat_events (
        id bigserial primary key,
        profile_id text not null,
        topic_id text,
        user_message text not null,
        assistant_message text not null,
        created_at timestamptz not null default now()
      )
    `;

    await tx`
      create table if not exists topic_chats (
        profile_id text not null,
        topic_id text not null,
        messages jsonb not null,
        updated_at timestamptz not null default now(),
        primary key (profile_id, topic_id)
      )
    `;

    await tx`
      create table if not exists event_logs (
        id bigserial primary key,
        profile_id text not null,
        event_type text not null,
        payload jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `;

    await tx`
      create table if not exists daily_tests (
        profile_id text not null,
        test_date text not null,
        score integer not null,
        total integer not null,
        payload jsonb not null,
        weak_topics jsonb not null default '[]'::jsonb,
        completed_at timestamptz not null default now(),
        primary key (profile_id, test_date)
      )
    `;

    await tx`
      create table if not exists profile_state (
        profile_id text primary key,
        last_topic_id text,
        updated_at timestamptz not null default now()
      )
    `;

    await tx`
      create table if not exists math_drills (
        profile_id text primary key,
        cards jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now()
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
