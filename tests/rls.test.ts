import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the REAL migrations against an embedded Postgres with a minimal stub
// of Supabase's auth/storage schemas, then checks every important policy.

const ADAM = "00000000-0000-4000-8000-00000000000a";
const VIOLA = "00000000-0000-4000-8000-00000000000b";
const STRANGER = "00000000-0000-4000-8000-00000000000c";

const STUB = `
create schema if not exists extensions;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}'::jsonb, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
`;

let db: PGlite;

async function as<T>(who: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(who ? `set role authenticated; select set_config('request.jwt.claim.sub', '${who}', false);` : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}
const q = (sql: string, params: unknown[] = []) => db.query<Record<string, unknown>>(sql, params);
const rows = async (sql: string, params: unknown[] = []) => (await q(sql, params)).rows;
const fails = async (sql: string, params: unknown[] = []) => {
  try {
    await q(sql, params);
    return false;
  } catch {
    return true;
  }
};

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(STUB);
  const dir = path.resolve(import.meta.dirname, "../supabase/migrations");
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  await db.exec(readFileSync(path.resolve(import.meta.dirname, "../supabase/seed.sql"), "utf8"));
  await db.exec(`
    insert into auth.users (id, email, raw_app_meta_data) values
      ('${ADAM}', 'adam@x.it', '{"role":"admin"}'),
      ('${VIOLA}', 'viola@x.it', '{"role":"user"}'),
      ('${STRANGER}', 'someone@x.it', '{"role":"admin"}'::jsonb - 'role');
  `);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("profiles & roles", () => {
  it("the auth trigger assigns roles only from app_metadata", async () => {
    const r = await rows("select id, role from public.profiles order by id");
    expect(r.map((x) => x.role)).toEqual(["admin", "user", "pending"]);
  });

  it("Viola cannot promote herself, but can edit her nickname", async () => {
    expect(await as(VIOLA, () => fails(`update public.profiles set role = 'admin' where id = '${VIOLA}'`))).toBe(true);
    await as(VIOLA, () => q(`update public.profiles set nickname = 'Vio' where id = '${VIOLA}'`));
    expect((await rows(`select nickname, role from public.profiles where id = '${VIOLA}'`))[0]).toEqual({ nickname: "Vio", role: "user" });
  });
});

describe("anonymous and pending users see nothing", () => {
  it("anon has no table access at all", async () => {
    expect(await as(null, () => fails("select * from public.dedications"))).toBe(true);
    expect(await as(null, () => fails("select * from public.app_settings"))).toBe(true);
  });

  it("a pending account reads zero rows", async () => {
    const n = await as(STRANGER, async () => (await rows("select count(*)::int n from public.dedications"))[0].n);
    expect(n).toBe(0);
    expect(await as(STRANGER, () => fails("insert into public.messages (body) values ('hi')"))).toBe(true);
  });
});

describe("Viola (user)", () => {
  it("reads published content but not drafts", async () => {
    const ded = await as(VIOLA, async () => (await rows("select count(*)::int n from public.dedications"))[0].n);
    expect(ded).toBe(10);
    const drafts = await as(VIOLA, async () => (await rows("select count(*)::int n from public.memories"))[0].n);
    expect(drafts).toBe(0); // seed memories are drafts
    await q("update public.dedications set publish_at = now() + interval '5 days' where title = 'Promemoria'");
    const scheduled = await as(VIOLA, async () => (await rows("select count(*)::int n from public.dedications where title = 'Promemoria'"))[0].n);
    expect(scheduled).toBe(0);
  });

  it("cannot write admin content", async () => {
    expect(await as(VIOLA, () => fails("insert into public.dedications (title) values ('hack')"))).toBe(true);
    await as(VIOLA, () => q("update public.dedications set title = 'hack'"));
    expect((await rows("select count(*)::int n from public.dedications where title = 'hack'"))[0].n).toBe(0);
    await as(VIOLA, () => q("delete from public.comfort_actions"));
    expect((await rows("select count(*)::int n from public.comfort_actions"))[0].n).toBe(20);
  });

  it("writes messages but cannot forge read/reply fields", async () => {
    await as(VIOLA, () => q("insert into public.messages (body, category) values ('ti penso', 'love')"));
    expect(await as(VIOLA, () => fails("insert into public.messages (body, reply) values ('x', 'fake reply')"))).toBe(true);
    await as(VIOLA, () => q("update public.messages set reply = 'fake'"));
    expect((await rows("select count(*)::int n from public.messages where reply is not null"))[0].n).toBe(0);
    const mine = await as(VIOLA, () => rows("select sender_id from public.messages"));
    expect(mine.every((m) => m.sender_id === VIOLA)).toBe(true);
  });

  it("creates need-Adam requests with status NEW only", async () => {
    await as(VIOLA, () => q("insert into public.adam_requests (message) values ('aiuto')"));
    expect(await as(VIOLA, () => fails("insert into public.adam_requests (message, status) values ('x', 'closed')"))).toBe(true);
    expect((await rows("select status from public.adam_requests"))[0].status).toBe("new");
  });

  it("cannot read admin-only tables", async () => {
    await q("insert into public.notification_events (kind, channel, status) values ('test', 'telegram', 'sent')");
    expect(await as(VIOLA, async () => (await rows("select count(*)::int n from public.notification_events"))[0].n)).toBe(0);
    expect(await as(VIOLA, async () => (await rows("select count(*)::int n from public.admin_audit_logs"))[0].n)).toBe(0);
    expect(await as(VIOLA, () => fails(`insert into public.admin_audit_logs (admin_id, action) values ('${VIOLA}', 'x')`))).toBe(true);
    expect(await as(VIOLA, () => fails("insert into public.notification_events (kind, channel, status) values ('x', 'telegram', 'sent')"))).toBe(true);
  });

  it("only sees AI memory marked visible and enabled", async () => {
    await q("insert into public.ai_memory (key, value, visible_to_viola) values ('segreto', 'sorpresa di compleanno', false)");
    const keys = await as(VIOLA, () => rows("select key from public.ai_memory"));
    expect(keys.map((k) => k.key)).toEqual(["Soprannome"]);
  });

  it("cannot open copilot conversations or fake copilot usage", async () => {
    expect(await as(VIOLA, () => fails("insert into public.ai_conversations (scope) values ('copilot')"))).toBe(true);
    await as(VIOLA, () => q("insert into public.ai_conversations (scope) values ('viola')"));
    expect(await as(VIOLA, () => fails("select public.increment_ai_usage('copilot', 1, 1, 1)"))).toBe(true);
    expect(await as(VIOLA, () => fails("select public.increment_ai_usage('viola', -5, 0, 0)"))).toBe(true);
    await as(VIOLA, () => q("select public.increment_ai_usage('viola', 1, 100, 20)"));
    expect(await as(VIOLA, () => fails("update public.ai_usage_daily set requests = 0"))).toBe(true);
    expect((await rows("select requests from public.ai_usage_daily"))[0].requests).toBe(1);
  });
});

describe("privacy between Viola and Adam", () => {
  it("private journal pages are invisible to the admin; shared ones are readable", async () => {
    await as(VIOLA, () => q("insert into public.journal_entries (body, visibility) values ('solo mio', 'private'), ('per te', 'shared')"));
    const adamSees = await as(ADAM, () => rows("select body from public.journal_entries"));
    expect(adamSees.map((r) => r.body)).toEqual(["per te"]);
    expect(await as(ADAM, async () => { await q("delete from public.journal_entries"); return (await rows("select count(*)::int n from public.journal_entries")).length; })).toBe(1);
    expect((await rows("select count(*)::int n from public.journal_entries"))[0].n).toBe(2);
  });

  it("unshared moods are invisible to the admin", async () => {
    await as(VIOLA, () => q("insert into public.mood_entries (mood, shared) values (2, false), (4, true)"));
    const moods = await as(ADAM, () => rows("select mood from public.mood_entries"));
    expect(moods.map((m) => m.mood)).toEqual([4]);
  });

  it("AI conversations are strictly private to their owner", async () => {
    expect(await as(ADAM, async () => (await rows("select count(*)::int n from public.ai_conversations"))[0].n)).toBe(0);
  });
});

describe("time capsules", () => {
  it("never leak the body before the unlock date", async () => {
    await q(`insert into public.time_capsules (title, teaser, body, unlock_at) values ('futuro', 'presto', 'TESTO SEGRETO', now() + interval '10 days'), ('oggi', null, 'aperta', now() - interval '1 day')`);
    const direct = await as(VIOLA, () => rows("select title, body from public.time_capsules"));
    expect(direct.map((r) => r.title)).toEqual(["oggi"]);
    const listed = await as(VIOLA, () => rows("select * from public.list_time_capsules()"));
    expect(listed.map((r) => [r.title, r.is_unlocked])).toEqual([
      ["oggi", true],
      ["futuro", false],
    ]);
    expect(JSON.stringify(listed)).not.toContain("TESTO SEGRETO");
  });
});

describe("storage", () => {
  it("members can read only shared media files", async () => {
    await q(`insert into public.media (id, path, thumb_path, mime, visibility) values
      ('00000000-0000-4000-8000-0000000000f1', 'images/a/full.webp', 'images/a/thumb.webp', 'image/webp', 'shared'),
      ('00000000-0000-4000-8000-0000000000f2', 'images/b/full.webp', null, 'image/webp', 'private')`);
    await q(`insert into storage.objects (bucket_id, name) values ('media', 'images/a/full.webp'), ('media', 'images/a/thumb.webp'), ('media', 'images/b/full.webp'), ('media', 'orphan/x.webp')`);
    const seen = await as(VIOLA, () => rows("select name from storage.objects order by name"));
    expect(seen.map((r) => r.name)).toEqual(["images/a/full.webp", "images/a/thumb.webp"]);
    const admin = await as(ADAM, () => rows("select name from storage.objects"));
    expect(admin).toHaveLength(4);
    expect(await as(VIOLA, () => fails("insert into storage.objects (bucket_id, name) values ('media', 'images/hack.webp')"))).toBe(true);
  });
});

describe("Adam (admin)", () => {
  it("manages content and settings", async () => {
    await as(ADAM, () => q("insert into public.dedications (title) values ('nuova')"));
    await as(ADAM, () => q("insert into public.app_settings (key, value, is_public) values ('general', '{\"appName\":\"Casa\"}', true)"));
    await as(ADAM, () => q("insert into public.app_settings (key, value, is_public) values ('ai', '{}', false)"));
    expect(await as(VIOLA, () => fails("update public.app_settings set value = '{}'"))).toBe(false); // no error, but…
    expect((await rows("select value->>'appName' v from public.app_settings where key='general'"))[0].v).toBe("Casa"); // …nothing changed
    const visible = await as(VIOLA, () => rows("select key from public.app_settings"));
    expect(visible.map((r) => r.key)).toEqual(["general"]);
  });

  it("can update request status and read notification events", async () => {
    await as(ADAM, () => q("update public.adam_requests set status = 'seen', seen_at = now()"));
    expect((await rows("select status from public.adam_requests"))[0].status).toBe("seen");
    expect(await as(ADAM, async () => (await rows("select count(*)::int n from public.notification_events"))[0].n)).toBe(1);
  });

  it("audit log is append-only", async () => {
    await as(ADAM, () => q(`insert into public.admin_audit_logs (admin_id, action) values ('${ADAM}', 'test')`));
    expect(await as(ADAM, () => fails("delete from public.admin_audit_logs"))).toBe(true);
    expect(await as(ADAM, () => fails(`insert into public.admin_audit_logs (admin_id, action) values ('${VIOLA}', 'spoof')`))).toBe(true);
  });
});
