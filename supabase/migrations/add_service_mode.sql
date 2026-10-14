-- City Run vs City Run Plus on delivery orders.
-- Safe to re-run.

alter table public.delivery_orders
  add column if not exists service_mode text;

alter table public.delivery_orders
  drop constraint if exists delivery_orders_service_mode_check;

alter table public.delivery_orders
  add constraint delivery_orders_service_mode_check
  check (
    service_mode is null
    or service_mode in ('cityrun', 'cityrun-plus')
  );
