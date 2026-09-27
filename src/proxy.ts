import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, icons, the service worker and the manifest.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|apple-touch-icon.png|icons/|splash/|sw.js|manifest.webmanifest|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
