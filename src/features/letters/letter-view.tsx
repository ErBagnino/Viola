import { Markdown } from "@/components/ui/markdown";
import { Sparkle } from "@/components/decor/stars";
import { Photo, type PhotoSrc } from "@/components/ui/photo";

export type LetterMedia = (PhotoSrc & { title?: string | null }) | null;

/** A letter from Adam: photo, markdown body, optional audio, signature. */
export function LetterView({
  title,
  body,
  image,
  audioUrl,
  signature,
  eyebrow,
}: {
  title: string;
  body: string;
  image?: LetterMedia;
  audioUrl?: string | null;
  signature?: string | null;
  eyebrow?: string | null;
}) {
  return (
    <article className="relative">
      <Sparkle className="absolute -top-1 right-2 size-4 animate-twinkle text-peach-300" />
      {eyebrow && <p className="font-hand text-xl text-vio-500">{eyebrow}</p>}
      <h2 className="font-display text-[1.7rem] leading-tight font-semibold text-vio-900 text-balance">{title}</h2>
      {image && <Photo photo={image} alt={image.title ?? ""} frame="natural" className="mt-4 w-full rounded-3xl shadow-soft" />}
      {body && <Markdown className="mt-4 text-[17px] text-ink">{body}</Markdown>}
      {audioUrl && <audio src={audioUrl} controls preload="none" className="mt-4 w-full" />}
      {signature && <p className="mt-5 text-right font-hand text-2xl text-vio-600">{signature}</p>}
    </article>
  );
}
