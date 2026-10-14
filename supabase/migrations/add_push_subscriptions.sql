-- Web push subscriptions for City Run phone notifications
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  audience text not null check (audience in ('customer', 'rider')),
  user_id uuid references auth.users (id) on delete cascade,
  rider_id uuid references public.riders (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_audience_idx
  on public.push_subscriptions (audience);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_rider_id_idx
  on public.push_subscriptions (rider_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_api_all"
  on public.push_subscriptions
  for all
  using (true)
  with check (true);
