-- ============================================================================
-- Ezamazwe Learning Portal — initial schema + Row-Level Security
-- ============================================================================
-- Run this against a fresh Supabase project (SQL Editor, or `supabase db push`
-- / `supabase migration up` if you're using the Supabase CLI with this repo).
--
-- Design notes / flagged decisions (see also README.md):
--  1. `public.users` mirrors `auth.users` 1:1 via the `handle_new_user` trigger
--     below. We keep the spec's table name ("users") rather than the more
--     common Supabase convention of calling it "profiles" — functionally
--     identical, just be aware `auth.users` (Supabase-managed) and
--     `public.users` (ours) are two different tables that a trigger keeps
--     in sync at signup time.
--  2. Paid courses: `courses.price_cents` / `currency` and a new `orders`
--     table were added beyond the original spec because the client
--     confirmed paid courses are in scope. No real payment gateway is wired
--     in yet (see `payment_provider = 'mock'` throughout) — the `orders`
--     RLS policies below deliberately only allow client-side writes when
--     `payment_provider = 'mock'`. Before accepting real money, replace the
--     mock "mark as paid" client call with a server-side webhook (using the
--     Supabase service role key, which bypasses RLS) from your real gateway
--     (PayFast/Yoco are the common ZAR-friendly options; Stripe's South
--     African merchant support is limited) confirming payment before
--     flipping `orders.status` to 'paid'.
--  3. Column-level security caveat: Postgres RLS is row-level, not
--     column-level. The `lessons` SELECT policy below intentionally allows
--     anyone to read lesson metadata (including `video_url`) for any
--     *published* course, so the syllabus is browsable pre-enrollment. This
--     means `video_url` is not truly access-controlled by RLS alone today.
--     That's an acceptable MVP tradeoff ONLY because `video_url` is stubbed
--     (see `video_provider = 'stub'`). Once you wire in Mux/Cloudflare
--     Stream, do NOT store a directly-playable public URL in that column —
--     generate short-lived signed playback URLs server-side (checking
--     enrollment first) instead of relying on this table's RLS to hide it.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'learner' check (role in ('learner', 'parent', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.users is 'Mirrors auth.users; kept in sync by handle_new_user() trigger on signup.';

create table public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  parent_user_id uuid references public.users (id) on delete cascade,
  display_name text not null,
  age_group text not null check (age_group in ('kids', 'teens', 'adult')),
  avatar text,
  created_at timestamptz not null default now(),
  constraint learner_profiles_owner_xor check (
    (user_id is not null and parent_user_id is null)
    or (user_id is null and parent_user_id is not null)
  )
);

comment on table public.learner_profiles is
  'A learner profile is owned either directly (user_id, self-managed teen/adult account) '
  'or by a parent (parent_user_id, child-safety model — the child never gets their own login).';

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'general',
  age_group text not null default 'all' check (age_group in ('kids', 'teens', 'adult', 'all')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  thumbnail_url text,
  instructor_name text not null default '',
  instructor_bio text not null default '',
  published boolean not null default false,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'ZAR',
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  video_provider text not null default 'stub' check (video_provider in ('stub', 'mux', 'cloudflare_stream', 'external_url')),
  video_provider_id text,
  video_url text,
  duration_seconds integer not null default 0,
  resources jsonb not null default '[]'::jsonb,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  progress_percent numeric(5, 2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  completed_at timestamptz,
  unique (learner_profile_id, course_id)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  last_watched_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);

-- Paid-course support (added beyond original spec — see note above).
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider text not null default 'mock',
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Phase 2 — table only, no UI/policies for learner access yet.
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  issued_at timestamptz,
  certificate_url text
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index idx_learner_profiles_user_id on public.learner_profiles (user_id);
create index idx_learner_profiles_parent_user_id on public.learner_profiles (parent_user_id);
create index idx_courses_published_age_category on public.courses (published, age_group, category);
create index idx_lessons_course_order on public.lessons (course_id, order_index);
create index idx_enrollments_learner_profile on public.enrollments (learner_profile_id);
create index idx_enrollments_course on public.enrollments (course_id);
create index idx_lesson_progress_enrollment on public.lesson_progress (enrollment_id);
create index idx_orders_learner_profile on public.orders (learner_profile_id);
create index idx_orders_course on public.orders (course_id);

-- ============================================================================
-- Auth trigger: keep public.users in sync with auth.users
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'learner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Helper functions (security definer — needed so RLS policies can check
-- role/ownership without infinite-recursing back into the same RLS'd table)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_learner_profile(p_learner_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.learner_profiles lp
    where lp.id = p_learner_profile_id
      and (lp.user_id = auth.uid() or lp.parent_user_id = auth.uid())
  );
$$;

create or replace function public.has_paid_access(p_learner_profile_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select price_cents from public.courses where id = p_course_id), 0) = 0
    or exists (
      select 1 from public.orders o
      where o.learner_profile_id = p_learner_profile_id
        and o.course_id = p_course_id
        and o.status = 'paid'
    );
$$;

-- ============================================================================
-- Row-Level Security
-- ============================================================================

alter table public.users enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.orders enable row level security;
alter table public.quizzes enable row level security;
alter table public.certificates enable row level security;

-- ---- users -------------------------------------------------------------

