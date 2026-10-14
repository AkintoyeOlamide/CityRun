-- Paystack payments for delivery (pay when rider arrives)

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
