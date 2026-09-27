import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Nunito } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/features/pwa/service-worker-register";
import { splashScreens } from "@/features/pwa/splash-screens";
import { getSystemSettings } from "@/server/settings";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSystemSettings();
  return {
    title: { default: general.appName, template: `%s · ${general.appName}` },
    description: "Un piccolo mondo digitale creato da Adam per Viola.",
    applicationName: general.appName,
    robots: { index: false, follow: false },
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: {
      capable: true,
      title: general.shortName,
      statusBarStyle: "default",
      startupImage: splashScreens,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fdf6ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${fraunces.variable} ${nunito.variable} ${caveat.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
