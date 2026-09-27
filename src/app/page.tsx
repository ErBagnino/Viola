import { redirect } from "next/navigation";
import { LoginScreen } from "@/features/auth/login-screen";
import { getViewer, homeFor } from "@/server/auth";
import { getSystemSettings } from "@/server/settings";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (viewer && viewer.role !== "pending") redirect(homeFor(viewer.role));

  const { general } = await getSystemSettings();
  return (
    <LoginScreen
      title={general.loginTitle}
      subtitle={general.loginSubtitle}
      violaName={general.violaName}
      adamName={general.adamName}
      pending={Boolean(viewer) || params.stato === "in-attesa"}
      configured={isSupabaseConfigured()}
    />
  );
}
