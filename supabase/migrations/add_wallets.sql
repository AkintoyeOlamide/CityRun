-- Customer wallets for City Run (NGN balances stored in kobo)

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
  add column if not exists fare_kobo bigint,
  add column if not exists payment_method text check (payment_method in ('wallet', 'none')),
  add column if not exists wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

create policy "wallets_select_own"
  on public.wallets for select
  using (auth.uid() = user_id);

create policy "wallet_transactions_select_own"
  on public.wallet_transactions for select
  using (auth.uid() = user_id);
