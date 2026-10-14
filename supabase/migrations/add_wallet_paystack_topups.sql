-- Paystack-backed wallet top-ups (bank card / transfer via Paystack)

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

create policy "wallet_topup_intents_select_own"
  on public.wallet_topup_intents for select
  using (auth.uid() = user_id);
