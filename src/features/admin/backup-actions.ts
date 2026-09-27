"use server";

import { revalidatePath } from "next/cache";
import { safeAction } from "@/server/action-result";
import { exportBackup, importBackup } from "@/server/admin/backup";

export async function exportAction(includeSettings: boolean) {
  return safeAction(async () => ({ backup: await exportBackup(undefined, includeSettings) }));
}

export async function importAction(json: unknown, includeSettings: boolean) {
  return safeAction(async () => {
    const report = await importBackup(json, { includeSettings });
    revalidatePath("/", "layout");
    return { report };
  });
}
