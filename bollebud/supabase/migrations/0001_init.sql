-- 0001_init.sql — schema, types, indexes
-- PostGIS gives us geography(Point) and ST_DWithin for radius queries.
create extension if not exists postgis;

create type user_role as enum ('customer', 'vendor', 'admin');
create type order_status as enum (
  'requested',
  'accepted',
  'en_route',
  'delivered',
  'cancelled'
);
create type fulfillment_type as enum ('pickup', 'delivery');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'customer',
  display_name text,
  phone text,
  created_at timestamptz default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index vendors_owner_idx on vendors(owner_id);

create table vendor_sessions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  last_location geography(Point, 4326),
  last_seen_at timestamptz default now()
);
create index vendor_sessions_geo_idx
  on vendor_sessions using gist (last_location);
create index vendor_sessions_active_idx
  on vendor_sessions (vendor_id) where ended_at is null;

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  vendor_id uuid not null references vendors(id),
  fulfillment fulfillment_type not null,
  bun_count int not null check (bun_count between 1 and 20),
  customer_note text,
  customer_location geography(Point, 4326),
  status order_status not null default 'requested',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index orders_vendor_status_idx on orders(vendor_id, status);
create index orders_customer_idx on orders(customer_id, created_at desc);

create table order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now()
);
create index order_messages_order_idx on order_messages(order_id, created_at);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
create index push_subscriptions_user_idx on push_subscriptions(user_id);

-- Auto-update orders.updated_at on any change.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

-- Auto-create a profile row for new auth users (default role 'customer').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
