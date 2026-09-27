// Browser-side wrapper for server actions.
// Server actions already turn their own failures into { ok: false, error },
// but a dropped connection (or a crashed request) makes the call itself
// throw — and inside a transition that would replace the whole screen with
// the error page. Here it becomes a normal, human message instead.

export const OFFLINE_ERROR = "Sembra che manchi la connessione. Riprova tra poco ♡";
export const NETWORK_ERROR = "Non riesco a raggiungere l'app in questo momento. Riprova tra poco ♡";

type Failure = { ok: false; error: string };

function isFrameworkSignal(e: unknown) {
  // redirect() / notFound() travel as errors with a NEXT_* digest: let them through.
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_");
}

export function networkErrorMessage() {
  return typeof navigator !== "undefined" && navigator.onLine === false ? OFFLINE_ERROR : NETWORK_ERROR;
}

export async function callAction<R extends { ok: boolean }>(run: () => Promise<R>): Promise<R | Failure> {
  try {
    return await run();
  } catch (e) {
    if (isFrameworkSignal(e)) throw e;
    console.warn("[action] call failed", e);
    return { ok: false, error: networkErrorMessage() };
  }
}

/** Same, for fire-and-forget calls whose result is not needed. */
export async function callQuietly(run: () => Promise<unknown>) {
  try {
    await run();
  } catch {
    /* never block the UI */
  }
}
