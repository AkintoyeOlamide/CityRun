-- Store rider phone on the order so customers can call their assigned rider
alter table public.delivery_orders
  add column if not exists rider_phone text;
