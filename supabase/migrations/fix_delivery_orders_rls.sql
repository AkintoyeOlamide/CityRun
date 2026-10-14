-- Fix RLS so signed-in customers can place orders without the service role key.
-- Safe to run even if delivery_order_events was never created.
-- Run in Supabase Dashboard → SQL Editor.

-- ---------------------------------------------------------------------------
-- delivery_orders insert policy
-- ---------------------------------------------------------------------------
drop policy if exists "delivery_orders_insert_own" on public.delivery_orders;

create policy "delivery_orders_insert_own"
  on public.delivery_orders for insert
  with check (user_id is null or auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Order status history table (optional audit trail — create if missing)
-- ---------------------------------------------------------------------------
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

drop policy if exists "delivery_order_events_insert_own" on public.delivery_order_events;
drop policy if exists "delivery_order_events_select_own" on public.delivery_order_events;

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
