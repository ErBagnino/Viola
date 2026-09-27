"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { safeAction, UserError } from "@/server/action-result";
import { getSettings } from "@/server/settings";
import { notifyUser } from "@/server/notifications";

const id = z.uuid();

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/viola", "layout");
}

export async function setRequestStatus(requestId: string, status: "seen" | "closed" | "new") {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!id.safeParse(requestId).success) throw new UserError("Richiesta non valida");
    const now = new Date().toISOString();
    const patch = status === "seen" ? { status, seen_at: now } : status === "closed" ? { status, closed_at: now } : { status };
    const supabase = await createClient();
    const { error } = await supabase.from("adam_requests").update(patch).eq("id", requestId);
    if (error) throw error;
    await audit({ adminId: admin.id, action: `request_${status}`, table: "adam_requests", targetId: requestId });
    refresh();
    return {};
  });
}

export async function respondToRequest(requestId: string, response: string) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!id.safeParse(requestId).success) throw new UserError("Richiesta non valida");
    const text = z.string().trim().min(1, "Scrivi una risposta").max(2000).parse(response);
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("adam_requests")
      .update({ status: "responded", response: text, responded_at: now, seen_at: now })
      .eq("id", requestId)
      .select("user_id")
      .single();
    if (error) throw error;
    const settings = await getSettings();
    const push = await notifyUser(data.user_id, {
      kind: "reply",
      title: `♡ ${settings.general.adamName} ti ha risposto`,
      body: text.slice(0, 200),
      path: "/viola/adam",
    });
    await audit({ adminId: admin.id, action: "request_responded", table: "adam_requests", targetId: requestId });
    refresh();
    return { pushed: push.delivered };
  });
}

export async function markMessageRead(messageId: string, read = true) {
  return safeAction(async () => {
    await assertAdmin();
    if (!id.safeParse(messageId).success) throw new UserError("Messaggio non valido");
    const supabase = await createClient();
    const { error } = await supabase.from("messages").update({ read_at: read ? new Date().toISOString() : null }).eq("id", messageId);
    if (error) throw error;
    refresh();
    return {};
  });
}

export async function replyToMessage(messageId: string, reply: string) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!id.safeParse(messageId).success) throw new UserError("Messaggio non valido");
    const text = z.string().trim().min(1, "Scrivi una risposta").max(5000).parse(reply);
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("messages").update({ reply: text, responded_at: now, read_at: now }).eq("id", messageId).select("sender_id").single();
    if (error) throw error;
    const settings = await getSettings();
    const push = await notifyUser(data.sender_id, {
      kind: "reply",
      title: `♡ ${settings.general.adamName} ti ha risposto`,
      body: text.slice(0, 200),
      path: "/viola/scrivi",
    });
    await audit({ adminId: admin.id, action: "message_replied", table: "messages", targetId: messageId });
    refresh();
    return { pushed: push.delivered };
  });
}

export async function deleteMessageAdmin(messageId: string) {
  return safeAction(async () => {
    const admin = await assertAdmin();
    if (!id.safeParse(messageId).success) throw new UserError("Messaggio non valido");
    const supabase = await createClient();
    const { data: before } = await supabase.from("messages").select("*").eq("id", messageId).maybeSingle();
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) throw error;
    await audit({ adminId: admin.id, action: "delete", table: "messages", targetId: messageId, before });
    refresh();
    return {};
  });
}
