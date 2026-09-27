-- =====================================================================
-- Viola × Adam — Row Level Security, grants and RPCs
--
-- Principles
--   * anon (not logged in) can read NOTHING.
--   * "member" = admin (Adam) or user (Viola). Pending accounts see nothing.
--   * Viola reads published content + her own data.
--   * Private journal entries / unshared moods are invisible to the admin.
--   * Adam (admin) manages content. No "allow all" policies anywhere.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Grants (defence in depth on top of RLS)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Tables the client must never write to directly (server / RPC only)
revoke insert, update, delete on public.notification_events from authenticated;
revoke insert, update, delete on public.ai_usage_daily from authenticated;
revoke update, delete on public.admin_audit_logs from authenticated;

-- profiles: users may only touch harmless columns (never `role`)
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, nickname, onboarded_at) on public.profiles to authenticated;

-- messages: Viola writes body/category/privacy; Adam writes read/reply state
revoke insert, update on public.messages from authenticated;
grant insert (body, category, is_private) on public.messages to authenticated;
grant update (read_at, responded_at, reply) on public.messages to authenticated;

-- adam_requests: Viola only writes the message; Adam manages the status
revoke insert, update on public.adam_requests from authenticated;
grant insert (message) on public.adam_requests to authenticated;
grant update (status, response, seen_at, responded_at, closed_at) on public.adam_requests to authenticated;

-- open_when_cards / time_capsules counters are only changed via RPC
-- (admins still have full write access through the policies below)

grant execute on function public.app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member() to authenticated;

-- ---------------------------------------------------------------------
-- Enable RLS on every public table
-- ---------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------
create policy app_settings_select on public.app_settings for select to authenticated
  using ((select public.is_admin()) or (is_public and (select public.is_member())));
create policy app_settings_admin_insert on public.app_settings for insert to authenticated
  with check ((select public.is_admin()));
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy app_settings_admin_delete on public.app_settings for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Admin-managed content: generated policies
--   read_rule : what a member (Viola) may read
--   admins can always read and write everything in these tables
-- ---------------------------------------------------------------------
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('media',               'visibility = ''shared'''),
      ('dedications',         'is_published and (publish_at is null or publish_at <= now())'),
      ('memories',            'is_published'),
      ('comfort_actions',     'is_active'),
      ('breathing_presets',   'is_active'),
      ('breathing_media',     'is_active'),
      ('grounding_exercises', 'is_active'),
      ('countdowns',          'is_published'),
      ('time_capsules',       'is_published and unlock_at <= now()'),
      ('open_when_cards',     'is_published'),
      ('daily_surprises',     'is_published and (scheduled_on is null or scheduled_on <= (now() at time zone ''Europe/Rome'')::date)'),
      ('home_modules',        'is_enabled'),
      ('phrases',             'is_active'),
      ('quiz_questions',      'is_active'),
      ('audio_items',         'is_published'),
      ('ai_memory',           'enabled and visible_to_viola')
    ) as v(tbl, read_rule)
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_admin()) or ((select public.is_member()) and (%s)))',
      spec.tbl || '_select', spec.tbl, spec.read_rule);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      spec.tbl || '_admin_insert', spec.tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      spec.tbl || '_admin_update', spec.tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      spec.tbl || '_admin_delete', spec.tbl);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- messages (Viola -> Adam)
-- ---------------------------------------------------------------------
create policy messages_select on public.messages for select to authenticated
  using (sender_id = (select auth.uid()) or (select public.is_admin()));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_member()));
create policy messages_admin_update on public.messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy messages_delete on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- journal_entries — private by default, admin sees only shared ones
-- ---------------------------------------------------------------------
create policy journal_select on public.journal_entries for select to authenticated
  using (user_id = (select auth.uid()) or ((select public.is_admin()) and visibility = 'shared'));
create policy journal_insert on public.journal_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy journal_update on public.journal_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy journal_delete on public.journal_entries for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- mood_entries — admin sees only shared ones
-- ---------------------------------------------------------------------
create policy mood_select on public.mood_entries for select to authenticated
  using (user_id = (select auth.uid()) or ((select public.is_admin()) and shared));
create policy mood_insert on public.mood_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy mood_update on public.mood_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy mood_delete on public.mood_entries for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- adam_requests ("Ho bisogno di Adam")
-- ---------------------------------------------------------------------
create policy adam_requests_select on public.adam_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy adam_requests_insert on public.adam_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy adam_requests_admin_update on public.adam_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy adam_requests_delete on public.adam_requests for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- activity_events
-- ---------------------------------------------------------------------
create policy activity_select on public.activity_events for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy activity_insert on public.activity_events for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy activity_delete on public.activity_events for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- notification_subscriptions (own only) / notification_events (admin read)
-- ---------------------------------------------------------------------
create policy push_subs_select on public.notification_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subs_insert on public.notification_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy push_subs_update on public.notification_subscriptions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_subs_delete on public.notification_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy notification_events_select on public.notification_events for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- AI conversations / messages (strictly own)
-- ---------------------------------------------------------------------
create policy ai_conv_select on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()));
create policy ai_conv_insert on public.ai_conversations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_member())
    and (scope = 'viola' or (select public.is_admin()))
  );
