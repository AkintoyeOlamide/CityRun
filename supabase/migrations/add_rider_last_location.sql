-- Store rider GPS on the rider record (even when not on a delivery)
alter table public.riders
  add column if not exists last_location jsonb,
  add column if not exists location_updated_at timestamptz;

create index if not exists riders_location_updated_at_idx
  on public.riders (location_updated_at desc)
  where last_location is not null;

-- Optional (instant admin fleet updates): alter publication supabase_realtime add table public.riders;
