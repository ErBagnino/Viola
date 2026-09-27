-- =====================================================================
-- Viola × Adam — schema
-- Every table lives in `public` and is protected by RLS (see the next
-- migration). Enumerations are plain text + CHECK constraints so they can
-- evolve without painful enum migrations.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profiles & roles
-- role: admin (Adam) | user (Viola) | pending (anyone else: no access)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'pending' check (role in ('admin', 'user', 'pending')),
  display_name text,
  nickname text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Role lookups used by every RLS policy. SECURITY DEFINER so they can read
-- profiles without recursing into profiles' own policies.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false);
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role in ('admin', 'user') from public.profiles where id = (select auth.uid())), false);
$$;

-- New auth user -> profile. The role can only be pre-assigned through
-- app_metadata, which only the service role can write (never the client).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_app_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case when requested in ('admin', 'user') then requested else 'pending' end,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- App settings (key/value, non-secret configuration)
-- ---------------------------------------------------------------------
create table public.app_settings (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Media library (images + audio in the private `media` bucket)
-- ---------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'image' check (kind in ('image', 'audio')),
  bucket text not null default 'media',
  path text not null unique,
  thumb_path text unique,
  mime text not null,
  size_bytes integer not null default 0 check (size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric,
  title text,
  caption text,
  taken_on date,
  category text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  include_in_random boolean not null default true,
  breathing_enabled boolean not null default false,
  ai_avatar_enabled boolean not null default false,
  contexts text[] not null default '{gallery}',
  visibility text not null default 'shared' check (visibility in ('shared', 'private')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index media_kind_idx on public.media (kind, visibility);
create index media_contexts_idx on public.media using gin (contexts);
create trigger media_touch before update on public.media
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------
create table public.dedications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 20000),
  category text not null default 'no_reason',
  media_id uuid references public.media (id) on delete set null,
  audio_id uuid references public.media (id) on delete set null,
  signature text,
  pinned boolean not null default false,
  position integer not null default 0,
  is_published boolean not null default true,
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dedications_category_idx on public.dedications (category);
create trigger dedications_touch before update on public.dedications
  for each row execute function public.touch_updated_at();

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 20000),
  kind text not null default 'moment',
  happened_on date,
  place text,
  media_id uuid references public.media (id) on delete set null,
  is_important boolean not null default false,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memories_date_idx on public.memories (happened_on desc nulls last);
create trigger memories_touch before update on public.memories
  for each row execute function public.touch_updated_at();

create table public.comfort_actions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  text text not null default '' check (char_length(text) <= 4000),
  category text not null default 'practical',
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 7200),
  icon text,
  media_id uuid references public.media (id) on delete set null,
  sound_id uuid references public.media (id) on delete set null,
  cta_label text,
  cta_action text not null default 'none',
  cta_url text,
  weight integer not null default 5 check (weight between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger comfort_actions_touch before update on public.comfort_actions
  for each row execute function public.touch_updated_at();

create table public.breathing_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  description text,
  inhale_seconds numeric not null default 4 check (inhale_seconds between 1 and 20),
  hold_seconds numeric not null default 4 check (hold_seconds between 0 and 30),
  exhale_seconds numeric not null default 6 check (exhale_seconds between 1 and 30),
  hold_after_exhale_seconds numeric not null default 0 check (hold_after_exhale_seconds between 0 and 30),
  rounds integer check (rounds is null or rounds between 1 and 200),
  visual text not null default 'heart',
  show_photos boolean not null default true,
  photo_mode text not null default 'blur_to_clear' check (photo_mode in ('blur_to_clear', 'fade', 'none')),
  texts text[] not null default '{}',
  audio_id uuid references public.media (id) on delete set null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger breathing_presets_touch before update on public.breathing_presets
  for each row execute function public.touch_updated_at();

create table public.breathing_media (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid references public.breathing_presets (id) on delete cascade,
  media_id uuid references public.media (id) on delete cascade,
  text text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger breathing_media_touch before update on public.breathing_media
  for each row execute function public.touch_updated_at();

create table public.grounding_exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null,
  description text,
  icon text,
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  end_text text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger grounding_exercises_touch before update on public.grounding_exercises
  for each row execute function public.touch_updated_at();

create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind text not null default 'custom',
  target_at timestamptz not null,
  icon text,
  media_id uuid references public.media (id) on delete set null,
  recurring_yearly boolean not null default false,
  show_on_home boolean not null default true,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger countdowns_touch before update on public.countdowns
  for each row execute function public.touch_updated_at();

create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  teaser text,
  body text not null default '' check (char_length(body) <= 30000),
  media_id uuid references public.media (id) on delete set null,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger time_capsules_touch before update on public.time_capsules
  for each row execute function public.touch_updated_at();

create table public.open_when_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '' check (char_length(body) <= 20000),
  media_id uuid references public.media (id) on delete set null,
  audio_id uuid references public.media (id) on delete set null,
  animation text not null default 'hearts',
  cta_action text not null default 'none',
  color text,
  icon text,
  position integer not null default 0,
  opened_count integer not null default 0,
  last_opened_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger open_when_cards_touch before update on public.open_when_cards
  for each row execute function public.touch_updated_at();

create table public.daily_surprises (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'phrase',
  title text not null,
  body text,
  media_id uuid references public.media (id) on delete set null,
  action text not null default 'none',
  scheduled_on date,
  weight integer not null default 5 check (weight between 0 and 100),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger daily_surprises_touch before update on public.daily_surprises
  for each row execute function public.touch_updated_at();

create table public.home_modules (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'action' check (type in ('action', 'widget')),
  action text,
  widget text,
  title text not null,
  subtitle text,
  icon text,
  color text,
  url text,
  size text not null default 'md' check (size in ('sm', 'md', 'lg')),
  position integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger home_modules_touch before update on public.home_modules
  for each row execute function public.touch_updated_at();

create table public.phrases (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  text text not null check (char_length(text) <= 1000),
  weight integer not null default 5 check (weight between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index phrases_kind_idx on public.phrases (kind);
create trigger phrases_touch before update on public.phrases
  for each row execute function public.touch_updated_at();

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options text[] not null check (array_length(options, 1) between 2 and 6),
  correct_index integer not null default 0 check (correct_index >= 0 and correct_index < 6),
  explanation text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger quiz_questions_touch before update on public.quiz_questions
  for each row execute function public.touch_updated_at();

create table public.audio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'voice',
  media_id uuid references public.media (id) on delete cascade,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger audio_items_touch before update on public.audio_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Viola's own data
-- ---------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  category text not null default 'thought',
  is_private boolean not null default false,
  read_at timestamptz,
  responded_at timestamptz,
  reply text check (reply is null or char_length(reply) <= 5000),
  created_at timestamptz not null default now()
);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text check (title is null or char_length(title) <= 200),
  body text not null check (char_length(body) between 1 and 20000),
  mood smallint check (mood is null or mood between 1 and 5),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_user_idx on public.journal_entries (user_id, created_at desc);
create trigger journal_entries_touch before update on public.journal_entries
  for each row execute function public.touch_updated_at();

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mood smallint check (mood is null or mood between 1 and 5),
  note text check (note is null or char_length(note) <= 2000),
  shared boolean not null default true,
  created_at timestamptz not null default now()
);
create index mood_user_idx on public.mood_entries (user_id, created_at desc);

-- "Ho bisogno di Adam"
create table public.adam_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'seen', 'responded', 'closed')),
  response text check (response is null or char_length(response) <= 2000),
  notified_channels text[] not null default '{}',
  notification_ok boolean not null default false,
  seen_at timestamptz,
  responded_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index adam_requests_status_idx on public.adam_requests (status, created_at desc);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type ~ '^[a-z0-9_]{2,60}$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_events_idx on public.activity_events (created_at desc);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  request_id uuid references public.adam_requests (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  channel text not null check (channel in ('telegram', 'webpush', 'whatsapp', 'none')),
  status text not null check (status in ('sent', 'failed', 'skipped', 'not_configured')),
  detail text,
  created_at timestamptz not null default now()
);
create index notification_events_idx on public.notification_events (created_at desc);

-- ---------------------------------------------------------------------
-- Adam AI
-- ---------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope text not null default 'viola' check (scope in ('viola', 'copilot')),
  mode text not null default 'general' check (mode in ('general', 'personal', 'comfort')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_touch before update on public.ai_conversations
  for each row execute function public.touch_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'model', 'note')),
  content text not null default '' check (char_length(content) <= 40000),
  actions jsonb not null default '[]'::jsonb,
  status text not null default 'ok' check (status in ('ok', 'error', 'stopped')),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_user_idx on public.ai_messages (user_id, created_at desc);

create table public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'fact',
  key text not null check (char_length(key) <= 200),
  value text not null check (char_length(value) <= 4000),
  enabled boolean not null default true,
  visible_to_viola boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger ai_memory_touch before update on public.ai_memory
  for each row execute function public.touch_updated_at();

create table public.ai_tool_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  scope text not null check (scope in ('viola', 'copilot')),
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  result jsonb,
  success boolean not null default false,
  status text not null default 'executed' check (status in ('executed', 'pending', 'confirmed', 'rejected', 'failed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index ai_tool_logs_idx on public.ai_tool_logs (created_at desc);

create table public.ai_usage_daily (
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('viola', 'copilot')),
  requests integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  primary key (day, user_id, scope)
);

-- ---------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_idx on public.admin_audit_logs (created_at desc);
