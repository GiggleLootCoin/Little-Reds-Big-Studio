-- RedEMusic.ai session storage
-- Run this in Supabase: Project > SQL Editor > New query > paste > Run

create table if not exists sessions (
  user_id text primary key,
  messages jsonb default '[]',
  genres text[] default '{}',
  dna_model_name text default '',
  groq_model text default 'qwen/qwen3.6-27b',
  is_432hz boolean default false,
  updated_at timestamptz default now()
);

-- This app uses a random per-device id (not real auth) since it's built for
-- personal, single-user use. Anyone with your Supabase URL + anon key could
-- technically read this table, so don't put anything sensitive in it.
-- If you want it locked to just you, add Supabase Auth later and switch
-- user_id to auth.uid(), then enable RLS with a policy like:
--
-- alter table sessions enable row level security;
-- create policy "owner only" on sessions for all
--   using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
