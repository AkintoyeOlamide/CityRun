-- Business address + saved client delivery locations
alter table public.profiles
  add column if not exists business_address jsonb;

alter table public.profiles
  add column if not exists saved_clients jsonb not null default '[]'::jsonb;
