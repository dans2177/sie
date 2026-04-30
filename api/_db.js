import postgres from 'postgres';

let sql;
let initialized = false;

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
}

export function getSql() {
  if (!sql) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      return null;
    }
    sql = postgres(connectionString, {
      ssl: 'require',
      max: 1,
    });
  }
  return sql;
}

export async function ensureTables() {
  const db = getSql();
  if (!db || initialized) {
    return;
  }

  await db.begin(async (tx) => {
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

  initialized = true;
}
