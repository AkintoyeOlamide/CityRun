-- Run if delivery_orders already exists without photo columns
alter table public.delivery_orders
  add column if not exists item_photo_url text,
  add column if not exists proof_of_delivery_url text;
