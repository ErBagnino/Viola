"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ResourceForm } from "@/features/admin/resource-form";
import type { FieldDef, Option } from "@/features/admin/resources";
import { saveSettingsAction } from "./actions";

export function SettingsForm({
  settingsKey,
  title,
  description,
  fields,
  initial,
  extraOptions,
}: {
  settingsKey: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  extraOptions?: Record<string, Option[]>;
}) {
  const [values, setValues] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const save = () =>
    start(async () => {
      const res = await saveSettingsAction(settingsKey, values);
      if (res.ok) {
        toast.show("Impostazioni salvate ♡");
        setDirty(false);
        router.refresh();
      } else toast.show(res.error, "error");
    });

  return (
    <section className="paper rounded-4xl p-5" aria-labelledby={`s-${settingsKey}`}>
      <h2 id={`s-${settingsKey}`} className="font-display text-xl font-semibold text-wine-900">
        {title}
      </h2>
      {description && <p className="mb-4 text-sm text-ink-soft">{description}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <ResourceForm
          fields={fields}
          values={values}
          extraOptions={extraOptions}
          onChange={(p) => {
            setValues((v) => ({ ...v, ...p }));
            setDirty(true);
          }}
        />
        <div className="mt-5 flex justify-end">
          <Button type="submit" loading={pending} disabled={!dirty}>
            <Save className="size-4" /> Salva
          </Button>
        </div>
      </form>
    </section>
  );
}
