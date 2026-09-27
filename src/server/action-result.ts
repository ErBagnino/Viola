import "server-only";
import { HttpError } from "@/server/auth";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const FRIENDLY_ERROR = "Ops, qualcosa si è inceppato. Riproviamo. ♡";

/** Wraps a server action body: never leaks internal errors to the client. */
export async function safeAction<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const out = await fn();
    return { ok: true, ...out };
  } catch (e) {
    if (e instanceof HttpError) return { ok: false, error: e.message };
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: FRIENDLY_ERROR };
  }
}

/** An error whose message is safe to show to the user. */
export class UserError extends Error {}

/** Adam walking through Viola's app ("Vedi come Viola"): nothing is saved or sent. */
export const PREVIEW_ONLY = "Sei in \"Vedi come Viola\": qui non salvo e non invio niente. ♡";

export function assertNotPreview(viewer: { role: string }) {
  if (viewer.role === "admin") throw new UserError(PREVIEW_ONLY);
}
