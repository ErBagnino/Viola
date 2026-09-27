import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/layout/admin-header";
import { ResourceManager } from "@/features/admin/resource-manager";
import { resourceBySlug } from "@/features/admin/resources";
import { listRows } from "@/server/admin/crud";
import { adminThumbs } from "@/server/admin/thumbs";

export default async function ResourcePage({ params }: PageProps<"/admin/[resource]">) {
  const { resource } = await params;
  const def = resourceBySlug(resource);
  if (!def || def.key === "media") notFound();
  const rows = await listRows(def.key);
  const thumbs = await adminThumbs(rows);
  return (
    <div>
      <AdminHeader title={def.label} description={def.description} icon={def.icon} />
      <ResourceManager resourceKey={def.key} rows={rows} thumbs={thumbs} />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/admin/[resource]">) {
  const { resource } = await params;
  return { title: resourceBySlug(resource)?.label ?? "Admin" };
}
