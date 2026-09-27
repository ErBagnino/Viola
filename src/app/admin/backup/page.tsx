import { AdminHeader } from "@/components/layout/admin-header";
import { BackupPanel } from "@/features/admin/backup-panel";

export const metadata = { title: "Backup" };

export default function BackupPage() {
  return (
    <div>
      <AdminHeader title="Backup" description="Scarica una copia dei contenuti o ripristinala. Fallo ogni tanto: è gratis e ti protegge." icon="shuffle" />
      <BackupPanel />
    </div>
  );
}
