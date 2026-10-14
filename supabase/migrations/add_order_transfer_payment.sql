-- Run this FIRST if delivery_orders does not exist yet (fresh Supabase project).
-- Supabase Dashboard → SQL Editor → paste supabase/schema.sql and Run.
--
-- This file only updates payment_method on an existing delivery_orders table.
-- Do NOT run this until schema.sql has been applied successfully.

alter table public.delivery_orders
  drop constraint if exists delivery_orders_payment_method_check;

alter table public.delivery_orders
  add constraint delivery_orders_payment_method_check
  check (
    payment_method is null
    or payment_method in ('wallet', 'transfer', 'none')
  );
