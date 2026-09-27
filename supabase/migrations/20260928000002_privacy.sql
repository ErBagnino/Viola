-- =====================================================================
-- Vio ♡ — Viola decides whether Adam sees her activity (safe to re-run)
--
-- Until now every "breathing completed / fear flow / game played" event was
-- visible to the admin. Viola can now switch that off from "La tua privacy".
-- Default stays on (same behaviour as before), and the page explains it.
-- =====================================================================

alter table public.profiles add column if not exists share_activity boolean not null default true;

-- She may change only this switch (still never `role`).
grant update (share_activity) on public.profiles to authenticated;
