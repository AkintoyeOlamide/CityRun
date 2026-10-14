-- Fix: this project already had a `profiles` table from another app (employee records).
-- schema.sql uses CREATE TABLE IF NOT EXISTS, so City Run columns were never created.
-- Run this once in Supabase SQL Editor, then run SETUP_NEW_PROJECT.sql if you have not already.

alter table if exists public.profiles rename to legacy_employee_profiles;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  account_type text not null default 'individual'
    check (account_type in ('individual', 'business', 'vendor')),
  business_name text not null default '',
  nature_of_goods text not null default '',
  business_address jsonb,
  saved_clients jsonb not null default '[]'::jsonb,
  login_password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backfill profiles for auth users created during failed signups
insert into public.profiles (id, full_name, phone, account_type)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(u.raw_user_meta_data ->> 'account_type', 'individual')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.wallets (user_id)
select u.id
from auth.users u
where not exists (select 1 from public.wallets w where w.user_id = u.id);
