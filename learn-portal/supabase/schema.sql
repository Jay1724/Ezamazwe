-- ============================================================
-- Ezamazwe Learn — schema v2 (learner / parent / admin model)
-- Run this once in the Supabase SQL editor. Replaces the v1 schema
-- (single-owner model) entirely — drops those tables first.
-- ============================================================

-- 1. Drop everything from any previous version of this portal
drop table if exists certificates cascade;
drop table if exists quizzes cascade;
drop table if exists lesson_progress cascade;
drop table if exists enrollments cascade;
drop table if exists lessons cascade;
drop table if exists modules cascade;
drop table if exists courses cascade;
drop table if exists learner_profiles cascade;
drop table if exists profiles cascade;
drop table if exists users cascade;
drop table if exists orders cascade;
drop view if exists course_progress cascade;
drop function if exists is_owner() cascade;
drop function if exists is_admin() cascade;
drop function if exists owns_learner_profile(uuid) cascade;
drop function if exists has_paid_access(uuid) cascade;
drop function if exists recalc_enrollment_progress() cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;

-- 2. Users (extends auth.users)
create table users (
  id uuid references auth.users primary key,
  email text not null,
  full_name text,
  role text not null default 'learner' check (role in ('learner', 'parent', 'admin')),
  created_at timestamptz default now()
);

-- 3. Learner profiles — self-managed (user_id set) or parent-managed (parent_user_id set)
create table learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  parent_user_id uuid references users(id) on delete cascade,
  display_name text not null,
  age_group text not null default 'adult' check (age_group in ('kids', 'teens', 'adult')),
  avatar text,
  created_at timestamptz default now(),
  constraint learner_profile_single_owner check (
    (user_id is not null and parent_user_id is null) or
    (user_id is null and parent_user_id is not null)
  )
);

-- 4. Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  category text,
  age_group text not null default 'all' check (age_group in ('kids', 'teens', 'adult', 'all')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  thumbnail_url text,
  instructor_name text,
  instructor_bio text,
  published boolean not null default false,
  created_at timestamptz default now()
);

-- 5. Modules
create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  order_index int not null default 0
);

-- 6. Lessons
create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  video_provider_id text, -- 'direct' | 'youtube' | 'vimeo' (null = no video yet)
  video_url text,
  duration_seconds int,
  resources jsonb not null default '[]'::jsonb, -- [{ "label": "...", "url": "..." }, ...]
  is_preview boolean not null default false
);

-- 7. Enrollments
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_profile_id uuid references learner_profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  progress_percent numeric not null default 0,
  completed_at timestamptz,
  unique (learner_profile_id, course_id)
);

-- 8. Lesson progress
create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references enrollments(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  completed boolean not null default false,
  last_watched_seconds int default 0,
  updated_at timestamptz default now(),
  unique (enrollment_id, lesson_id)
);

-- 9. Phase 2 — tables only, no UI yet
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  questions jsonb not null default '[]'::jsonb
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references enrollments(id) on delete cascade,
  issued_at timestamptz default now(),
  certificate_url text
);

-- 10. Signup trigger: creates the `users` row, and for self-service learners,
-- an auto-attached learner_profile. `role` is read from signup metadata but
-- clamped to learner/parent — a client can never self-assign 'admin' this way.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  chosen_role text;
begin
  chosen_role := coalesce(new.raw_user_meta_data ->> 'role', 'learner');
  if chosen_role not in ('learner', 'parent') then
    chosen_role := 'learner';
  end if;

  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', chosen_role);

  if chosen_role = 'learner' then
    insert into public.learner_profiles (user_id, display_name, age_group)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'My profile'), 'adult');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 11. Helpers for RLS (security definer avoids recursive policy lookups)
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin');
$$;

create or replace function owns_learner_profile(lp_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from learner_profiles
    where id = lp_id and (user_id = auth.uid() or parent_user_id = auth.uid())
  );
$$;

