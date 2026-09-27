-- =====================================================================
-- Vio ♡ — hardening (safe to run more than once)
--
-- Postgres grants EXECUTE on every new function to PUBLIC, and a
-- per-schema "alter default privileges" cannot take that back. So the RPCs
-- created in 20260927000002 were callable by anon (they returned nothing
-- or raised "not allowed", but anon must not reach them at all).
-- =====================================================================

revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.app_role(),
  public.is_admin(),
  public.is_member(),
  public.list_time_capsules(),
  public.mark_capsule_opened(uuid),
  public.mark_open_when_opened(uuid),
  public.increment_ai_usage(text, integer, integer, integer),
  public.admin_usage_stats()
to authenticated;
