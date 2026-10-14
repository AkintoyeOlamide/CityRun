-- Auth profiles + user-linked orders
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists delivery_orders_user_id_idx
  on public.delivery_orders (user_id);

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

-- Replace open order policies with user-scoped reads (riders use service role API)
drop policy if exists "delivery_orders_select" on public.delivery_orders;

create policy "delivery_orders_select_own"
  on public.delivery_orders for select
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "delivery_orders_insert" on public.delivery_orders;

create policy "delivery_orders_insert_own"
  on public.delivery_orders for insert
  with check (user_id is null or auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
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
