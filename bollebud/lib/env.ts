// Centralized env access with friendly error messages.
// Throws early at boot rather than later with cryptic null deref.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. See .env.example.`,
    );
  }
  return value;
}

export const env = {
  // Public — must be safe to ship to the browser.
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultLat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "59.9139"),
  defaultLng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "10.7522"),
  defaultRadiusM: Number(process.env.NEXT_PUBLIC_DEFAULT_RADIUS_M ?? "3000"),
} as const;

// Server-only — only valid in route handlers / server components.
export function getServerEnv() {
  return {
    supabaseServiceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    vapidPrivateKey: required(
      "VAPID_PRIVATE_KEY",
      process.env.VAPID_PRIVATE_KEY,
    ),
    vapidContactEmail:
      process.env.VAPID_CONTACT_EMAIL ?? "mailto:admin@example.com",
  };
}
