-- Admin-visible login password (set on onboard / reset). Run in SQL Editor.

alter table public.riders
  add column if not exists login_password text;
