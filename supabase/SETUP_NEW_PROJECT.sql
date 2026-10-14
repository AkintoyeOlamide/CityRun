-- =============================================================================
-- City Run — Supabase setup for a NEW project
-- Project: https://vfrgawklszvhddrvjjxj.supabase.co
--
-- HOW TO RUN (Supabase Dashboard → SQL Editor):
--   1) Paste and run the ENTIRE file: supabase/schema.sql
--   2) Paste and run THIS ENTIRE file (SETUP_NEW_PROJECT.sql)
--   3) Run the verification query at the bottom
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Business + vendor account types, signup policies
-- (from migrations/fix_business_signup.sql)
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists account_type text not null default 'individual';

alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('individual', 'business', 'vendor'));

alter table public.profiles
  add column if not exists business_name text not null default '';

alter table public.profiles
  add column if not exists nature_of_goods text not null default '';

alter table public.profiles
  add column if not exists business_address jsonb;

alter table public.profiles
  add column if not exists saved_clients jsonb not null default '[]'::jsonb;

alter table public.profiles
  add column if not exists login_password text;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Auto-create profile + wallet on signup (ensure_wallet_on_signup.sql)
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    account_type,
    business_name,
    nature_of_goods,
    business_address
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'individual'),
    coalesce(new.raw_user_meta_data ->> 'business_name', ''),
    coalesce(new.raw_user_meta_data ->> 'nature_of_goods', ''),
    case
      when new.raw_user_meta_data ? 'business_address'
        then new.raw_user_meta_data -> 'business_address'
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.wallets (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.wallets w where w.user_id = u.id
);

-- -----------------------------------------------------------------------------
-- Paystack wallet top-ups (add_wallet_paystack_topups.sql)
-- -----------------------------------------------------------------------------

create table if not exists public.wallet_topup_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists wallet_topup_intents_user_id_idx
  on public.wallet_topup_intents (user_id, created_at desc);

alter table public.wallet_topup_intents enable row level security;

drop policy if exists "wallet_topup_intents_select_own" on public.wallet_topup_intents;
create policy "wallet_topup_intents_select_own"
  on public.wallet_topup_intents for select
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Paystack delivery payment at arrival (add_order_paystack_payments.sql)
-- -----------------------------------------------------------------------------

create table if not exists public.order_payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.delivery_orders (id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  reference text not null unique,
  payer_email text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists order_payment_intents_order_id_idx
  on public.order_payment_intents (order_id, created_at desc);

alter table public.order_payment_intents enable row level security;

drop policy if exists "order_payment_intents_select_public" on public.order_payment_intents;
create policy "order_payment_intents_select_public"
  on public.order_payment_intents for select
  using (true);

alter table public.delivery_orders
  drop constraint if exists delivery_orders_payment_method_check;

alter table public.delivery_orders
  add constraint delivery_orders_payment_method_check
  check (
    payment_method is null
    or payment_method in ('wallet', 'transfer', 'paystack', 'none')
  );

-- -----------------------------------------------------------------------------
-- Realtime for live order tracking + rider alerts
-- (add_delivery_orders_realtime.sql — ignore error if already added)
-- -----------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.delivery_orders;
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- VERIFICATION — run separately; you should see all tables listed
-- -----------------------------------------------------------------------------

-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in (
--     'profiles',
--     'riders',
--     'delivery_orders',
--     'delivery_order_events',
--     'wallets',
--     'wallet_transactions',
--     'wallet_topup_intents',
--     'order_payment_intents',
--     'push_subscriptions'
--   )
-- order by table_name;
