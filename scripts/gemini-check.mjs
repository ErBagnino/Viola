#!/usr/bin/env node
// Does the Gemini key really work? Run: npm run gemini:check
// Reads GEMINI_API_KEY (and GEMINI_MODEL) from the environment or .env.local,
// sends the smallest request and prints what Google answers. Never prints the key.
import { readFileSync, existsSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const fromFile = (name) => {
  if (!existsSync(".env.local")) return "";
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1) : "";
};
const clean = (v) => {
  v = (v ?? "").trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) v = v.slice(1, -1).trim();
  return v;
};
const key = clean(process.env.GEMINI_API_KEY || fromFile("GEMINI_API_KEY"));
const models = [clean(process.env.GEMINI_MODEL || fromFile("GEMINI_MODEL")), "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"].filter(Boolean);
if (!key) {
  console.log("✗ GEMINI_API_KEY mancante (né nell'ambiente né in .env.local).");
  process.exit(1);
}
console.log(`Chiave: ${key.slice(0, 4)}…**** (${key.length} caratteri)${/^AIza[0-9A-Za-z_-]{35}$/.test(key) ? "" : " — non ha la forma di una chiave AI Studio (AIza…, 39 caratteri)"}`);
const ai = new GoogleGenAI({ apiKey: key });
const explain = (e) => {
  const raw = String(e?.message ?? e);
  const reason = raw.match(/\\?"reason\\?"\s*:\s*\\?"([A-Z_]+)/)?.[1] ?? "";
  const msg = (raw.match(/\\?"message\\?"\s*:\s*\\?"([^"\\]+)/g) ?? []).map((m) => m.replace(/.*"/, "")).pop() ?? raw;
  return `HTTP ${e?.status ?? "—"} ${reason} ${msg}`.replace(/AIza[0-9A-Za-z_-]{8,}/g, "AIza…****").slice(0, 300);
};
try {
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const names = [];
  for await (const m of pager) names.push((m.name ?? "").replace(/^models\//, ""));
  console.log(`✓ Lista modelli: ${names.filter((n) => /^(gemini|gemma)-/.test(n)).length} modelli Gemini/Gemma`);
} catch (e) {
  console.log(`✗ Lista modelli: ${explain(e)}`);
}
for (const model of [...new Set(models)]) {
  const t0 = Date.now();
  try {
    const r = await ai.models.generateContent({ model, contents: "Rispondi solo con la parola OK.", config: { maxOutputTokens: 256, temperature: 0 } });
    console.log(`✓ ${model}: «${(r.text ?? "").trim()}» in ${Date.now() - t0} ms`);
    process.exit(0);
  } catch (e) {
    console.log(`✗ ${model}: ${explain(e)}`);
  }
}
process.exit(1);
