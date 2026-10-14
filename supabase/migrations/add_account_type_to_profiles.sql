-- Individual vs business customer accounts
alter table public.profiles
  add column if not exists account_type text not null default 'individual'
    check (account_type in ('individual', 'business'));

alter table public.profiles
  add column if not exists business_name text not null default '';
