-- Admin-provisioned vendor accounts (pickup set by admin; vendors book deliveries only)
alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('individual', 'business', 'vendor'));

alter table public.profiles
  add column if not exists login_password text;
