import type { MetadataRoute } from "next";
import { getSystemSettings } from "@/server/settings";

// Read on each request so the app name set in the admin is always current.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { general } = await getSystemSettings();
  return {
    id: "/",
    name: general.appName,
    short_name: general.shortName,
    description: "Un piccolo mondo digitale creato da Adam per Viola.",
    lang: "it",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#fdf6ec",
    categories: ["lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ho bisogno di Adam", url: "/viola/adam", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Respira", url: "/viola/calma/respira", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Adam AI", url: "/viola/ai", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
