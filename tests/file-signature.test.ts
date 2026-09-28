import { describe, expect, it } from "vitest";
import { detectAudioType, detectImageType } from "@/utils/file-signature";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(new Array(16).fill(0)));

describe("magic-byte detection", () => {
  it("recognises allowed images", () => {
    expect(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectImageType(bytes("RIFF", [1, 2, 3, 4], "WEBP"))).toBe("image/webp");
  });

  it("rejects disguised files", () => {
    expect(detectImageType(bytes("<svg xmlns"))).toBeNull();
    expect(detectImageType(bytes("<html><script>"))).toBeNull();
    expect(detectImageType(bytes("GIF89a"))).toBeNull();
    expect(detectImageType(bytes("RIFF", [0, 0, 0, 0], "WAVE"))).toBeNull();
  });

  it("recognises audio formats", () => {
    expect(detectAudioType(bytes("ID3"))).toBe("audio/mpeg");
    expect(detectAudioType(bytes([0xff, 0xfb, 0x90]))).toBe("audio/mpeg");
    expect(detectAudioType(bytes([0, 0, 0, 0x20], "ftypM4A "))).toBe("audio/mp4");
    expect(detectAudioType(bytes("OggS"))).toBe("audio/ogg");
    expect(detectAudioType(bytes("RIFF", [0, 0, 0, 0], "WAVE"))).toBe("audio/wav");
    expect(detectAudioType(bytes([0x1a, 0x45, 0xdf, 0xa3]))).toBe("audio/webm");
    expect(detectAudioType(bytes("#!/bin/sh"))).toBeNull();
  });

  it("tells raw AAC (ADTS) apart from MP3, and reads Voice Memos files", () => {
    expect(detectAudioType(bytes([0xff, 0xf1, 0x50, 0x80]))).toBe("audio/aac"); // MPEG-4 ADTS
    expect(detectAudioType(bytes([0xff, 0xf9, 0x50, 0x80]))).toBe("audio/aac"); // MPEG-2 ADTS
    expect(detectAudioType(bytes([0xff, 0xfb, 0x90, 0x64]))).toBe("audio/mpeg"); // MP3 layer III
    expect(detectAudioType(bytes([0xff, 0xf3, 0x90, 0x64]))).toBe("audio/mpeg"); // MPEG-2 layer III
    // iPhone Voice Memos export: an MP4 container with the "M4A " brand
    expect(detectAudioType(bytes([0, 0, 0, 0x1c], "ftypM4A ", [0, 0, 0, 0], "M4A isom"))).toBe("audio/mp4");
    // Safari's MediaRecorder: "iso5"/"mp42" brands
    expect(detectAudioType(bytes([0, 0, 0, 0x18], "ftypiso5"))).toBe("audio/mp4");
  });
});
