-- ============================================================
-- Ezamazwe Learn — dummy courses for a live-feeling catalog
-- Run this in the Supabase SQL editor after schema.sql.
-- Safe to re-run: it deletes any course with these slugs first.
-- Thumbnails are placeholder photos (Lorem Picsum). The one video
-- used is Blender Foundation's "Big Buck Bunny" (CC BY 3.0), a
-- standard freely-licensed sample clip — swap it for real footage
-- whenever you have it.
-- ============================================================

delete from courses where slug in (
  'intro-to-scratch-coding',
  'public-speaking-for-teens',
  'small-business-basics',
  'robotics-fundamentals'
);

-- 1. Intro to Scratch Coding — free, kids, beginner
with new_course as (
  insert into courses (title, slug, description, category, age_group, level, thumbnail_url, instructor_name, instructor_bio, price, published)
  values (
    'Intro to Scratch Coding',
    'intro-to-scratch-coding',
    'Learn the building blocks of programming by making your own animations and mini-games in Scratch — no experience needed.',
    'Coding',
    'kids',
    'beginner',
    'https://picsum.photos/seed/scratch-coding/800/450',
    'Thandiwe Mokoena',
    'Software developer and STEM mentor running after-school coding clubs across Limpopo.',
    0,
    true
  )
  returning id
),
new_module as (
  insert into modules (course_id, title, order_index)
  select id, 'Getting Started', 0 from new_course
  returning id
)
insert into lessons (module_id, title, order_index, video_provider_id, video_url, duration_seconds, is_preview)
select id, 'Welcome to Scratch', 0, 'direct', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 90, true from new_module
union all
select id, 'Your First Sprite', 1, null, null, null, false from new_module;

-- 2. Public Speaking for Teens — free, teens, beginner
with new_course as (
  insert into courses (title, slug, description, category, age_group, level, thumbnail_url, instructor_name, instructor_bio, price, published)
  values (
    'Public Speaking for Teens',
    'public-speaking-for-teens',
    'Build the confidence to speak up in class, at events, and in job interviews — practical exercises, not just theory.',
    'Life Skills',
    'teens',
    'beginner',
    'https://picsum.photos/seed/public-speaking/800/450',
    'Kagiso Ndlovu',
    'Debate coach and youth facilitator with a decade of workshop experience.',
    0,
    true
  )
  returning id
),
new_module as (
  insert into modules (course_id, title, order_index)
  select id, 'Finding Your Voice', 0 from new_course
  returning id
)
insert into lessons (module_id, title, order_index, video_provider_id, video_url, duration_seconds, is_preview)
select id, 'Why We Fear Public Speaking', 0, 'direct', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 90, true from new_module
union all
select id, 'Structuring a 2-Minute Talk', 1, null, null, null, false from new_module;

-- 3. Small Business Basics — paid, adult, beginner
with new_course as (
  insert into courses (title, slug, description, category, age_group, level, thumbnail_url, instructor_name, instructor_bio, price, published)
  values (
    'Small Business Basics',
    'small-business-basics',
    'A practical starting point for turning a skill or side hustle into a registered, sustainable small business.',
    'Business',
    'adult',
    'beginner',
    'https://picsum.photos/seed/small-business/800/450',
    'Palesa Dube',
    'Economic development advisor supporting township and rural entrepreneurs.',
    149.00,
    true
  )
  returning id
),
new_module as (
  insert into modules (course_id, title, order_index)
  select id, 'Laying the Foundation', 0 from new_course
  returning id
)
insert into lessons (module_id, title, order_index, video_provider_id, video_url, duration_seconds, is_preview)
select id, 'Is Your Idea a Business?', 0, 'direct', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 90, true from new_module
union all
select id, 'Registering With CIPC', 1, null, null, null, false from new_module;

-- 4. Robotics Fundamentals — paid, teens, intermediate
with new_course as (
  insert into courses (title, slug, description, category, age_group, level, thumbnail_url, instructor_name, instructor_bio, price, published)
  values (
    'Robotics Fundamentals',
    'robotics-fundamentals',
    'Hands-on robotics for learners who''ve outgrown the basics — sensors, motors, and simple autonomous behaviour.',
    'STEM',
    'teens',
    'intermediate',
    'https://picsum.photos/seed/robotics/800/450',
    'Sipho Mahlangu',
    'Robotics club lead and former IST Career Exhibition judge.',
    199.00,
    true
  )
  returning id
),
new_module as (
  insert into modules (course_id, title, order_index)
  select id, 'Sensors & Motors', 0 from new_course
  returning id
)
insert into lessons (module_id, title, order_index, video_provider_id, video_url, duration_seconds, is_preview)
select id, 'How Ultrasonic Sensors Work', 0, 'direct', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 90, true from new_module
union all
select id, 'Wiring Your First Motor', 1, null, null, null, false from new_module;
