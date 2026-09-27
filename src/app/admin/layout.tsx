import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [settings, supabase] = await Promise.all([getSettings(), createClient()]);
  const { count } = await supabase.from("adam_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  return (
    <AdminShell appName={settings.general.appName} pendingRequests={count ?? 0}>
      {children}
    </AdminShell>
  );
}
