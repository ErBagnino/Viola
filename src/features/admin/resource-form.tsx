"use client";

import { Chip, Field, Input, Select, Switch, Textarea } from "@/components/ui/fields";
import { cn } from "@/utils/cn";
import type { FieldDef, Option } from "./resources";
import {
  ActionPicker,
  ColorPicker,
  IconPicker,
  ListInput,
  MediaPicker,
  NumbersInput,
  OptionsEditor,
  PairsEditor,
  RandomWeightInput,
  RichTextEditor,
  SchedulePicker,
  StepsEditor,
  TagsInput,
} from "./fields/pickers";

type Values = Record<string, unknown>;

export function ResourceForm({
  fields,
  values,
  onChange,
  extraOptions,
  errors,
}: {
  fields: FieldDef[];
  values: Values;
  onChange: (patch: Values) => void;
  extraOptions?: Record<string, Option[]>;
  errors?: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      {fields.map((f) => (
        <div key={f.name} className={cn(f.half ? "col-span-1" : "col-span-2")}>
          <FieldControl field={f} values={values} onChange={onChange} options={extraOptions?.[f.name] ?? f.options} error={errors?.[f.name]} />
        </div>
      ))}
    </div>
  );
}

function FieldControl({ field: f, values, onChange, options, error }: { field: FieldDef; values: Values; onChange: (p: Values) => void; options?: Option[]; error?: string }) {
  const v = values[f.name];
  const set = (x: unknown) => onChange({ [f.name]: x });
  const label = `${f.label}${f.required ? " *" : ""}`;

  if (f.type === "boolean") {
    return <Switch label={f.label} description={f.hint} checked={Boolean(v)} onChange={set} />;
  }

  return (
    <Field label={label} hint={f.type === "markdown" ? undefined : f.hint} error={error}>
      {(id) => {
        switch (f.type) {
          case "text":
            return <Input id={id} value={(v as string) ?? ""} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} list={f.suggestions?.length ? `${id}-list` : undefined} />;
          case "textarea":
            return <Textarea id={id} rows={3} value={(v as string) ?? ""} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />;
          case "markdown":
            return (
              <div>
                <RichTextEditor id={id} value={(v as string) ?? ""} onChange={set} />
                {f.hint && <p className="mt-1 text-xs text-ink-muted">{f.hint}</p>}
              </div>
            );
          case "number":
            return (
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={f.min}
                max={f.max}
                step={f.step ?? 1}
                value={v === null || v === undefined ? "" : String(v)}
                onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
              />
            );
          case "weight":
            return <RandomWeightInput id={id} value={Number(v ?? 5)} max={f.max} onChange={set} />;
          case "select":
            return (
              <Select id={id} value={(v as string) ?? ""} onChange={(e) => set(e.target.value || null)}>
                <option value="">—</option>
                {(options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            );
          case "date":
            return <Input id={id} type="date" value={(v as string) ?? ""} onChange={(e) => set(e.target.value || null)} />;
          case "datetime":
            return <SchedulePicker id={id} value={(v as string) ?? null} onChange={set} />;
          case "image":
            return <MediaPicker kind="image" value={(v as string) ?? null} onChange={set} />;
          case "audio":
            return <MediaPicker kind="audio" value={(v as string) ?? null} onChange={set} />;
          case "icon":
            return <IconPicker value={(v as string) ?? null} onChange={set} />;
          case "color":
            return <ColorPicker value={(v as string) ?? null} onChange={set} />;
          case "action":
            return <ActionPicker id={id} value={(v as string) ?? "none"} onChange={set} allowUrl />;
          case "tags":
            return <TagsInput value={(v as string[]) ?? []} onChange={set} suggestions={f.suggestions} />;
          case "list":
            return <ListInput value={(v as string[]) ?? []} onChange={set} />;
          case "steps":
            return <StepsEditor value={(v as { title: string }[]) ?? []} onChange={set} />;
          case "options":
            return (
              <OptionsEditor
                options={(values.options as string[]) ?? ["", ""]}
                correct={Number(values.correct_index ?? 0)}
                onChange={(options, correct) => onChange({ options, correct_index: correct })}
              />
            );
          case "pairs":
            return <PairsEditor value={(v as { title: string; text?: string }[]) ?? []} onChange={set} max={f.max} />;
          case "numbers":
            return <NumbersInput value={(v as number[]) ?? []} onChange={set} suffix={f.placeholder} />;
          case "contexts": {
            const list = (v as string[]) ?? [];
            return (
              <div className="flex flex-wrap gap-2">
                {(options ?? []).map((o) => (
                  <Chip key={o.value} active={list.includes(o.value)} onClick={() => set(list.includes(o.value) ? list.filter((x) => x !== o.value) : [...list, o.value])}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            );
          }
          default:
            return null;
        }
      }}
    </Field>
  );
}
