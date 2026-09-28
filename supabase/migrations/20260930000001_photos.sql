-- =====================================================================
-- Vio ♡ — photos: place, subject position and batch editing
-- (safe to run more than once)
--
-- * media.place  — where the photo was taken (shown under the photo)
-- * media.focus  — which part to keep visible when a frame must crop the
--                  photo (centre / top / bottom / left / right)
-- * admin_batch_update_media  — edits many photos in ONE statement:
--   only the fields present in `patch` change, everything else is left
--   exactly as it was. Runs with the caller's rights (RLS applies) and
--   refuses anyone who is not the admin.
-- * admin_restore_media — "Annulla": puts back the values saved before a
--   batch, only on photos nobody touched after it.
-- =====================================================================

alter table public.media add column if not exists place text;
alter table public.media add column if not exists focus text not null default 'center';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'media_place_len') then
    alter table public.media add constraint media_place_len check (place is null or char_length(place) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_focus_check') then
    alter table public.media add constraint media_focus_check check (focus in ('center', 'top', 'bottom', 'left', 'right'));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Batch update
-- patch keys (all optional; a missing key = "non modificare"):
--   category, taken_on, place, caption  (text / date; "" or null = empty)
--   visibility, focus                    (text, checked by the table)
--   featured, include_in_random          (boolean)
--   tags_add, tags_remove, contexts_add, contexts_remove (text arrays)
-- Returns, for every photo really updated, its previous values.
-- ---------------------------------------------------------------------
create or replace function public.admin_batch_update_media(media_ids uuid[], patch jsonb)
returns table (id uuid, previous jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allowed constant text[] := array[
    'category', 'taken_on', 'place', 'caption', 'visibility', 'focus', 'featured', 'include_in_random',
    'tags_add', 'tags_remove', 'contexts_add', 'contexts_remove'
  ];
  tags_add text[] := coalesce(array(select jsonb_array_elements_text(patch -> 'tags_add')), '{}');
  tags_remove text[] := coalesce(array(select jsonb_array_elements_text(patch -> 'tags_remove')), '{}');
  ctx_add text[] := coalesce(array(select jsonb_array_elements_text(patch -> 'contexts_add')), '{}');
  ctx_remove text[] := coalesce(array(select jsonb_array_elements_text(patch -> 'contexts_remove')), '{}');
begin
  if not (select public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(cardinality(media_ids), 0) = 0 or cardinality(media_ids) > 1000 then
    raise exception 'select between 1 and 1000 photos' using errcode = '22023';
  end if;
  if jsonb_typeof(patch) is distinct from 'object' or patch = '{}'::jsonb
     or exists (select 1 from jsonb_object_keys(patch) k where k <> all (allowed)) then
    raise exception 'invalid patch' using errcode = '22023';
  end if;

  return query
  with prev as (
    select m.id, m.category, m.taken_on, m.place, m.caption, m.visibility, m.focus, m.featured,
           m.include_in_random, m.tags, m.contexts, m.breathing_enabled, m.ai_avatar_enabled,
           case when patch ? 'contexts_add' or patch ? 'contexts_remove'
                then array(select distinct c from unnest(m.contexts || ctx_add) c where c <> all (ctx_remove) order by c)
                else m.contexts end as next_contexts
    from public.media m
    where m.id = any (media_ids)
    for update
  )
  update public.media m set
    category = case when patch ? 'category' then nullif(btrim(patch ->> 'category'), '') else m.category end,
    taken_on = case when patch ? 'taken_on' then nullif(patch ->> 'taken_on', '')::date else m.taken_on end,
    place = case when patch ? 'place' then nullif(btrim(patch ->> 'place'), '') else m.place end,
    caption = case when patch ? 'caption' then nullif(btrim(patch ->> 'caption'), '') else m.caption end,
    visibility = case when patch ? 'visibility' then patch ->> 'visibility' else m.visibility end,
    focus = case when patch ? 'focus' then patch ->> 'focus' else m.focus end,
    featured = case when patch ? 'featured' then (patch ->> 'featured')::boolean else m.featured end,
    include_in_random = case when patch ? 'include_in_random' then (patch ->> 'include_in_random')::boolean else m.include_in_random end,
    tags = case when patch ? 'tags_add' or patch ? 'tags_remove'
                then array(select distinct t from unnest(m.tags || tags_add) t where t <> all (tags_remove) order by t)
                else m.tags end,
    contexts = prev.next_contexts,
    -- flags always follow the contexts (same rule as the single editor)
    breathing_enabled = case when patch ? 'contexts_add' or patch ? 'contexts_remove' then 'breathing' = any (prev.next_contexts) else m.breathing_enabled end,
    ai_avatar_enabled = case when patch ? 'contexts_add' or patch ? 'contexts_remove' then 'adam_ai' = any (prev.next_contexts) else m.ai_avatar_enabled end
  from prev
  where m.id = prev.id
  returning m.id,
    jsonb_build_object(
      'category', prev.category, 'taken_on', prev.taken_on, 'place', prev.place, 'caption', prev.caption,
      'visibility', prev.visibility, 'focus', prev.focus, 'featured', prev.featured,
      'include_in_random', prev.include_in_random, 'tags', to_jsonb(prev.tags), 'contexts', to_jsonb(prev.contexts),
      'breathing_enabled', prev.breathing_enabled, 'ai_avatar_enabled', prev.ai_avatar_enabled
    ),
    m.updated_at;
end;
$$;

-- ---------------------------------------------------------------------
-- Undo a batch: `snapshot` = [{ id, <field>: <previous value>, ... }].
-- Only photos still exactly as the batch left them (updated_at unchanged)
-- are restored; the others were edited meanwhile and are left alone.
-- ---------------------------------------------------------------------
create or replace function public.admin_restore_media(snapshot jsonb, batch_updated_at timestamptz)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(snapshot) is distinct from 'array' or jsonb_array_length(snapshot) > 1000 then
    raise exception 'invalid snapshot' using errcode = '22023';
  end if;

  return query
  update public.media m set
    category = case when s ? 'category' then s ->> 'category' else m.category end,
    taken_on = case when s ? 'taken_on' then (s ->> 'taken_on')::date else m.taken_on end,
    place = case when s ? 'place' then s ->> 'place' else m.place end,
    caption = case when s ? 'caption' then s ->> 'caption' else m.caption end,
    visibility = case when s ? 'visibility' then s ->> 'visibility' else m.visibility end,
    focus = case when s ? 'focus' then s ->> 'focus' else m.focus end,
    featured = case when s ? 'featured' then (s ->> 'featured')::boolean else m.featured end,
    include_in_random = case when s ? 'include_in_random' then (s ->> 'include_in_random')::boolean else m.include_in_random end,
    tags = case when s ? 'tags' then array(select jsonb_array_elements_text(s -> 'tags')) else m.tags end,
    contexts = case when s ? 'contexts' then array(select jsonb_array_elements_text(s -> 'contexts')) else m.contexts end,
    breathing_enabled = case when s ? 'breathing_enabled' then (s ->> 'breathing_enabled')::boolean else m.breathing_enabled end,
    ai_avatar_enabled = case when s ? 'ai_avatar_enabled' then (s ->> 'ai_avatar_enabled')::boolean else m.ai_avatar_enabled end
  from jsonb_array_elements(snapshot) s
  where m.id = (s ->> 'id')::uuid
    and m.updated_at = batch_updated_at
  returning m.id;
end;
$$;

revoke execute on function public.admin_batch_update_media(uuid[], jsonb) from public, anon;
revoke execute on function public.admin_restore_media(jsonb, timestamptz) from public, anon;
grant execute on function public.admin_batch_update_media(uuid[], jsonb) to authenticated;
grant execute on function public.admin_restore_media(jsonb, timestamptz) to authenticated;
