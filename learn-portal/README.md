# Ezamazwe Learn

Udemy/Coursera-style course platform for Ezamazwe Education Centre for Innovation.
React + Vite + Supabase (Postgres, Auth, Storage).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL + anon key.
3. Run `supabase/schema.sql` once in the Supabase SQL editor (Dashboard → SQL Editor → New query). It drops any previous learning-portal tables and creates the schema, RLS policies, the `course-videos` storage bucket, and its policies.
4. `npm run dev`

## Becoming the course owner

Only one role can create/edit courses: `owner`. There's no self-service way to become one —
sign up for an account in the app first, then run this in the Supabase SQL editor:

```sql
update profiles set role = 'owner' where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
```

## Notes

- Lesson videos are uploaded to a private `course-videos` Storage bucket. Playback URLs are
  short-lived signed URLs (2hr), generated client-side using the logged-in student's session —
  RLS on `storage.objects` is what actually enforces "must be enrolled to watch," not the frontend.
- `watch_position` writes are throttled to once per 10 seconds during playback.
- Course pricing (`courses.price`) is stored but there's no payment flow — enrolling is
  immediate regardless of price. Wire up a payment provider before charging for real courses.
