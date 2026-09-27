"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/db/database.types";
import { publicEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client (session in cookies, RLS applies). */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey);
  return client;
}
