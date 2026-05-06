-- seed.sql — local dev fixtures: 1 admin, 2 vendors, 3 customers.
-- Run with `supabase db reset` (Supabase CLI runs migrations + seed).
-- Note: in dev, we insert directly into auth.users so there's something to log in as.
-- In production, NEVER do this — use magic link.

-- Helper: deterministic UUIDs so we can reference them.
do $$
declare
  admin_id uuid := '11111111-1111-1111-1111-111111111111';
  vendor_owner_a uuid := '22222222-2222-2222-2222-222222222222';
  vendor_owner_b uuid := '33333333-3333-3333-3333-333333333333';
  customer_a uuid := '44444444-4444-4444-4444-444444444444';
  customer_b uuid := '55555555-5555-5555-5555-555555555555';
  customer_c uuid := '66666666-6666-6666-6666-666666666666';
  vendor_a_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  vendor_b_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  -- auth.users — direct insert is fragile but works for local seed.
  insert into auth.users (id, instance_id, email, raw_app_meta_data, raw_user_meta_data,
                          aud, role, email_confirmed_at, created_at, updated_at)
  values
    (admin_id, '00000000-0000-0000-0000-000000000000', 'admin@bollebud.local',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     'authenticated', 'authenticated', now(), now(), now()),
    (vendor_owner_a, '00000000-0000-0000-0000-000000000000', 'sara@bollebud.local',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     'authenticated', 'authenticated', now(), now(), now()),
    (vendor_owner_b, '00000000-0000-0000-0000-000000000000', 'bussen@bollebud.local',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     'authenticated', 'authenticated', now(), now(), now()),
    (customer_a, '00000000-0000-0000-0000-000000000000', 'kari@bollebud.local',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     'authenticated', 'authenticated', now(), now(), now()),
    (customer_b, '00000000-0000-0000-0000-000000000000', 'ola@bollebud.local',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     'authenticated', 'authenticated', now(), now(), now()),
    (customer_c, '00000000-0000-0000-0000-000000000000', 'per@bollebud.local',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     'authenticated', 'authenticated', now(), now(), now())
  on conflict (id) do nothing;

  -- Profiles — handle_new_user trigger makes 'customer' rows; override roles here.
  insert into profiles (id, role, display_name) values
    (admin_id, 'admin', 'Admin'),
    (vendor_owner_a, 'vendor', 'Sykkel-Sara'),
    (vendor_owner_b, 'vendor', 'Bollebussen Bjørn'),
    (customer_a, 'customer', 'Kari'),
    (customer_b, 'customer', 'Ola'),
    (customer_c, 'customer', 'Per')
  on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;

  insert into vendors (id, owner_id, name, description, is_active) values
    (vendor_a_id, vendor_owner_a, 'Sykkel-Sara',
     'Hjemmebakte kanelboller fra sykkelvogna', true),
    (vendor_b_id, vendor_owner_b, 'Bollebussen',
     'Skolebussen ombygd til bakeri på hjul', true)
  on conflict (id) do nothing;

  -- Open sessions near Oslo sentrum.
  insert into vendor_sessions (vendor_id, last_location, last_seen_at)
  values
    (vendor_a_id,
     st_setsrid(st_makepoint(10.7522, 59.9139), 4326)::geography,
     now()),
    (vendor_b_id,
     st_setsrid(st_makepoint(10.7400, 59.9180), 4326)::geography,
     now());
end $$;
