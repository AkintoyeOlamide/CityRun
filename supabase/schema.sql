-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/_/sql

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  account_type text not null default 'individual'
    check (account_type in ('individual', 'business')),
  business_name text not null default '',
  nature_of_goods text not null default '',
  business_address jsonb,
  saved_clients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  phone text not null default '',
  login_password text,
  last_location jsonb,
  location_updated_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists riders_username_idx on public.riders (username);

alter table public.riders enable row level security;

create policy "riders_api_all"
  on public.riders
  for all
  using (true)
  with check (true);

create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('send', 'receive', 'store-pickup')),
  status text not null default 'pending' check (
    status in (
      'pending',
      'confirmed',
      'rider_assigned',
      'en_route_pickup',
      'picked_up',
      'in_transit',
      'arrived_at_dropoff',
      'delivered',
      'cancelled'
    )
  ),
  pickup jsonb not null,
  dropoff jsonb not null,
  item_description text not null,
  item_size text not null default 'medium' check (item_size in ('small', 'medium', 'large')),
  notes text not null default '',
  contact_name text not null,
  contact_phone text not null,
  rider_name text,
  rider_phone text,
  rider_id uuid references public.riders (id) on delete set null,
  rider_location jsonb,
  item_photo_url text,
  proof_of_delivery_url text,
  user_id uuid references auth.users (id) on delete set null,
  fare_kobo bigint,
  payment_method text check (payment_method in ('wallet', 'none')),
  wallet_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_orders_status_idx on public.delivery_orders (status);
create index if not exists delivery_orders_created_at_idx on public.delivery_orders (created_at desc);

create index if not exists delivery_orders_user_id_idx on public.delivery_orders (user_id);
create index if not exists delivery_orders_rider_id_idx on public.delivery_orders (rider_id);

create table if not exists public.delivery_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.delivery_orders (id) on delete cascade,
  status text not null,
  actor text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists delivery_order_events_order_id_idx
  on public.delivery_order_events (order_id, created_at desc);

-- Customer wallets (optional — orders work without wallet balance)
create table if not exists public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('topup', 'debit', 'refund', 'adjustment')),
  amount_kobo bigint not null,
  balance_after_kobo bigint not null,
  order_id uuid references public.delivery_orders (id) on delete set null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_id_idx
  on public.wallet_transactions (user_id, created_at desc);

alter table public.delivery_orders
  drop constraint if exists delivery_orders_wallet_transaction_id_fkey;

alter table public.delivery_orders
  add column if not exists rider_phone text,
  add column if not exists fare_kobo bigint,
  add column if not exists payment_method text check (payment_method in ('wallet', 'none')),
  add column if not exists wallet_transaction_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'delivery_orders_wallet_transaction_id_fkey'
  ) then
    alter table public.delivery_orders
      add constraint delivery_orders_wallet_transaction_id_fkey
      foreign key (wallet_transaction_id)
      references public.wallet_transactions (id)
      on delete set null;
  end if;
end $$;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

create policy "wallets_select_own"
  on public.wallets for select
  using (auth.uid() = user_id);

create policy "wallet_transactions_select_own"
  on public.wallet_transactions for select
  using (auth.uid() = user_id);

alter table public.delivery_order_events enable row level security;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

alter table public.delivery_orders enable row level security;

create policy "delivery_orders_select_own"
  on public.delivery_orders for select
  using (auth.uid() = user_id or user_id is null);

create policy "delivery_orders_insert_own"
  on public.delivery_orders for insert
  with check (user_id is null or auth.uid() = user_id);

create policy "delivery_orders_update"
  on public.delivery_orders for update
  using (true);

create policy "delivery_order_events_insert_own"
  on public.delivery_order_events for insert
  with check (
    exists (
      select 1
      from public.delivery_orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

create policy "delivery_order_events_select_own"
  on public.delivery_order_events for select
  using (
    exists (
      select 1
      from public.delivery_orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

-- Realtime: enable in Dashboard → Database → Replication → delivery_orders
-- Or run (if publication exists):
-- alter publication supabase_realtime add table public.delivery_orders;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, account_type, business_name, nature_of_goods)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'individual'),
    coalesce(new.raw_user_meta_data ->> 'business_name', ''),
    coalesce(new.raw_user_meta_data ->> 'nature_of_goods', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

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
