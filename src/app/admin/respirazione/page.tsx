import { AdminHeader } from "@/components/layout/admin-header";
import { ResourceManager } from "@/features/admin/resource-manager";
import { listRows } from "@/server/admin/crud";
import { adminThumbs } from "@/server/admin/thumbs";

export const metadata = { title: "Respirazione" };

export default async function RespirazioneAdmin() {
  const [presets, media] = await Promise.all([listRows("breathing_presets"), listRows("breathing_media")]);
  const thumbs = await adminThumbs(media);
  const presetOptions = presets.map((p) => ({ value: p.id, label: String(p.name) }));
  return (
    <div className="space-y-8">
      <div>
        <AdminHeader title="Respirazione" description="I ritmi di respiro (inspira / trattieni / espira), la forma, le foto e le frasi." icon="wind" />
        <ResourceManager resourceKey="breathing_presets" rows={presets} />
      </div>
      <div>
        <AdminHeader as="h2" title="Foto durante il respiro" description="Foto con una frase (es. &quot;Respira con me.&quot;). Si aggiungono alle foto marcate &quot;durante la respirazione&quot; nella libreria." icon="image" />
        <ResourceManager resourceKey="breathing_media" rows={media} thumbs={thumbs} extraOptions={{ preset_id: presetOptions }} />
      </div>
    </div>
  );
}
