-- Run this if riders table exists but onboarding still fails
-- (fixes Row Level Security blocking the API)

alter table public.riders enable row level security;

drop policy if exists "riders_api_all" on public.riders;

create policy "riders_api_all"
  on public.riders
  for all
  using (true)
  with check (true);
