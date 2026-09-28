import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/layout/admin-header";
import { ResourceManager } from "@/features/admin/resource-manager";
import { resourceBySlug } from "@/features/admin/resources";
import { listRows } from "@/server/admin/crud";
import { adminThumbs } from "@/server/admin/thumbs";
import { getSettings } from "@/server/settings";
import { isAiConfigured } from "@/server/ai/gemini";

export default async function ResourcePage({ params, searchParams }: PageProps<"/admin/[resource]">) {
  const [{ resource }, { nuovo }] = await Promise.all([params, searchParams]);
  const def = resourceBySlug(resource);
  if (!def || def.key === "media") notFound();
  const [rows, settings] = await Promise.all([listRows(def.key), getSettings()]);
  const thumbs = await adminThumbs(rows);
  const { general, texts } = settings;
  return (
    <div>
      <AdminHeader title={def.label} description={def.description} icon={def.icon} />
      <ResourceManager
        resourceKey={def.key}
        rows={rows}
        thumbs={thumbs}
        initialNew={typeof nuovo === "string" ? nuovo.slice(0, 30) : null}
        aiWriting={settings.writing.enabled && isAiConfigured()}
        preview={{
          adamName: general.adamName,
          violaName: general.violaName,
          signature: general.signature,
          timezone: general.timezone,
          meetingLead: texts.countdownMeetingLead,
          todayText: texts.countdownToday,
          daAdam: general.showDaAdam ? "Da Adam ♡" : "",
        }}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/admin/[resource]">) {
  const { resource } = await params;
  return { title: resourceBySlug(resource)?.label ?? "Admin" };
}
