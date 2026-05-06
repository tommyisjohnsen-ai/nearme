-- 0004_realtime.sql — opt tables into Supabase Realtime broadcasts.
-- Without this, the postgres_changes channel sees nothing.

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_messages;
alter publication supabase_realtime add table vendor_sessions;
