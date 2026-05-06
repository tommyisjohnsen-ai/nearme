-- 0002_rls.sql — Row Level Security policies.
-- Default: deny everything, then explicitly allow.

alter table profiles enable row level security;
alter table vendors enable row level security;
alter table vendor_sessions enable row level security;
alter table orders enable row level security;
alter table order_messages enable row level security;
alter table push_subscriptions enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- profiles ----------
-- Read access is allowed for: own row, admins, and anyone who shares an
-- order with the profile owner (so vendor + customer can see each other's
-- display name on the order page). `phone` is also exposed by this policy;
-- if we ever store sensitive PII on profiles, split into a private table.
create policy "profiles: read own, shared-order, or admin"
  on profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from orders o
      where (o.customer_id = profiles.id and exists (
        select 1 from vendors v
        where v.id = o.vendor_id and v.owner_id = auth.uid()
      ))
      or (o.customer_id = auth.uid() and exists (
        select 1 from vendors v
        where v.id = o.vendor_id and v.owner_id = profiles.id
      ))
    )
  );

create policy "profiles: update own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin can update all"
  on profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- vendors ----------
create policy "vendors: read active or own or admin"
  on vendors for select
  using (
    is_active = true
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "vendors: insert by self only"
  on vendors for insert
  with check (owner_id = auth.uid());

create policy "vendors: update own or admin"
  on vendors for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ---------- vendor_sessions ----------
-- Anyone authenticated can see currently-online sessions (so customers can map them).
create policy "vendor_sessions: read open sessions"
  on vendor_sessions for select
  using (
    ended_at is null
    or public.is_admin()
    or exists (
      select 1 from vendors v
      where v.id = vendor_id and v.owner_id = auth.uid()
    )
  );

create policy "vendor_sessions: insert by vendor owner"
  on vendor_sessions for insert
  with check (
    exists (
      select 1 from vendors v
      where v.id = vendor_id and v.owner_id = auth.uid()
    )
  );

create policy "vendor_sessions: update by vendor owner"
  on vendor_sessions for update
  using (
    exists (
      select 1 from vendors v
      where v.id = vendor_id and v.owner_id = auth.uid()
    )
  );

-- ---------- orders ----------
create policy "orders: read own"
  on orders for select
  using (
    customer_id = auth.uid()
    or exists (
      select 1 from vendors v
      where v.id = vendor_id and v.owner_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "orders: customer creates"
  on orders for insert
  with check (
    customer_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'customer')
  );

-- Updates go through the transition_order_status RPC which double-checks
-- the caller; the policy here is a safety net.
create policy "orders: update by participants"
  on orders for update
  using (
    customer_id = auth.uid()
    or exists (
      select 1 from vendors v
      where v.id = vendor_id and v.owner_id = auth.uid()
    )
    or public.is_admin()
  );

-- ---------- order_messages ----------
create policy "order_messages: read by participants"
  on order_messages for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or exists (
          select 1 from vendors v
          where v.id = o.vendor_id and v.owner_id = auth.uid()
        )
        or public.is_admin()
      )
    )
  );

create policy "order_messages: insert by participants"
  on order_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from orders o
      where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or exists (
          select 1 from vendors v
          where v.id = o.vendor_id and v.owner_id = auth.uid()
        )
      )
    )
  );

-- ---------- push_subscriptions ----------
create policy "push: own only"
  on push_subscriptions for select
  using (user_id = auth.uid());

create policy "push: insert own"
  on push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push: delete own"
  on push_subscriptions for delete
  using (user_id = auth.uid());
