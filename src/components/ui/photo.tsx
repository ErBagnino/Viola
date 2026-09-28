"use client";

import { useState, type CSSProperties } from "react";
import { HeartFlower } from "@/components/decor/stars";
import { cn } from "@/utils/cn";
import { aspectKind, aspectRatioOf, fitFor, focusPosition, naturalFrame, type PhotoSrc } from "@/utils/photo-fit";

// ---------------------------------------------------------------------------
// Smart photo display. A photo is never stretched: it is either shown whole
// or cropped a little (keeping the subject position chosen by Adam), and when
// a whole photo would leave big empty bands, the bands are filled with a
// soft, blurred copy of the same photo instead of white.
// ---------------------------------------------------------------------------

export { aspectKind, aspectRatioOf, CROP_TOLERANCE, fitFor, FOCUS_POSITION, focusPosition, naturalFrame } from "@/utils/photo-fit";
export type { AspectKind, Fit, PhotoFocus, PhotoSrc } from "@/utils/photo-fit";

type Props = {
  photo: PhotoSrc | null | undefined;
  alt: string;
  /** frame aspect ratio (w/h), or "natural" = follow the photo within limits */
  frame?: number | "natural";
  /** "smart" (default): light crop or blurred fill, whichever keeps the photo nicer */
  mode?: "cover" | "contain" | "smart";
  /** limits for "natural" frames */
  minRatio?: number;
  maxRatio?: number;
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  loading?: "lazy" | "eager";
  /** use the small version for the photo itself (grids) */
  useThumb?: boolean;
  /** text under the icon when the photo cannot be shown */
  fallbackText?: string;
  draggable?: boolean;
};

/**
 * Ref callback for an <img>: a server-rendered photo can fail before React takes
 * over the page, and then onError never fires. Once the element is attached,
 * "complete with no pixels" means it is broken.
 */
export const brokenRef = (onBroken: () => void) => (el: HTMLImageElement | null) => {
  if (el && el.getAttribute("src") && el.complete && el.naturalWidth === 0) onBroken();
};

/** Elegant placeholder when a photo is missing or cannot be loaded. */
export function PhotoFallback({ className, text }: { className?: string; text?: string }) {
  return (
    <span className={cn("absolute inset-0 grid place-items-center bg-gradient-to-br from-tint-50 to-blush-100 text-vio-400", className)} role="img" aria-label={text ?? "Foto non disponibile"}>
      <span className="grid place-items-center gap-1 text-center">
        <HeartFlower className="size-10 opacity-60" color="currentColor" strokeWidth={40} />
        {text && <span className="px-2 text-xs font-bold text-ink-muted">{text}</span>}
      </span>
    </span>
  );
}

export function Photo({
  photo,
  alt,
  frame = "natural",
  mode = "smart",
  minRatio,
  maxRatio,
  className,
  imgClassName,
  imgStyle,
  loading = "lazy",
  useThumb,
  fallbackText,
  draggable = false,
}: Props) {
  const [broken, setBroken] = useState<string | null>(null);
  const src = photo ? (useThumb && photo.thumbUrl ? photo.thumbUrl : photo.url) : null;
  const ratio = aspectRatioOf(photo?.width, photo?.height);
  const frameRatio = frame === "natural" ? naturalFrame(ratio, minRatio, maxRatio) : frame;
  const fit = fitFor(ratio, frameRatio, mode);
  const failed = !src || broken === src;
  const kind = aspectKind(ratio);
  const checkBroken = brokenRef(() => src && setBroken(src));

  // Size unknown (old uploads): never guess a crop, show the whole photo at its own height.
  if (frame === "natural" && ratio === null && !failed) {
    return (
      <span className={cn("relative block overflow-hidden bg-tint-50", className)} data-fit="natural" data-aspect="unknown">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={checkBroken} src={src} alt={alt} loading={loading} decoding="async" onError={() => setBroken(src)} draggable={draggable} className={cn("block h-auto w-full", imgClassName)} style={imgStyle} />
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-tint-50", className)} style={{ aspectRatio: frameRatio }} data-fit={failed ? "fallback" : fit} data-aspect={kind ?? "unknown"}>
      {failed ? (
        <PhotoFallback text={fallbackText} />
      ) : (
        <>
          {fit === "ambient" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo?.thumbUrl || src}
              alt=""
              aria-hidden
              loading={loading}
              decoding="async"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl saturate-[0.8]"
              draggable={false}
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={checkBroken}
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            width={photo?.width ?? undefined}
            height={photo?.height ?? undefined}
            onError={() => setBroken(src)}
            draggable={draggable}
            className={cn("absolute inset-0 h-full w-full", fit === "cover" ? "object-cover" : "object-contain", fit === "ambient" && "drop-shadow-[0_6px_18px_rgb(0_0_0/0.18)]", imgClassName)}
            style={{ objectPosition: fit === "cover" ? focusPosition(photo?.focus) : "50% 50%", ...imgStyle }}
          />
        </>
      )}
    </span>
  );
}
