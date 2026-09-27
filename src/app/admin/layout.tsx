import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleStatus } from "@/lib/supabase/admin";
import Link from "next/link";

export const metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [settings, supabase, keyStatus] = await Promise.all([getSettings(), createClient(), serviceRoleStatus()]);
  const { count } = await supabase.from("adam_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  return (
    <AdminShell appName={settings.general.appName} pendingRequests={count ?? 0}>
      {keyStatus !== "ok" && (
        <Link href="/admin/completa#chiave-segreta" role="alert" className="press mb-4 block rounded-3xl bg-rouge-600 p-4 text-white shadow-soft">
          <p className="font-extrabold">⚠ La chiave segreta di Supabase {keyStatus === "missing" ? "manca" : "non funziona"}</p>
          <p className="mt-0.5 text-sm text-white/90">
            Su Vercel, SUPABASE_SERVICE_ROLE_KEY deve essere la Secret key (sb_secret_…) di questo progetto. Finché non la sistemi le notifiche a {settings.general.violaName} non partono. Come sistemarla →
          </p>
        </Link>
      )}
      {children}
    </AdminShell>
  );
}
