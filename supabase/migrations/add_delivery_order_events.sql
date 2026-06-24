-- Status history for admin audit trail (run in Supabase SQL Editor)

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

alter table public.delivery_order_events enable row level security;

-- Admins use server API (service role); no public client policies needed yet.