create policy ai_conv_update on public.ai_conversations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (scope = 'viola' or (select public.is_admin())));
create policy ai_conv_delete on public.ai_conversations for delete to authenticated
  using (user_id = (select auth.uid()));

create policy ai_msg_select on public.ai_messages for select to authenticated
  using (user_id = (select auth.uid()));
create policy ai_msg_insert on public.ai_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy ai_msg_update on public.ai_messages for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ai_msg_delete on public.ai_messages for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- AI tool logs / usage / audit
-- ---------------------------------------------------------------------
create policy ai_tool_logs_select on public.ai_tool_logs for select to authenticated
  using ((select public.is_admin()));
create policy ai_tool_logs_insert on public.ai_tool_logs for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()) and (scope = 'viola' or (select public.is_admin())));
create policy ai_tool_logs_admin_update on public.ai_tool_logs for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy ai_usage_select on public.ai_usage_daily for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy audit_select on public.admin_audit_logs for select to authenticated
  using ((select public.is_admin()));
create policy audit_insert on public.admin_audit_logs for insert to authenticated
  with check ((select public.is_admin()) and admin_id = (select auth.uid()));

-- =====================================================================
-- RPCs
-- =====================================================================

-- Time capsules: list without leaking the body of locked letters
create or replace function public.list_time_capsules()
returns table (
  id uuid,
  title text,
  teaser text,
  unlock_at timestamptz,
  is_unlocked boolean,
  opened_at timestamptz,
  media_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.teaser, c.unlock_at,
         c.unlock_at <= now() as is_unlocked,
         c.opened_at,
         case when c.unlock_at <= now() then c.media_id else null end
  from public.time_capsules c
  where c.is_published and (select public.is_member())
  order by c.unlock_at asc;
$$;

create or replace function public.mark_capsule_opened(capsule_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.time_capsules
     set opened_at = coalesce(opened_at, now())
   where id = capsule_id
     and is_published
     and unlock_at <= now()
     and (select public.is_member());
$$;

create or replace function public.mark_open_when_opened(card_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.open_when_cards
     set opened_count = opened_count + 1,
         last_opened_at = now()
   where id = card_id
     and is_published
     and (select public.is_member());
$$;

-- AI usage counters: members can only increment their own counters
create or replace function public.increment_ai_usage(
  p_scope text,
  p_requests integer,
  p_input_tokens integer,
  p_output_tokens integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_member()) then
    raise exception 'not allowed';
  end if;
  if p_scope not in ('viola', 'copilot') or (p_scope = 'copilot' and not (select public.is_admin())) then
    raise exception 'invalid scope';
  end if;
  if p_requests < 0 or p_input_tokens < 0 or p_output_tokens < 0
     or p_requests > 20 or p_input_tokens > 2000000 or p_output_tokens > 200000 then
    raise exception 'invalid usage values';
  end if;

  insert into public.ai_usage_daily as u (day, user_id, scope, requests, input_tokens, output_tokens)
  values ((now() at time zone 'Europe/Rome')::date, (select auth.uid()), p_scope, p_requests, p_input_tokens, p_output_tokens)
  on conflict (day, user_id, scope) do update
    set requests = u.requests + excluded.requests,
        input_tokens = u.input_tokens + excluded.input_tokens,
        output_tokens = u.output_tokens + excluded.output_tokens;
end;
$$;

-- Cost control numbers for the admin dashboard
create or replace function public.admin_usage_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not (select public.is_admin()) then
    raise exception 'not allowed';
  end if;
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'media_bytes', coalesce((select sum(size_bytes) from public.media), 0),
    'media_count', (select count(*) from public.media),
    'notifications_month', (
      select coalesce(jsonb_object_agg(channel, n), '{}'::jsonb) from (
        select channel, count(*) as n from public.notification_events
        where created_at >= date_trunc('month', now()) and status = 'sent'
        group by channel
      ) s
    )
  ) into result;
  return result;
end;
$$;

grant execute on function public.list_time_capsules() to authenticated;
grant execute on function public.mark_capsule_opened(uuid) to authenticated;
grant execute on function public.mark_open_when_opened(uuid) to authenticated;
grant execute on function public.increment_ai_usage(text, integer, integer, integer) to authenticated;
grant execute on function public.admin_usage_stats() to authenticated;
