// Idempotent skjema-bootstrap + seed av 3 demo-brukere.
// Kjøres ved hver oppstart. Trygg å kjøre flere ganger.

const { pool } = require('./index');

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  push_subscription JSONB,
  is_sharing_location BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(Point, 4326) NOT NULL,
  accuracy FLOAT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_locations_geom ON user_locations USING GIST(location);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE TABLE IF NOT EXISTS proximity_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_notified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

const SEED_USERS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Drogba',   email: 'bruker1@nearme.demo' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'TommyTee', email: 'bruker2@nearme.demo' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Dottie',   email: 'bruker3@nearme.demo' },
];
// bcrypt.hashSync('Demo1234', 10)
const SEED_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

async function seedUsers(client) {
  for (const u of SEED_USERS) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, is_sharing_location)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, is_sharing_location = true`,
      [u.id, u.name, u.email, SEED_PASSWORD_HASH],
    );
  }
  console.log(`[migrate] Seeded ${SEED_USERS.length} demo users`);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log('[migrate] Skjema bootstrappet OK');
    await seedUsers(client);
  } catch (err) {
    console.error('[migrate] Feil under bootstrap:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
