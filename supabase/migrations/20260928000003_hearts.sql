-- =====================================================================
-- Vio ♡ — "Cuore a distanza" (safe to run more than once)
--
-- One tap = "I'm thinking of you". Viola sends a heart, Adam sees it (and
-- gets a gentle, rate-limited notification) and can send one back.
-- Only the two members can see or send hearts.
-- =====================================================================

create table if not exists public.hearts (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists hearts_created_idx on public.hearts (created_at desc);

alter table public.hearts enable row level security;

revoke all on public.hearts from anon;
grant select, insert, delete on public.hearts to authenticated;
grant update (seen_at) on public.hearts to authenticated;
grant all on public.hearts to service_role;

drop policy if exists hearts_select on public.hearts;
drop policy if exists hearts_insert on public.hearts;
drop policy if exists hearts_mark_seen on public.hearts;
drop policy if exists hearts_delete_own on public.hearts;

-- a two-person exchange: both members see both directions
create policy hearts_select on public.hearts for select to authenticated
  using ((select public.is_member()));
-- you can only send hearts as yourself
create policy hearts_insert on public.hearts for insert to authenticated
  with check (from_user = (select auth.uid()) and (select public.is_member()));
-- you can only mark as seen the hearts you RECEIVED (column grant: seen_at only)
create policy hearts_mark_seen on public.hearts for update to authenticated
  using ((select public.is_member()) and from_user <> (select auth.uid()))
  with check ((select public.is_member()) and from_user <> (select auth.uid()));
-- and delete only your own (privacy: "cancella i miei dati")
create policy hearts_delete_own on public.hearts for delete to authenticated
  using (from_user = (select auth.uid()));
