"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction, UserError } from "@/server/action-result";
import { createRow, deleteRow, reorderRows, updateRow } from "@/server/admin/crud";

const idSchema = z.uuid();
const payload = z.record(z.string(), z.unknown());

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/viola", "layout");
}

export async function createResourceAction(key: string, input: Record<string, unknown>) {
  return safeAction(async () => {
    const row = await createRow(key, payload.parse(input));
    refresh();
    return { row };
  });
}

export async function updateResourceAction(key: string, id: string, input: Record<string, unknown>) {
  return safeAction(async () => {
    if (!idSchema.safeParse(id).success) throw new UserError("Elemento non valido");
    const row = await updateRow(key, id, payload.parse(input));
    refresh();
    return { row };
  });
}

export async function deleteResourceAction(key: string, id: string) {
  return safeAction(async () => {
    if (!idSchema.safeParse(id).success) throw new UserError("Elemento non valido");
    await deleteRow(key, id);
    refresh();
    return {};
  });
}

export async function reorderResourceAction(key: string, ids: string[]) {
  return safeAction(async () => {
    const parsed = z.array(idSchema).max(500).safeParse(ids);
    if (!parsed.success) throw new UserError("Ordine non valido");
    await reorderRows(key, parsed.data);
    refresh();
    return {};
  });
}
