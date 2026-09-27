import { OfflineKit } from "@/features/offline/offline-kit";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return <OfflineKit />;
}
