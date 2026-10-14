-- Riders onboarded by admin (run in Supabase SQL Editor)

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists riders_username_idx on public.riders (username);

alter table public.delivery_orders
  add column if not exists rider_id uuid references public.riders (id) on delete set null;

create index if not exists delivery_orders_rider_id_idx
  on public.delivery_orders (rider_id);

alter table public.riders enable row level security;

-- API routes use the publishable/anon key; without policies inserts are blocked.
create policy "riders_api_all"
  on public.riders
  for all
  using (true)
  with check (true);
