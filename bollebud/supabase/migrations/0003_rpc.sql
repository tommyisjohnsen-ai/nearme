-- 0003_rpc.sql — RPC functions called by the frontend.

-- Returns currently-online vendors within radius_m of (lat, lng), nearest first.
-- We treat a session as "online" if ended_at is null and last_seen_at is fresh
-- (< 60s) — guards against vendors who close the tab without ending the session.
create or replace function public.nearby_vendors(
  lat float,
  lng float,
  radius_m int default 3000
)
returns table (
  vendor_id uuid,
  owner_id uuid,
  name text,
  description text,
  session_id uuid,
  last_seen_at timestamptz,
  distance_m float,
  lng float,
  lat float
)
language sql
stable
security invoker
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(nearby_vendors.lng, nearby_vendors.lat), 4326)::geography as g
  )
  select
    v.id as vendor_id,
    v.owner_id,
    v.name,
    v.description,
    s.id as session_id,
    s.last_seen_at,
    st_distance(s.last_location, (select g from origin)) as distance_m,
    st_x(s.last_location::geometry) as lng,
    st_y(s.last_location::geometry) as lat
  from vendor_sessions s
  join vendors v on v.id = s.vendor_id
  where s.ended_at is null
    and s.last_location is not null
    and v.is_active = true
    and s.last_seen_at > now() - interval '60 seconds'
    and st_dwithin(s.last_location, (select g from origin), radius_m)
  order by distance_m asc;
$$;

-- Starts a new session for a vendor (or returns the existing open one).
create or replace function public.start_vendor_session(
  p_vendor_id uuid,
  p_lat float,
  p_lng float
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  -- Caller must own the vendor.
  if not exists (
    select 1 from vendors v
    where v.id = p_vendor_id and v.owner_id = auth.uid()
  ) then
    raise exception 'Not authorized to start session for this vendor';
  end if;

  -- Reuse an existing open session if there is one (idempotent).
  select id into v_session_id
  from vendor_sessions
  where vendor_id = p_vendor_id and ended_at is null
  limit 1;

  if v_session_id is not null then
    update vendor_sessions
    set last_location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        last_seen_at = now()
    where id = v_session_id;
    return v_session_id;
  end if;

  insert into vendor_sessions (vendor_id, last_location, last_seen_at)
  values (
    p_vendor_id,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    now()
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

-- Updates location for an open session. Frontend calls this every ~15s.
create or replace function public.update_vendor_location(
  p_session_id uuid,
  p_lat float,
  p_lng float
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update vendor_sessions s
  set last_location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      last_seen_at = now()
  from vendors v
  where s.id = p_session_id
    and s.vendor_id = v.id
    and v.owner_id = auth.uid()
    and s.ended_at is null;

  if not found then
    raise exception 'Session not found, ended, or not owned by caller';
  end if;
end;
$$;

-- Closes any open session for a vendor.
create or replace function public.end_active_session(p_vendor_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update vendor_sessions s
  set ended_at = now()
  from vendors v
  where s.vendor_id = p_vendor_id
    and s.vendor_id = v.id
    and v.owner_id = auth.uid()
    and s.ended_at is null;
end;
$$;

-- Validates and applies an order status transition. The full rules:
--   requested  -> accepted | cancelled  (vendor or customer)
--   accepted   -> en_route | cancelled  (vendor or customer)
--   en_route   -> delivered | cancelled (vendor or customer)
--   delivered, cancelled are terminal.
create or replace function public.transition_order_status(
  p_order_id uuid,
  p_new_status order_status
)
returns orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_is_participant boolean;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  select (
    v_order.customer_id = auth.uid()
    or exists (
      select 1 from vendors v
      where v.id = v_order.vendor_id and v.owner_id = auth.uid()
    )
    or public.is_admin()
  ) into v_is_participant;

  if not v_is_participant then
    raise exception 'Not authorized for this order';
  end if;

  if v_order.status = p_new_status then
    return v_order;
  end if;

  if not (
    (v_order.status = 'requested' and p_new_status in ('accepted', 'cancelled'))
    or (v_order.status = 'accepted' and p_new_status in ('en_route', 'cancelled'))
    or (v_order.status = 'en_route' and p_new_status in ('delivered', 'cancelled'))
  ) then
    raise exception 'Illegal transition: % -> %', v_order.status, p_new_status;
  end if;

  update orders set status = p_new_status where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.nearby_vendors(float, float, int) to authenticated;
grant execute on function public.start_vendor_session(uuid, float, float) to authenticated;
grant execute on function public.update_vendor_location(uuid, float, float) to authenticated;
grant execute on function public.end_active_session(uuid) to authenticated;
grant execute on function public.transition_order_status(uuid, order_status) to authenticated;