create policy "users_select_own" on public.users
  for select using (id = auth.uid());

create policy "users_select_admin" on public.users
  for select using (public.is_admin());

create policy "users_update_own" on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- No client-side insert policy: rows are created exclusively by the
-- security-definer handle_new_user() trigger, which bypasses RLS.

-- ---- learner_profiles ----------------------------------------------------

create policy "learner_profiles_select_owner" on public.learner_profiles
  for select using (user_id = auth.uid() or parent_user_id = auth.uid());

create policy "learner_profiles_select_admin" on public.learner_profiles
  for select using (public.is_admin());

create policy "learner_profiles_insert_owner" on public.learner_profiles
  for insert with check (user_id = auth.uid() or parent_user_id = auth.uid());

create policy "learner_profiles_update_owner" on public.learner_profiles
  for update using (user_id = auth.uid() or parent_user_id = auth.uid())
  with check (user_id = auth.uid() or parent_user_id = auth.uid());

create policy "learner_profiles_delete_owner" on public.learner_profiles
  for delete using (user_id = auth.uid() or parent_user_id = auth.uid());

-- ---- courses ---------------------------------------------------------

create policy "courses_select_published" on public.courses
  for select using (published = true);

create policy "courses_select_admin" on public.courses
  for select using (public.is_admin());

create policy "courses_write_admin" on public.courses
  for all using (public.is_admin())
  with check (public.is_admin());

-- ---- lessons -----------------------------------------------------------
-- See column-level security caveat in the file header comment.

create policy "lessons_select_published_course" on public.lessons
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.published = true
    )
  );

create policy "lessons_select_admin" on public.lessons
  for select using (public.is_admin());

create policy "lessons_write_admin" on public.lessons
  for all using (public.is_admin())
  with check (public.is_admin());

-- ---- enrollments ---------------------------------------------------------

create policy "enrollments_select_owner" on public.enrollments
  for select using (public.owns_learner_profile(learner_profile_id));

create policy "enrollments_select_admin" on public.enrollments
  for select using (public.is_admin());

create policy "enrollments_insert_owner_paid" on public.enrollments
  for insert with check (
    public.owns_learner_profile(learner_profile_id)
    and public.has_paid_access(learner_profile_id, course_id)
  );

create policy "enrollments_update_owner" on public.enrollments
  for update using (public.owns_learner_profile(learner_profile_id))
  with check (public.owns_learner_profile(learner_profile_id));

-- ---- lesson_progress -----------------------------------------------------

create policy "lesson_progress_select_owner" on public.lesson_progress
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.id = lesson_progress.enrollment_id
        and public.owns_learner_profile(e.learner_profile_id)
    )
  );

create policy "lesson_progress_select_admin" on public.lesson_progress
  for select using (public.is_admin());

create policy "lesson_progress_insert_owner" on public.lesson_progress
  for insert with check (
    exists (
      select 1 from public.enrollments e
      where e.id = lesson_progress.enrollment_id
        and public.owns_learner_profile(e.learner_profile_id)
    )
  );

create policy "lesson_progress_update_owner" on public.lesson_progress
  for update using (
    exists (
      select 1 from public.enrollments e
      where e.id = lesson_progress.enrollment_id
        and public.owns_learner_profile(e.learner_profile_id)
    )
  )
  with check (
    exists (
      select 1 from public.enrollments e
      where e.id = lesson_progress.enrollment_id
        and public.owns_learner_profile(e.learner_profile_id)
    )
  );

-- ---- orders --------------------------------------------------------------
-- Client-side writes are restricted to payment_provider = 'mock'. When a
-- real gateway is wired in, its webhook should use the Supabase service
-- role key (which bypasses RLS entirely) to flip status -> 'paid', and
-- these client policies should stop allowing status transitions at all.

create policy "orders_select_owner" on public.orders
  for select using (public.owns_learner_profile(learner_profile_id));

create policy "orders_select_admin" on public.orders
  for select using (public.is_admin());

create policy "orders_insert_owner_mock" on public.orders
  for insert with check (
    public.owns_learner_profile(learner_profile_id)
    and payment_provider = 'mock'
  );

create policy "orders_update_owner_mock" on public.orders
  for update using (
    public.owns_learner_profile(learner_profile_id)
    and payment_provider = 'mock'
  )
  with check (payment_provider = 'mock');

-- ---- quizzes / certificates (phase 2) -------------------------------------

create policy "quizzes_admin_all" on public.quizzes
  for all using (public.is_admin())
  with check (public.is_admin());

create policy "certificates_select_owner" on public.certificates
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.id = certificates.enrollment_id
        and public.owns_learner_profile(e.learner_profile_id)
    )
  );

create policy "certificates_admin_all" on public.certificates
  for all using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Storage: course thumbnails + lesson resources
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true)
on conflict (id) do nothing;

create policy "course_assets_public_read" on storage.objects
  for select using (bucket_id = 'course-assets');

create policy "course_assets_admin_write" on storage.objects
  for insert with check (bucket_id = 'course-assets' and public.is_admin());

create policy "course_assets_admin_update" on storage.objects
  for update using (bucket_id = 'course-assets' and public.is_admin());

create policy "course_assets_admin_delete" on storage.objects
  for delete using (bucket_id = 'course-assets' and public.is_admin());
