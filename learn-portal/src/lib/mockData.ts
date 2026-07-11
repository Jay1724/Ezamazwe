import type { Course, Lesson } from '../types/database';

// Shell/demo content — mirrors supabase/seed.sql so the demo and a freshly
// seeded real project look the same. Ids are stable strings (not real
// UUIDs) so they're obviously demo data if they ever leak into a URL.

export const MOCK_ENROLLED_COUNTS: Record<string, number> = {
  'demo-101': 128,
  'demo-102': 64,
  'demo-201': 211,
  'demo-202': 97,
  'demo-301': 340,
  'demo-302': 52,
  'demo-303': 176,
};

export const mockCourses: Course[] = [
  {
    id: 'demo-101',
    title: 'Intro to Robotics for Kids',
    description:
      'A hands-on first look at robotics — building simple circuits and programming a robot to move.',
    category: 'STEM',
    age_group: 'kids',
    level: 'beginner',
    thumbnail_url: null,
    instructor_name: 'Thandiwe Nkosi',
    instructor_bio:
      'Robotics Club coordinator at Ezamazwe Education, working with primary school learners across Limpopo.',
    published: true,
    price_cents: 0,
    currency: 'ZAR',
    outcomes: [
      'Build a simple circuit from scratch',
      'Understand how sensors and motors work together',
      'Program a robot to move and respond to its surroundings',
    ],
    skills: ['Robotics', 'Circuits', 'Problem solving'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-102',
    title: 'Storytelling & Creative Writing',
    description: 'Fun writing exercises and storytelling games for young learners to build confidence with words.',
    category: 'Literacy',
    age_group: 'kids',
    level: 'beginner',
    thumbnail_url: null,
    instructor_name: 'Palesa Mokoena',
    instructor_bio: 'Afterschool programs facilitator focused on early literacy.',
    published: true,
    price_cents: 0,
    currency: 'ZAR',
    outcomes: ['Build a story from beginning to end', 'Create a character with a clear personality', 'Read your work aloud with confidence'],
    skills: ['Creative writing', 'Literacy', 'Confidence building'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-201',
    title: 'Digital Literacy Foundations',
    description: 'Get comfortable with computers, the internet, and everyday digital tools used in school and work.',
    category: 'Technology',
    age_group: 'teens',
    level: 'beginner',
    thumbnail_url: null,
    instructor_name: 'Karabo Sithole',
    instructor_bio: 'Innovation in Education program lead.',
    published: true,
    price_cents: 0,
    currency: 'ZAR',
    outcomes: [
      'Navigate a computer and common software confidently',
      'Search and evaluate information online',
      'Recognise and avoid common online safety risks',
    ],
    skills: ['Digital literacy', 'Online safety'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-202',
    title: 'Intro to Python Programming',
    description: 'Learn the fundamentals of Python through small, practical projects.',
    category: 'STEM',
    age_group: 'teens',
    level: 'intermediate',
    thumbnail_url: null,
    instructor_name: 'Karabo Sithole',
    instructor_bio: 'Innovation in Education program lead.',
    published: true,
    price_cents: 4900,
    currency: 'ZAR',
    outcomes: [
      'Write and run your first Python programs',
      'Work confidently with variables, loops, and functions',
      'Build a small quiz game from scratch',
    ],
    skills: ['Python', 'Programming fundamentals', 'Problem solving'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-301',
    title: 'Small Business Financial Literacy',
    description: 'Budgeting, pricing, and cash flow basics for township-based entrepreneurs.',
    category: 'Entrepreneurship',
    age_group: 'adult',
    level: 'beginner',
    thumbnail_url: null,
    instructor_name: 'Nomvula Dlamini',
    instructor_bio: 'Enterprise & Employability Accelerator mentor and former economic analyst.',
    published: true,
    price_cents: 0,
    currency: 'ZAR',
    outcomes: ['Track cash flow for a small business', 'Price a product or service with confidence', 'Build a simple monthly budget'],
    skills: ['Budgeting', 'Pricing', 'Cash flow'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-302',
    title: 'Grant Writing for Grassroots Innovators',
    description: 'How to write a compelling grant application, from problem statement to budget.',
    category: 'Entrepreneurship',
    age_group: 'adult',
    level: 'intermediate',
    thumbnail_url: null,
    instructor_name: 'Nomvula Dlamini',
    instructor_bio: 'Enterprise & Employability Accelerator mentor and former economic analyst.',
    published: true,
    price_cents: 9900,
    currency: 'ZAR',
    outcomes: ['Structure a compelling grant application', 'Write a clear, evidence-based problem statement', 'Build a realistic project budget'],
    skills: ['Grant writing', 'Budgeting', 'Fundraising'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-303',
    title: 'Marketing Your Startup on a Budget',
    description: 'Practical, low-cost marketing strategies for early-stage township enterprises.',
    category: 'Entrepreneurship',
    age_group: 'adult',
    level: 'beginner',
    thumbnail_url: null,
    instructor_name: 'Sipho Mahlangu',
    instructor_bio: 'Grassroots Innovators Incubation Hub mentor.',
    published: true,
    price_cents: 0,
    currency: 'ZAR',
    outcomes: ['Identify your target customer', 'Run a social media presence with zero budget', 'Plan a simple, low-cost marketing campaign'],
    skills: ['Marketing', 'Social media', 'Entrepreneurship'],
    created_at: new Date().toISOString(),
  },
];

function lesson(partial: Omit<Lesson, 'video_provider' | 'video_provider_id' | 'resources' | 'created_at'> & { resources?: Lesson['resources'] }): Lesson {
  return {
    video_provider: 'stub',
    video_provider_id: null,
    resources: partial.resources ?? [],
    created_at: new Date().toISOString(),
    ...partial,
  };
}

export const mockLessons: Lesson[] = [
  lesson({ id: 'demo-101-1', course_id: 'demo-101', title: "Welcome & What We'll Build", order_index: 1, video_url: null, duration_seconds: 240, is_preview: true }),
  lesson({ id: 'demo-101-2', course_id: 'demo-101', title: 'Your First Circuit', order_index: 2, video_url: null, duration_seconds: 540, is_preview: false }),
  lesson({
    id: 'demo-101-3',
    course_id: 'demo-101',
    title: 'Programming Simple Movement',
    order_index: 3,
    video_url: null,
    duration_seconds: 620,
    is_preview: false,
    resources: [{ label: 'Circuit diagram (PDF)', url: '#' }],
  }),

  lesson({ id: 'demo-102-1', course_id: 'demo-102', title: 'Why Stories Matter', order_index: 1, video_url: null, duration_seconds: 300, is_preview: true }),
  lesson({ id: 'demo-102-2', course_id: 'demo-102', title: 'Building a Character', order_index: 2, video_url: null, duration_seconds: 480, is_preview: false }),

  lesson({ id: 'demo-201-1', course_id: 'demo-201', title: 'Your Computer, Explained', order_index: 1, video_url: null, duration_seconds: 360, is_preview: true }),
  lesson({ id: 'demo-201-2', course_id: 'demo-201', title: 'Staying Safe Online', order_index: 2, video_url: null, duration_seconds: 420, is_preview: false }),

  lesson({ id: 'demo-202-1', course_id: 'demo-202', title: 'Setting Up Python', order_index: 1, video_url: null, duration_seconds: 300, is_preview: true }),
  lesson({ id: 'demo-202-2', course_id: 'demo-202', title: 'Variables & Data Types', order_index: 2, video_url: null, duration_seconds: 660, is_preview: false }),
  lesson({ id: 'demo-202-3', course_id: 'demo-202', title: 'Your First Project: A Quiz Game', order_index: 3, video_url: null, duration_seconds: 900, is_preview: false }),

  lesson({ id: 'demo-301-1', course_id: 'demo-301', title: 'Understanding Cash Flow', order_index: 1, video_url: null, duration_seconds: 480, is_preview: true }),
  lesson({ id: 'demo-301-2', course_id: 'demo-301', title: 'Pricing Your Product or Service', order_index: 2, video_url: null, duration_seconds: 540, is_preview: false }),

  lesson({ id: 'demo-302-1', course_id: 'demo-302', title: 'Anatomy of a Grant Application', order_index: 1, video_url: null, duration_seconds: 600, is_preview: true }),
  lesson({ id: 'demo-302-2', course_id: 'demo-302', title: 'Writing a Strong Problem Statement', order_index: 2, video_url: null, duration_seconds: 540, is_preview: false }),
  lesson({ id: 'demo-302-3', course_id: 'demo-302', title: 'Building Your Budget', order_index: 3, video_url: null, duration_seconds: 480, is_preview: false }),

  lesson({ id: 'demo-303-1', course_id: 'demo-303', title: 'Marketing Basics', order_index: 1, video_url: null, duration_seconds: 420, is_preview: true }),
  lesson({ id: 'demo-303-2', course_id: 'demo-303', title: 'Social Media on Zero Budget', order_index: 2, video_url: null, duration_seconds: 500, is_preview: false }),
];

export function getMockCourse(id: string): Course | undefined {
  return mockCourses.find((c) => c.id === id);
}

export function getMockLessons(courseId: string): Lesson[] {
  return mockLessons.filter((l) => l.course_id === courseId).sort((a, b) => a.order_index - b.order_index);
}

// ---------------------------------------------------------------------------
// Demo enrollment/progress — kept in localStorage only, never sent anywhere.
// ---------------------------------------------------------------------------

interface DemoLessonProgress {
  completed: boolean;
  last_watched_seconds: number;
}

interface DemoCourseState {
  enrolled: boolean;
  lessons: Record<string, DemoLessonProgress>;
}

type DemoState = Record<string, DemoCourseState>;

const STORAGE_KEY = 'ezamazwe-learn:demo-state';

function readState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoState) : {};
  } catch {
    return {};
  }
}

function writeState(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function courseState(state: DemoState, courseId: string): DemoCourseState {
  return state[courseId] ?? { enrolled: false, lessons: {} };
}

export function isDemoEnrolled(courseId: string): boolean {
  return courseState(readState(), courseId).enrolled;
}

export function enrollDemo(courseId: string) {
  const state = readState();
  state[courseId] = { ...courseState(state, courseId), enrolled: true };
  writeState(state);
}

export function getDemoLessonProgress(courseId: string, lessonId: string): DemoLessonProgress {
  return courseState(readState(), courseId).lessons[lessonId] ?? { completed: false, last_watched_seconds: 0 };
}

export function saveDemoLessonProgress(courseId: string, lessonId: string, secondsWatched: number, completed: boolean) {
  const state = readState();
  const cs = courseState(state, courseId);
  cs.lessons[lessonId] = { completed, last_watched_seconds: Math.floor(secondsWatched) };
  state[courseId] = cs;
  writeState(state);
}

export function getDemoCourseProgressPercent(courseId: string): number {
  const total = getMockLessons(courseId).length;
  if (total === 0) return 0;
  const cs = courseState(readState(), courseId);
  const completed = Object.values(cs.lessons).filter((l) => l.completed).length;
  return Math.round((completed / total) * 100);
}
