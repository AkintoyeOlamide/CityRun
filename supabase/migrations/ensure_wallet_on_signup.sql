-- Auto-create a zero-balance wallet for every new auth user.
-- Also backfills wallets for accounts created before this migration.

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

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.wallets (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.wallets w where w.user_id = u.id
);
