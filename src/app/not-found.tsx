import Link from "next/link";
import { HeartFlower } from "@/components/decor/stars";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <HeartFlower className="size-20 text-wine-400" />
      <h1 className="mt-6 font-display text-3xl font-semibold text-vio-900">Questa stanza non esiste.</h1>
      <p className="mt-2 text-lg text-ink-soft">Ma la casa è ancora tutta qui. ♡</p>
      <Link href="/" className="press btn-3d mt-6 rounded-2xl bg-gradient-to-b from-wine-500 to-wine-700 px-6 py-3 font-bold text-white">
        Torna a casa
      </Link>
    </main>
  );
}
