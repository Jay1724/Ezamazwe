# Ezamazwe Learn

Udemy/Coursera-style course platform for Ezamazwe Education Centre for Innovation.
React + Vite + Supabase (Postgres, Auth).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL + anon key.
3. Run `supabase/schema.sql` once in the Supabase SQL editor (Dashboard → SQL Editor → New query). It drops any previous learning-portal tables and creates the schema + RLS policies fresh.
4. `npm run dev`

## Roles

- **learner** — signs up "for myself," gets a single self-managed learner profile automatically.
- **parent** — signs up "for my child/children," manages one or more learner profiles from
  My Learners (`/learn/learners`). Enrollments and progress belong to the learner profile, not
  the parent's own account.
- **admin** — full CRUD on courses/modules/lessons. There's no self-service way to become one —
  sign up for an account in the app first, then run this in the Supabase SQL editor:

```sql
update users set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
```

## Notes

- Video hosting is a paste-a-URL model, not a Storage upload: each lesson has
  `video_provider_id` (`direct` | `youtube` | `vimeo`) and `video_url`. `direct` plays via a plain
  `<video>` tag; YouTube/Vimeo URLs are converted to embeddable iframe URLs
  (`src/lib/videoEmbed.js`). There's no signed-URL/Storage-bucket step anymore.
- `enrollments.progress_percent` and `completed_at` are maintained by a Postgres trigger
  (`recalc_enrollment_progress`) that recalculates them on every `lesson_progress` write — the
  frontend never computes progress itself, just reads the stored value.
- Lessons marked `is_preview` are playable without enrolling (or even logging in) — useful for
  letting visitors sample a course before signing up.
- `quizzes` and `certificates` tables exist in the schema for a future phase; there's no UI for
  either yet.
- There's still no payment flow — courses don't carry a price, and enrolling is always immediate.
