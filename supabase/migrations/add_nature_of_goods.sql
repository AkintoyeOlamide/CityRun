-- Nature of goods for business accounts (pickup profile + default item description)
alter table public.profiles
  add column if not exists nature_of_goods text not null default '';

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
