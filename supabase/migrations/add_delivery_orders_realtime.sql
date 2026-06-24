-- Enable Supabase Realtime for live rider location on delivery_orders
alter publication supabase_realtime add table public.delivery_orders;
