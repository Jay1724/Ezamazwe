# Ezamazwe Learning Portal

Udemy-style learning portal for Ezamazwe Education Centre for Innovation,
intended for `learn.ezamazwe.africa`. React 18 + Vite + TypeScript,
Supabase (Postgres/Auth/Storage) for the backend, deployed to Vercel.

This app lives in `learn-portal/` inside the main Ezamazwe repo (see
"Monorepo placement" below for why, and what changes if that's wrong).

## Flagged decisions

The brief asked several business/architecture questions to be confirmed
rather than silently decided. Here's what was confirmed, and what's still
open:

| Decision | Status | Notes |
| --- | --- | --- |
| Routing | **Confirmed: React Router** | Real URL routing (`/course/:id`, `/course/:id/lesson/:lessonId`, etc.), not client-side view switching. |
| Video hosting | **Confirmed: stub for now** | `lessons.video_provider` / `video_provider_id` / `video_url` exist and are swappable (see `src/lib/videoProvider.ts`), but no Mux/Cloudflare Stream account is wired up. The player falls back to a plain `<video>` tag. **Still open:** which vendor, when to integrate. |
| Paid courses | **Confirmed: in scope** | `courses.price_cents`/`currency` and a new `orders` table were added beyond the original data model. **Still open and important:** no real payment gateway is connected — see below. |
| Payment gateway | **Not decided — flagged** | A `MockPaymentProvider` (`src/lib/paymentProvider.ts`) always "succeeds" so the enroll → pay → unlock flow can be built and demoed. Stripe has limited direct South African merchant support; **PayFast and Yoco are the common ZAR-friendly options** and one of them (or another) needs to be chosen by the client before this goes live. |
| Does the child need their own login | **No** (this was actually already decided in the brief, not left open) | A parent authenticates once and picks "learning as [child]" via a learner-profile switcher. Implemented in `LearnerProfileContext` + the Dashboard's profile switcher. |
| Monorepo placement | **My call, flag if wrong** | This app was added as `learn-portal/` inside the existing `jay1724/ezamazwe` repo (this session only has access to that one repo) rather than a new standalone repo. Functionally this is fine for local dev; for the real `learn.ezamazwe.africa` subdomain deploy on Vercel, you'll likely want either (a) a separate Vercel project pointed at this subdirectory (`Root Directory: learn-portal`), or (b) to split it into its own repo. Either works from here without code changes. |

## Real security/architecture caveat worth reading

Postgres Row-Level Security is **row-level**, not column-level. The
`lessons` table's SELECT policy intentionally allows anyone to see full
lesson metadata (including `video_url`) for any *published* course, so
the syllabus is browsable before enrolling. That means `video_url` isn't
truly access-controlled by RLS alone today — acceptable only because it's
currently a stub/placeholder URL. **Before wiring in Mux or Cloudflare
Stream, generate short-lived signed playback URLs server-side (checking
enrollment first) instead of storing a public URL in that column.** Full
detail is in the comment header of `supabase/migrations/0001_init.sql`.

Similarly, the mock payment flow means a client *could* theoretically
write to `orders`/`enrollments` in ways a real gateway integration
wouldn't allow — the RLS policies restrict this to
`payment_provider = 'mock'` specifically so that a real integration (via
a server-side webhook using the Supabase **service role** key, which
bypasses RLS) can be swapped in without loosening security elsewhere.

## Getting started

```bash
cd learn-portal
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev                  # http://localhost:5173
```

The UI boots and renders even without a configured Supabase project (you'll
see a console warning and data fetches will fail) — this was verified by
directly loading every route. For actual data (courses, auth, enrollments)
you need a real Supabase project with the schema below applied.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/migrations/0001_init.sql` (schema +
   RLS policies + storage bucket), then optionally `supabase/seed.sql`
   (sample courses/lessons for local dev).
3. Copy your project's URL and anon key into `.env.local`.
4. To try the admin console: sign up normally through the app, then in
   the SQL Editor run:
   ```sql
   update public.users set role = 'admin' where email = 'you@example.com';
   ```
5. **Email confirmations**: by default Supabase requires email
   confirmation before a session is issued. During signup, this app
   creates the learner profile (self or child) as soon as a session
   exists — if confirmation is required, that happens after the user
   confirms and logs in (the Dashboard prompts profile setup as a
   fallback in that case). For faster local testing, you can disable
   "Confirm email" in Supabase Auth settings.

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli)
installed and a local Supabase stack running, `supabase db reset` will
apply the migration and seed file automatically.

## Project structure

```
src/
  lib/            Supabase client, payment/video provider abstractions, formatting helpers
  contexts/       AuthContext (session + role), LearnerProfileContext (parent/child switcher)
  components/     NavBar, Footer, CourseCard, ProgressBar, route guards, Reveal (scroll animation)
  pages/          Catalog, CourseDetail, LessonPlayer, Dashboard, Login, Signup
  pages/admin/    Course list (CRUD) + course/lesson editor
  styles/         global.css (ported design tokens/components), portal.css (LMS-specific components)
  types/          Hand-written types matching the SQL schema
supabase/
  migrations/0001_init.sql   Full schema + RLS policies + storage bucket
  seed.sql                   Sample courses/lessons for local dev
```

## What's implemented (MVP scope)

- Catalog with age group / level / category filters + search
- Course detail with syllabus, instructor info, free or paid enrollment
  (paid courses go through a simulated checkout — see flagged decisions)
- Lesson player: video (stub), auto-saved progress (every 5s + on
  pause/end), sidebar with completion checkmarks, next-lesson nav,
  resources tab
- Dashboard: enrolled courses with progress bars; parent accounts get a
  profile switcher across linked child profiles, plus "add another
  child"
- Auth: Supabase email/password, signup branches into "myself"
  (self-managed profile) vs "my child" (parent-managed profile, no
  child login credentials, minimal data collected — first
  name/nickname + age group only)
- Admin console (role-gated): course CRUD, thumbnail upload to Supabase
  Storage, lesson add/edit/delete/reorder (up/down, no drag-and-drop
  library — kept intentionally simple per the brief), publish/unpublish

## What's explicitly NOT implemented (phase 2, per brief)

- Quizzes and certificates — tables exist (`quizzes`, `certificates`)
  with RLS policies, but no UI
- Any comments/discussion/social features — brief says these should be
  adult-track only if ever added, and are out of scope for kids content
  by default
- Real video hosting / real payment gateway (see flagged decisions above)

## Child-safety notes for reviewers

- Child profiles (`learner_profiles` with `parent_user_id` set) store
  only a display name/nickname, age group, and optional avatar — no
  surname, school, or location fields exist in the schema.
- Children never get their own `auth.users` row or credentials; a parent
  selects "learning as [child]" from their own session via the
  `LearnerProfileContext` switcher (see the Dashboard page).
- No page in this build renders a child's name/photo/profile to any
  user other than their parent (there's no public profile page at all).
- No comments/chat exist anywhere in this build, on any track.
