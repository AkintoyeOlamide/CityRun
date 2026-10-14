-- Run this once in Supabase → SQL Editor if vendor/business features fail with
-- "column profiles.business_address does not exist"

-- 1) Account type (individual / business / vendor)
alter table public.profiles
  add column if not exists account_type text not null default 'individual';

alter table public.profiles
  add column if not exists business_name text not null default '';

alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('individual', 'business', 'vendor'));

-- 2) Business / vendor pickup address + saved delivery clients
alter table public.profiles
  add column if not exists business_address jsonb;

alter table public.profiles
  add column if not exists saved_clients jsonb not null default '[]'::jsonb;

-- 3) Admin-visible password for provisioned vendor accounts
alter table public.profiles
  add column if not exists login_password text;
