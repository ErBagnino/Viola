import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Role = "admin" | "user" | "pending";

export type Viewer = {
  id: string;
  email: string | null;
  role: Role;
  displayName: string | null;
  nickname: string | null;
  onboardedAt: string | null;
};

/** The signed-in user + role, verified server-side (cached per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, display_name, nickname, onboarded_at")
    .eq("id", claims.sub)
    .maybeSingle();
  // A failed lookup (database paused or unreachable) is not the same as
  // "no role yet": never show a working account as "not enabled".
  if (profileError) throw new Error(`profile lookup failed: ${profileError.code ?? "unknown"}`);

  const role = (profile?.role ?? "pending") as Role;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    role: role === "admin" || role === "user" ? role : "pending",
    displayName: profile?.display_name ?? null,
    nickname: profile?.nickname ?? null,
    onboardedAt: profile?.onboarded_at ?? null,
  };
});

export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : role === "user" ? "/viola" : "/?stato=in-attesa";
}

/** For pages: Viola's area (admins may preview it too). */
export async function requireMember() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role === "pending") redirect("/?stato=in-attesa");
  return viewer;
}

/** For pages: Adam's dashboard. Non-admins are sent back to their home. */
export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "admin") redirect(homeFor(viewer.role));
  return viewer;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** For API routes / server actions: throws instead of redirecting. */
export async function assertMember() {
  const viewer = await getViewer();
  if (!viewer) throw new HttpError(401, "Devi accedere di nuovo.");
  if (viewer.role === "pending") throw new HttpError(403, "Account non ancora abilitato.");
  return viewer;
}

export async function assertAdmin() {
  const viewer = await assertMember();
  if (viewer.role !== "admin") throw new HttpError(403, "Solo Adam può farlo.");
  return viewer;
}
