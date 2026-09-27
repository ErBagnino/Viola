#!/usr/bin/env node
// Creates (or updates) an account and assigns its role.
//
//   npm run create-user -- --email adam@example.com --password "..." --role admin --name Adam
//   npm run create-user -- --email viola@example.com --password "..." --role user --name Viola
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (reads .env.local).
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const { email, password, role = "user", name } = args;
if (!email || !password || !["admin", "user"].includes(role)) {
  console.error('Uso: npm run create-user -- --email x@y.z --password "segreta" --role admin|user [--name Nome]');
  process.exit(1);
}
if (password.length < 8) {
  console.error("La password deve avere almeno 8 caratteri.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (in .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(mail) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === mail.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser(email);
if (user) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { role },
    user_metadata: { display_name: name ?? user.user_metadata?.display_name },
  });
  if (error) throw error;
  console.log(`Utente esistente aggiornato: ${email}`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { display_name: name ?? email.split("@")[0] },
  });
  if (error) throw error;
  user = data.user;
  console.log(`Utente creato: ${email}`);
}

const { error: pErr } = await supabase
  .from("profiles")
  .upsert({ id: user.id, role, display_name: name ?? null }, { onConflict: "id" });
if (pErr) throw pErr;
console.log(`Ruolo assegnato: ${role === "admin" ? "ADMIN (Adam)" : "USER (Viola)"} ✓`);