-- 12. Row Level Security
alter table users enable row level security;
create policy "read own user row" on users for select using (auth.uid() = id or is_admin());
create policy "update own user row" on users for update using (auth.uid() = id);

alter table learner_profiles enable row level security;
create policy "read own or managed learner profiles" on learner_profiles for select using (
  user_id = auth.uid() or parent_user_id = auth.uid() or is_admin()
);
create policy "create own or managed learner profiles" on learner_profiles for insert with check (
  user_id = auth.uid() or parent_user_id = auth.uid()
);
create policy "update own or managed learner profiles" on learner_profiles for update using (
  user_id = auth.uid() or parent_user_id = auth.uid()
);
create policy "delete managed learner profiles" on learner_profiles for delete using (
  parent_user_id = auth.uid()
);

alter table courses enable row level security;
create policy "read published courses" on courses for select using (published = true or is_admin());
create policy "admin writes courses" on courses for all using (is_admin()) with check (is_admin());

alter table modules enable row level security;
create policy "read modules of visible courses" on modules for select using (
  is_admin() or exists (select 1 from courses c where c.id = course_id and c.published = true)
);
create policy "admin writes modules" on modules for all using (is_admin()) with check (is_admin());

alter table lessons enable row level security;
create policy "read lessons of visible courses" on lessons for select using (
  is_admin() or exists (
    select 1 from modules m join courses c on c.id = m.course_id
    where m.id = module_id and c.published = true
  )
);
create policy "admin writes lessons" on lessons for all using (is_admin()) with check (is_admin());

alter table enrollments enable row level security;
create policy "own or managed enrollments" on enrollments for all using (
  owns_learner_profile(learner_profile_id) or is_admin()
) with check (
  owns_learner_profile(learner_profile_id) or is_admin()
);

alter table lesson_progress enable row level security;
create policy "own or managed lesson progress" on lesson_progress for all using (
  is_admin() or exists (
    select 1 from enrollments e where e.id = enrollment_id and owns_learner_profile(e.learner_profile_id)
  )
) with check (
  is_admin() or exists (
    select 1 from enrollments e where e.id = enrollment_id and owns_learner_profile(e.learner_profile_id)
  )
);

alter table quizzes enable row level security;
create policy "admin manage quizzes" on quizzes for all using (is_admin()) with check (is_admin());
create policy "read quizzes of visible lessons" on quizzes for select using (
  is_admin() or exists (
    select 1 from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
    where l.id = lesson_id and c.published = true
  )
);

alter table certificates enable row level security;
create policy "admin manage certificates" on certificates for all using (is_admin()) with check (is_admin());
create policy "read own certificates" on certificates for select using (
  is_admin() or exists (
    select 1 from enrollments e where e.id = enrollment_id and owns_learner_profile(e.learner_profile_id)
  )
);

-- 13. Keep enrollments.progress_percent / completed_at in sync with lesson_progress
create or replace function recalc_enrollment_progress()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_enrollment_id uuid;
  total int;
  done int;
  pct numeric;
begin
  target_enrollment_id := coalesce(new.enrollment_id, old.enrollment_id);

  select count(l.id) into total
  from enrollments e
  join courses c on c.id = e.course_id
  join modules m on m.course_id = c.id
  join lessons l on l.module_id = m.id
  where e.id = target_enrollment_id;

  select count(*) into done
  from lesson_progress lp
  where lp.enrollment_id = target_enrollment_id and lp.completed = true;

  pct := case when total = 0 then 0 else round(100.0 * done / total) end;

  update enrollments
  set progress_percent = pct,
      completed_at = case when pct >= 100 then coalesce(completed_at, now()) else null end
  where id = target_enrollment_id;

  return null;
end;
$$;

create trigger on_lesson_progress_change
  after insert or update or delete on lesson_progress
  for each row execute function recalc_enrollment_progress();

-- 14. Make yourself an admin
-- Sign up for an account in the app first, then run this (with your real email):
-- update users set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
