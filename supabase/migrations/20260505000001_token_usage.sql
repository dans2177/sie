-- Add token_usage table tracking Anthropic API spend per profile/endpoint.
-- Idempotent: safe to run on databases where ensureTables() already created it.

create table if not exists token_usage (
  id bigserial primary key,
  profile_id text not null,
  endpoint text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_creation_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists token_usage_profile_day_idx
  on token_usage (profile_id, created_at desc);
