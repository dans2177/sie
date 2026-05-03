-- Schema for SIE study app
-- Mirrors api/_db.js ensureTables()

create table if not exists profile_progress (
  profile_id text not null,
  topic_id text not null,
  completed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (profile_id, topic_id)
);

create table if not exists chat_events (
  id bigserial primary key,
  profile_id text not null,
  topic_id text,
  user_message text not null,
  assistant_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_events_profile_created_idx
  on chat_events (profile_id, created_at desc);

create table if not exists topic_chats (
  profile_id text not null,
  topic_id text not null,
  messages jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, topic_id)
);

create table if not exists event_logs (
  id bigserial primary key,
  profile_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_logs_profile_created_idx
  on event_logs (profile_id, created_at desc);

create table if not exists daily_tests (
  profile_id text not null,
  test_date text not null,
  score integer not null,
  total integer not null,
  payload jsonb not null,
  weak_topics jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  primary key (profile_id, test_date)
);

create table if not exists profile_state (
  profile_id text primary key,
  last_topic_id text,
  updated_at timestamptz not null default now()
);

create table if not exists math_drills (
  profile_id text primary key,
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
