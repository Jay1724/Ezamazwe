import { isSupabaseConfigured } from './supabaseClient';

// ============================================================================
// Demo mode: when no real Supabase project is configured (the common case
// right after cloning this repo, before .env.local is filled in), the app
// falls back to bundled mock courses/lessons instead of hitting Supabase.
// This lets `npm run dev` show a fully populated catalog and a clickable
// course → lesson-player experience with zero backend setup — useful for
// previewing "what it will look like" (design/UX review, client demos)
// before a Supabase project exists.
//
// Demo enrollment/progress is kept in localStorage only (see mockData.ts)
// and never touches Supabase. As soon as VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY are set, the app automatically switches back to
// real data — there's no separate flag to flip off.
// ============================================================================

export const isDemoMode = !isSupabaseConfigured;
