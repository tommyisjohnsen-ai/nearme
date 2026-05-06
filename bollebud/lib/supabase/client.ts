"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

// Singleton — one client per browser tab.
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  }
  return client;
}
