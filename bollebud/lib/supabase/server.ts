import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { env, getServerEnv } from "@/lib/env";

// Per-request server client. Reads/writes auth cookies for SSR.
export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server components cannot set cookies. Middleware/route handlers can.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See above.
        }
      },
    },
  });
}

// Service-role client for server-only privileged operations (push triggers,
// admin tools). NEVER ship this to the browser.
export function getSupabaseAdminClient() {
  const { supabaseServiceRoleKey } = getServerEnv();
  return createServerClient<Database>(env.supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
  });
}
