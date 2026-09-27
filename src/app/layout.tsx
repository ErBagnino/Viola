import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/features/pwa/service-worker-register";
import { splashScreens } from "@/features/pwa/splash-screens";
import { getSystemSettings } from "@/server/settings";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  // SOFT gives the rounded, gentle headings; WONK is never used, so it is not downloaded.
  axes: ["SOFT", "opsz"],
  display: "swap",
});
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
// Handwriting is decorative and appears below the fold: no preload.
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSystemSettings();
  return {
    title: { default: general.appName, template: `%s · ${general.appName}` },
    description: "Un piccolo mondo digitale creato da Adam per Viola.",
    applicationName: general.appName,
    robots: { index: false, follow: false },
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { telephone: false, email: false, address: false },
    // Older iOS versions still look for this tag to open the PWA full screen.
    other: { "apple-mobile-web-app-capable": "yes" },
    appleWebApp: {
      capable: true,
      title: general.shortName,
      statusBarStyle: "default",
      startupImage: splashScreens,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0b0c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${fraunces.variable} ${nunito.variable} ${caveat.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
