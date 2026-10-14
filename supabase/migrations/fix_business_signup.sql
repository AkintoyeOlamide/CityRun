-- Business account signup: all profile columns + trigger metadata sync.
-- Run once in Supabase Dashboard → SQL Editor.

alter table public.profiles
  add column if not exists account_type text not null default 'individual';

alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('individual', 'business', 'vendor'));

alter table public.profiles
  add column if not exists business_name text not null default '';

alter table public.profiles
  add column if not exists nature_of_goods text not null default '';

alter table public.profiles
  add column if not exists business_address jsonb;

alter table public.profiles
  add column if not exists saved_clients jsonb not null default '[]'::jsonb;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    account_type,
    business_name,
    nature_of_goods,
    business_address
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'individual'),
    coalesce(new.raw_user_meta_data ->> 'business_name', ''),
    coalesce(new.raw_user_meta_data ->> 'nature_of_goods', ''),
    case
      when new.raw_user_meta_data ? 'business_address'
        then new.raw_user_meta_data -> 'business_address'
      else null
    end
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

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
