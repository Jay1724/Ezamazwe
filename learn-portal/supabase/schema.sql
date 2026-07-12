-- ============================================================
-- Ezamazwe Learn — schema reset
-- Run this once in the Supabase SQL editor (SQL Editor > New query)
-- ============================================================

-- 1. Drop tables from the previous portal build, if present
drop table if exists orders cascade;
drop table if exists lesson_progress cascade;
drop table if exists enrollments cascade;
drop table if exists lessons cascade;
drop table if exists modules cascade;
drop table if exists courses cascade;
drop table if exists learner_profiles cascade;
drop table if exists profiles cascade;
drop view if exists course_progress cascade;
drop function if exists is_admin() cascade;
drop function if exists owns_learner_profile(uuid) cascade;
drop function if exists has_paid_access(uuid) cascade;

-- 2. Core tables
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text not null default 'student' check (role in ('student', 'owner')),
  created_at timestamptz default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  thumbnail_url text,
  is_published boolean default false,
  price numeric default 0,
  created_at timestamptz default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  position int not null
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  position int not null,
  video_path text, -- path within the course-videos bucket
  content text,
  duration_seconds int
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique (user_id, course_id)
);

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  watch_position int default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);

-- 3. Auto-create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. Helper for RLS policies (security definer avoids recursive lookups)
create or replace function is_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

-- 5. Row Level Security
alter table profiles enable row level security;
create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

alter table courses enable row level security;
create policy "read published courses" on courses for select using (is_published = true or is_owner());
create policy "owner writes courses" on courses for all using (is_owner()) with check (is_owner());

alter table modules enable row level security;
create policy "read modules of visible courses" on modules for select using (
  is_owner() or exists (select 1 from courses c where c.id = course_id and c.is_published = true)
);
create policy "owner writes modules" on modules for all using (is_owner()) with check (is_owner());

alter table lessons enable row level security;
create policy "read lessons of visible courses" on lessons for select using (
  is_owner() or exists (
    select 1 from modules m join courses c on c.id = m.course_id
    where m.id = module_id and c.is_published = true
  )
);
create policy "owner writes lessons" on lessons for all using (is_owner()) with check (is_owner());

alter table enrollments enable row level security;
create policy "own enrollments" on enrollments for all using (auth.uid() = user_id or is_owner()) with check (auth.uid() = user_id or is_owner());

alter table lesson_progress enable row level security;
create policy "own progress" on lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Progress view: percent of lessons completed per user, per course
-- security_invoker + the auth.uid() filter keep this scoped to the caller's own
-- rows even though the view itself runs with the owning role's table privileges.
create or replace view course_progress
with (security_invoker = true) as
select
  e.user_id,
  c.id as course_id,
  count(l.id) as total_lessons,
  count(lp.completed_at) as completed_lessons,
  case when count(l.id) = 0 then 0
       else round(100.0 * count(lp.completed_at) / count(l.id))
  end as percent_complete
from enrollments e
join courses c on c.id = e.course_id
left join modules m on m.course_id = c.id
left join lessons l on l.module_id = m.id
left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = e.user_id and lp.completed_at is not null
where e.user_id = auth.uid()
group by e.user_id, c.id;

grant select on course_progress to authenticated;

-- 7. Private storage bucket for lesson videos
insert into storage.buckets (id, name, public)
values ('course-videos', 'course-videos', false)
on conflict (id) do nothing;

-- Owner can manage every file in the bucket.
drop policy if exists "owner manage course videos" on storage.objects;
create policy "owner manage course videos" on storage.objects for all using (
  bucket_id = 'course-videos' and is_owner()
) with check (
  bucket_id = 'course-videos' and is_owner()
);

-- Enrolled students can read videos stored under `${course_id}/...`.
drop policy if exists "enrolled read course videos" on storage.objects;
create policy "enrolled read course videos" on storage.objects for select using (
  bucket_id = 'course-videos' and exists (
    select 1 from enrollments e
    where e.user_id = auth.uid()
      and e.course_id::text = (storage.foldername(name))[1]
  )
);

-- 8. Make yourself the owner
-- Sign up for an account in the app first, then run this (with your real email):
-- update profiles set role = 'owner' where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
