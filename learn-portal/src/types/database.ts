// Hand-written types matching supabase/migrations/0001_init.sql.
// If you wire up the Supabase CLI, prefer generating these with
// `supabase gen types typescript` and replacing this file.

export type UserRole = 'learner' | 'parent' | 'admin';
export type AgeGroup = 'kids' | 'teens' | 'adult';
export type CourseAgeGroup = AgeGroup | 'all';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type VideoProvider = 'stub' | 'mux' | 'cloudflare_stream' | 'external_url';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface LearnerProfile {
  id: string;
  user_id: string | null;
  parent_user_id: string | null;
  display_name: string;
  age_group: AgeGroup;
  avatar: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  age_group: CourseAgeGroup;
  level: CourseLevel;
  thumbnail_url: string | null;
  instructor_name: string;
  instructor_bio: string;
  published: boolean;
  price_cents: number;
  currency: string;
  outcomes: string[];
  skills: string[];
  created_at: string;
}

export interface LessonResource {
  label: string;
  url: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  video_provider: VideoProvider;
  video_provider_id: string | null;
  video_url: string | null;
  duration_seconds: number;
  resources: LessonResource[];
  is_preview: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  learner_profile_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percent: number;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  completed: boolean;
  last_watched_seconds: number;
  updated_at: string;
}

export interface Order {
  id: string;
  learner_profile_id: string;
  course_id: string;
  amount_cents: number;
  currency: string;
  status: OrderStatus;
  payment_provider: string;
  provider_reference: string | null;
  created_at: string;
  paid_at: string | null;
}
