-- Run manually: psql "$DATABASE_URL" -f backend/migrations/001_init.sql

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create table public.anon_usage (
  identity_key text primary key,
  anon_cookie_id text,
  fingerprint_id text not null,
  ip_hash text not null,
  generation_count int not null default 0,
  job_urls_used int not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index anon_usage_cookie_idx on public.anon_usage (anon_cookie_id);
create index anon_usage_fingerprint_idx on public.anon_usage (fingerprint_id);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  tier text not null default 'none',
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table public.generation_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  identity_key text references public.anon_usage(identity_key),
  job_count int not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile (and start the 30-day trial) the instant a user signs up,
-- so trial start never depends on the frontend calling back into our API.
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.anon_usage enable row level security;
alter table public.subscriptions enable row level security;
alter table public.generation_log enable row level security;

-- Backend connects with the service_role key, which bypasses RLS.
-- These policies only cover the case where the frontend reads directly via supabase-js.
create policy "self read profile" on public.profiles for select using (auth.uid() = id);
create policy "self read subscription" on public.subscriptions for select using (auth.uid() = user_id);
