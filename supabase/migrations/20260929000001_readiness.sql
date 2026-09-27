-- =====================================================================
-- Vio ♡ — "Completa Vio ♡" checklist (safe to run more than once)
--
-- Almost every task is derived from the data that already exists. This
-- table only stores what the database cannot know: things Adam checked by
-- hand ("installed on Viola's phone", "offline tested") or optional tasks
-- marked as not needed. Admin only.
-- =====================================================================

create table if not exists public.readiness_checks (
  task_id text primary key check (task_id ~ '^[a-z0-9-]{2,60}$'),
  state text not null default 'done' check (state in ('done', 'skipped')),
  done_at timestamptz not null default now(),
  done_by uuid default auth.uid() references auth.users (id) on delete set null
);

alter table public.readiness_checks enable row level security;

revoke all on public.readiness_checks from anon;
grant select, insert, update, delete on public.readiness_checks to authenticated;
grant all on public.readiness_checks to service_role;

drop policy if exists readiness_admin_select on public.readiness_checks;
drop policy if exists readiness_admin_insert on public.readiness_checks;
drop policy if exists readiness_admin_update on public.readiness_checks;
drop policy if exists readiness_admin_delete on public.readiness_checks;

create policy readiness_admin_select on public.readiness_checks for select to authenticated
  using ((select public.is_admin()));
create policy readiness_admin_insert on public.readiness_checks for insert to authenticated
  with check ((select public.is_admin()));
create policy readiness_admin_update on public.readiness_checks for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy readiness_admin_delete on public.readiness_checks for delete to authenticated
  using ((select public.is_admin()));
