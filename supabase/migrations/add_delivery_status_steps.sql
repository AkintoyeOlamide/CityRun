-- Expand delivery status steps for rider → customer updates
alter table public.delivery_orders
  drop constraint if exists delivery_orders_status_check;

alter table public.delivery_orders
  add constraint delivery_orders_status_check check (
    status in (
      'pending',
      'confirmed',
      'rider_assigned',
      'en_route_pickup',
      'picked_up',
      'in_transit',
      'arrived_at_dropoff',
      'delivered',
      'cancelled'
    )
  );
