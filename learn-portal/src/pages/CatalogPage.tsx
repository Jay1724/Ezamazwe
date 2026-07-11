import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Course, CourseAgeGroup, CourseLevel } from '../types/database';
import { CourseCard } from '../components/CourseCard';
import { Reveal } from '../components/Reveal';
import { PageSpinner } from '../components/PageSpinner';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { isDemoMode } from '../lib/demoMode';
import { mockCourses } from '../lib/mockData';

const AGE_GROUPS: { value: CourseAgeGroup | 'any'; label: string }[] = [
  { value: 'any', label: 'All ages' },
  { value: 'kids', label: 'Kids' },
  { value: 'teens', label: 'Teens' },
  { value: 'adult', label: 'Adult & Professional' },
];

const LEVELS: { value: CourseLevel | 'any'; label: string }[] = [
  { value: 'any', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ageGroup, setAgeGroup] = useState<CourseAgeGroup | 'any'>('any');
  const [level, setLevel] = useState<CourseLevel | 'any'>('any');
  const [category, setCategory] = useState<string>('any');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setCourses(mockCourses);
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setError(error.message);
        else setCourses((data ?? []) as Course[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category));
    return Array.from(set).sort();
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (ageGroup !== 'any' && c.age_group !== ageGroup && c.age_group !== 'all') return false;
      if (level !== 'any' && c.level !== level) return false;
      if (category !== 'any' && c.category !== category) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [courses, ageGroup, level, category, search]);

  return (
    <div>
      {isDemoMode && <DemoModeBanner />}
      <section className="catalog-hero wrap">
        <h1>Learn something new with Ezamazwe</h1>
        <p>
          Courses built by Ezamazwe Education instructors — from kids' robotics and literacy to
          professional and entrepreneurship skills for adults.
        </p>
        <div className="search-bar">
          <span className="search-bar__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search courses"
          />
        </div>
      </section>

      <section className="wrap section--tight">
        <div className="filter-bar">
          <div className="filter-group">
            {AGE_GROUPS.map((g) => (
              <button
                key={g.value}
                className={`filter-chip ${ageGroup === g.value ? 'is-active' : ''}`}
                onClick={() => setAgeGroup(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <select value={level} onChange={(e) => setLevel(e.target.value as CourseLevel | 'any')} aria-label="Filter by level">
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="any">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading && <PageSpinner />}
        {error && <div className="form-error">Couldn't load courses: {error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <h3>No courses match those filters</h3>
            <p>Try broadening your search.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="course-grid">
            {filtered.map((course, i) => (
              <Reveal key={course.id} delay={Math.min(i, 6) * 80}>
                <CourseCard course={course} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
