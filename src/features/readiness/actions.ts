"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { safeAction, UserError } from "@/server/action-result";
import { audit } from "@/server/audit";
import { runCheckupFor } from "@/server/readiness-checkup";
import { TASKS } from "./tasks";

const input = z.object({
  taskId: z.string().regex(/^[a-z0-9-]{2,60}$/),
  state: z.enum(["done", "skipped"]).nullable(),
});

/**
 * Manual part of "Completa Vio ♡": tick a task that cannot be measured
 * ("Fatto"), mark one as "Non mi serve", or put it back (state = null).
 */
export async function setReadinessCheck(taskId: string, state: "done" | "skipped" | null) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    const parsed = input.safeParse({ taskId, state });
    if (!parsed.success) throw new UserError("Richiesta non valida.");
    const task = TASKS.find((t) => t.id === parsed.data.taskId);
    if (!task) throw new UserError("Questo passaggio non esiste più.");
    if (parsed.data.state === "done" && !task.manual) throw new UserError("Questo si completa da solo quando aggiungi i contenuti.");
    if (parsed.data.state === "skipped" && !task.skippable) throw new UserError("Questo passaggio è importante: non si può saltare.");

    const supabase = await createClient();
    const { error } = parsed.data.state
      ? await supabase.from("readiness_checks").upsert({ task_id: task.id, state: parsed.data.state, done_at: new Date().toISOString(), done_by: admin.id })
      : await supabase.from("readiness_checks").delete().eq("task_id", task.id);
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") throw new UserError("Prima aggiorna il database (supabase/update.sql). ♡");
      throw error;
    }
    await audit({ adminId: admin.id, action: parsed.data.state ? `readiness.${parsed.data.state}` : "readiness.reset", table: "readiness_checks", targetId: task.id });
    revalidatePath("/admin");
    revalidatePath("/admin/completa");
    return {};
  });
}

/** "Controllo Vio ♡" — read-only health check. */
export async function runCheckup() {
  return safeAction(async () => {
    const admin = await assertAdmin();
    return { items: await runCheckupFor(admin.id), at: new Date().toISOString() };
  });
}
