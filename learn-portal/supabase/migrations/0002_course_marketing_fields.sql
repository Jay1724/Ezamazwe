-- ============================================================================
-- Adds Coursera-style marketing fields to courses: a "What you'll learn"
-- outcomes checklist and a short list of skill tags. Both are plain text
-- arrays edited by admins in the course editor — no new tables needed.
-- ============================================================================

alter table public.courses
  add column outcomes text[] not null default '{}',
  add column skills text[] not null default '{}';

comment on column public.courses.outcomes is 'Short "What you''ll learn" bullet points shown on the course detail page.';
comment on column public.courses.skills is 'Short skill tags shown on the course detail page (e.g. "Python", "Budgeting").';
