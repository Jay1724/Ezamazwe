-- ============================================================================
-- Local dev seed data. Run after 0001_init.sql (or via `supabase db reset`,
-- which applies migrations then this file automatically).
-- Course/lesson rows have no owner FK, so this is safe to run before any
-- real users sign up. To try the admin console, sign up normally, then in
-- the SQL editor run:
--   update public.users set role = 'admin' where email = 'you@example.com';
-- ============================================================================

insert into public.courses (id, title, description, category, age_group, level, thumbnail_url, instructor_name, instructor_bio, published, price_cents, currency)
values
  ('00000000-0000-0000-0000-000000000101', 'Intro to Robotics for Kids', 'A hands-on first look at robotics — building simple circuits and programming a robot to move.', 'STEM', 'kids', 'beginner', null, 'Thandiwe Nkosi', 'Robotics Club coordinator at Ezamazwe Education, working with primary school learners across Limpopo.', true, 0, 'ZAR'),
  ('00000000-0000-0000-0000-000000000102', 'Storytelling & Creative Writing', 'Fun writing exercises and storytelling games for young learners to build confidence with words.', 'Literacy', 'kids', 'beginner', null, 'Palesa Mokoena', 'Afterschool programs facilitator focused on early literacy.', true, 0, 'ZAR'),
  ('00000000-0000-0000-0000-000000000201', 'Digital Literacy Foundations', 'Get comfortable with computers, the internet, and everyday digital tools used in school and work.', 'Technology', 'teens', 'beginner', null, 'Karabo Sithole', 'Innovation in Education program lead.', true, 0, 'ZAR'),
  ('00000000-0000-0000-0000-000000000202', 'Intro to Python Programming', 'Learn the fundamentals of Python through small, practical projects.', 'STEM', 'teens', 'intermediate', null, 'Karabo Sithole', 'Innovation in Education program lead.', true, 4900, 'ZAR'),
  ('00000000-0000-0000-0000-000000000301', 'Small Business Financial Literacy', 'Budgeting, pricing, and cash flow basics for township-based entrepreneurs.', 'Entrepreneurship', 'adult', 'beginner', null, 'Nomvula Dlamini', 'Enterprise & Employability Accelerator mentor and former economic analyst.', true, 0, 'ZAR'),
  ('00000000-0000-0000-0000-000000000302', 'Grant Writing for Grassroots Innovators', 'How to write a compelling grant application, from problem statement to budget.', 'Entrepreneurship', 'adult', 'intermediate', null, 'Nomvula Dlamini', 'Enterprise & Employability Accelerator mentor and former economic analyst.', true, 9900, 'ZAR'),
  ('00000000-0000-0000-0000-000000000303', 'Marketing Your Startup on a Budget', 'Practical, low-cost marketing strategies for early-stage township enterprises.', 'Entrepreneurship', 'adult', 'beginner', null, 'Sipho Mahlangu', 'Grassroots Innovators Incubation Hub mentor.', true, 0, 'ZAR')
on conflict (id) do nothing;

insert into public.lessons (course_id, title, order_index, video_provider, video_url, duration_seconds, resources, is_preview)
values
  ('00000000-0000-0000-0000-000000000101', 'Welcome & What We''ll Build', 1, 'stub', null, 240, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000101', 'Your First Circuit', 2, 'stub', null, 540, '[]'::jsonb, false),
  ('00000000-0000-0000-0000-000000000101', 'Programming Simple Movement', 3, 'stub', null, 620, '[]'::jsonb, false),

  ('00000000-0000-0000-0000-000000000102', 'Why Stories Matter', 1, 'stub', null, 300, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000102', 'Building a Character', 2, 'stub', null, 480, '[]'::jsonb, false),

  ('00000000-0000-0000-0000-000000000201', 'Your Computer, Explained', 1, 'stub', null, 360, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000201', 'Staying Safe Online', 2, 'stub', null, 420, '[]'::jsonb, false),

  ('00000000-0000-0000-0000-000000000202', 'Setting Up Python', 1, 'stub', null, 300, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000202', 'Variables & Data Types', 2, 'stub', null, 660, '[]'::jsonb, false),
  ('00000000-0000-0000-0000-000000000202', 'Your First Project: A Quiz Game', 3, 'stub', null, 900, '[]'::jsonb, false),

  ('00000000-0000-0000-0000-000000000301', 'Understanding Cash Flow', 1, 'stub', null, 480, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000301', 'Pricing Your Product or Service', 2, 'stub', null, 540, '[]'::jsonb, false),

  ('00000000-0000-0000-0000-000000000302', 'Anatomy of a Grant Application', 1, 'stub', null, 600, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000302', 'Writing a Strong Problem Statement', 2, 'stub', null, 540, '[]'::jsonb, false),
  ('00000000-0000-0000-0000-000000000302', 'Building Your Budget', 3, 'stub', null, 480, '[]'::jsonb, false),

  ('00000000-0000-0000-0000-000000000303', 'Marketing Basics', 1, 'stub', null, 420, '[]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000303', 'Social Media on Zero Budget', 2, 'stub', null, 500, '[]'::jsonb, false)
on conflict do nothing;
